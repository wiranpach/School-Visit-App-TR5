import Foundation
import SQLite // จำเป็นต้องติดตั้ง SQLite.swift ที่รองรับ SQLCipher

// MARK: - LocalStorageService
public class LocalStorageService {
    public static let shared = LocalStorageService()
    private var db: Connection?
    
    // MARK: - Database Schema
    private let draftsTable = Table("form_drafts")
    private let colStudentID = Expression<String>("studentID")
    private let colStudentName = Expression<String>("studentName") // สำหรับทำ Summary โดยไม่ต้อง Decode ก้อนใหญ่
    private let colFormData = Expression<Data>("formData") // เก็บ JSON ที่ถูกเข้ารหัสระดับไฟล์ DB แล้ว
    private let colIsSyncedWithCloud = Expression<Bool>("isSyncedWithCloud")
    private let colSyncState = Expression<String>("syncState")
    private let colUpdatedAt = Expression<Date>("updatedAt")
    
    private init() {
        setupDatabase()
    }
    
    private func setupDatabase() {
        do {
            // สร้างหรือเปิดไฟล์ DB ใน Document Directory
            let documentDirectory = try FileManager.default.url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
            let fileUrl = documentDirectory.appendingPathComponent("EEF_Secure_Local.sqlite3")
            
            db = try Connection(fileUrl.path)
            
            // ใช้ SQLCipher ในการเข้ารหัสไฟล์ Database ทั้งก้อน (Encryption-at-Rest) ป้องกัน PDPA
            // เรียกเก็บ/ดึงรหัสกุญแจรักษาความปลอดภัยจาก Keychain อัตโนมัติ ป้องกันการทำ Reverse Engineering
            guard let passphrase = KeychainHelper.shared.getDatabaseKey() else {
                print("Database setup aborted: Keychain is locked or inaccessible.")
                return
            }
            try db?.key(passphrase)
            
            // สร้างตารางหากยังไม่มี
            try db?.run(draftsTable.create(ifNotExists: true) { t in
                t.column(colStudentID, primaryKey: true)
                t.column(colStudentName)
                t.column(colFormData)
                t.column(colIsSyncedWithCloud, defaultValue: false)
                t.column(colUpdatedAt)
            })
            
            // ตรวจสอบและสร้างคอลัมน์ syncState สำหรับรองรับระบบออฟไลน์ซิงก์ (Migration)
            _ = try? db?.run("ALTER TABLE form_drafts ADD COLUMN syncState TEXT DEFAULT 'Draft'")
            
            print("Secure Local Database initialized successfully.")
        } catch {
            print("Database setup failed: \(error)")
        }
    }
    
    // MARK: - CRUD Operations
    
    /// บันทึกหรือบันทึกทับข้อมูลฟอร์ม
    public func saveFormDraft(_ data: EEFFormFormData) {
        guard let db = db else { return }
        do {
            let encoder = JSONEncoder()
            let payload = try encoder.encode(data)
            
            // Insert หรือ Replace กรณีมีรหัสซ้ำ
            let insertOrUpdate = draftsTable.insert(or: .replace,
                colStudentID <- data.studentID,
                colStudentName <- data.studentName,
                colFormData <- payload,
                colIsSyncedWithCloud <- data.isSyncedWithCloud,
                colSyncState <- data.syncState ?? "Draft",
                colUpdatedAt <- Date()
            )
            try db.run(insertOrUpdate)
        } catch {
            print("Failed to save draft for \(data.studentID): \(error)")
        }
    }
    
    /// ดึงข้อมูลนักเรียนรายคนออกมาแก้ไข
    public func fetchFormDraft(byStudentID id: String) -> EEFFormFormData? {
        guard let db = db else { return nil }
        do {
            let query = draftsTable.filter(colStudentID == id)
            if let row = try db.pluck(query) {
                let payload = row[colFormData]
                let decoder = JSONDecoder()
                var decodedData = try decoder.decode(EEFFormFormData.self, from: payload)
                // อัปเดต state ปัจจุบันจาก DB เข้าไปใน Model
                decodedData.isSyncedWithCloud = row[colIsSyncedWithCloud] 
                decodedData.syncState = try? row.get(colSyncState)
                return decodedData
            }
        } catch {
            print("Failed to fetch draft for \(id): \(error)")
        }
        return nil
    }
    
    /// ดึงรายชื่อและสถานะของนักเรียนทั้งหมดในเครื่องมาแสดงที่หน้าหลัก
    public func fetchAllDrafts() -> [EEFFormSummary] {
        guard let db = db else { return [] }
        var summaries: [EEFFormSummary] = []
        do {
            // ดึงเฉพาะคอลัมน์ที่จำเป็น ลดการกิน Memory จากการ Decode Payload ใหญ่
            let query = draftsTable.select(colStudentID, colStudentName, colIsSyncedWithCloud, colUpdatedAt)
            for row in try db.prepare(query) {
                let summary = EEFFormSummary(
                    studentID: row[colStudentID],
                    studentName: row[colStudentName],
                    isSyncedWithCloud: row[colIsSyncedWithCloud],
                    updatedAt: row[colUpdatedAt]
                )
                summaries.append(summary)
            }
        } catch {
            print("Failed to fetch all drafts: \(error)")
        }
        return summaries
    }
    
    /// อัปเดตสถานะการซิงก์โดยตรงของระเบียนนักเรียนรายบุคคล
    public func updateSyncStatus(forStudentID id: String, isSynced: Bool, syncState: String) {
        guard let db = db else { return }
        do {
            let record = draftsTable.filter(colStudentID == id)
            
            // 1. อัปเดตฟิลด์คอลัมน์ในฐานข้อมูล SQLite
            try db.run(record.update([
                colIsSyncedWithCloud <- isSynced,
                colSyncState <- syncState
            ]))
            
            // 2. อัปเดต JSON payload ภายใน colFormData ด้วยเพื่อไม่ให้ขัดแย้งกัน
            if let row = try db.pluck(record) {
                let payload = row[colFormData]
                let decoder = JSONDecoder()
                if var decodedData = try? decoder.decode(EEFFormFormData.self, from: payload) {
                    decodedData.isSyncedWithCloud = isSynced
                    decodedData.syncState = syncState
                    
                    let encoder = JSONEncoder()
                    if let updatedPayload = try? encoder.encode(decodedData) {
                        try db.run(record.update(colFormData <- updatedPayload))
                    }
                }
            }
            print("Updated sync status for \(id) in SQLite successfully.")
        } catch {
            print("Failed to update sync status for \(id) in SQLite: \(error)")
        }
    }
    
    /// ดึงรายการฟอร์มทั้งหมดที่ยังค้างซิงก์ (Pending Sync)
    public func fetchPendingSyncDrafts() -> [EEFFormFormData] {
        guard let db = db else { return [] }
        var pendingDrafts: [EEFFormFormData] = []
        do {
            let query = draftsTable.filter(colSyncState == "Pending Sync")
            for row in try db.prepare(query) {
                let payload = row[colFormData]
                let decoder = JSONDecoder()
                if var decodedData = try? decoder.decode(EEFFormFormData.self, from: payload) {
                    decodedData.isSyncedWithCloud = row[colIsSyncedWithCloud]
                    decodedData.syncState = try? row.get(colSyncState)
                    pendingDrafts.append(decodedData)
                }
            }
        } catch {
            print("Failed to fetch pending sync drafts: \(error)")
        }
        return pendingDrafts
    }
}

/// MARK: - Helper Protocols/Structs (อ้างอิงจาก Input/Output)
public struct EEFFormFormData: Codable {
    // ข้อมูลนักเรียน
    public var studentID: String
    public var studentName: String
    public var studentLastName: String = ""
    
    // สถานภาพครอบครัวและการอยู่อาศัย
    public var familyStatus: String = ""
    public var livingWith: String = ""
    
    // ข้อมูลผู้ปกครอง
    public var guardianFirstName: String = ""
    public var guardianLastName: String = ""
    public var guardianRelationship: String = ""
    public var guardianEducation: String = ""
    public var guardianOccupation: String = ""
    public var guardianPhone: String = ""
    public var guardianID: String = ""
    public var guardianNoID: Bool = false
    public var guardianHasStateWelfare: Bool = false
    
    // 3.1 ครัวเรือนมีภาระพึ่งพิง 
    public var hasDependents: Bool = false 
    public var dependentDisability: Bool = false 
    public var dependentChronicDisease: Bool = false 
    public var dependentElderly: Bool = false 
    public var dependentSingleParent: Bool = false 
    public var dependentUnemployed: Bool = false 
    
    // 3.2 การอยู่อาศัย 
    public var housingType: String = "" 
    public var rentCost: Double = 0.0 
    
    // 3.3 ลักษณะที่อยู่อาศัย (วัสดุ) 
    public var floorMaterial: String = "" 
    public var wallMaterial: String = "" 
    public var roofMaterial: String = "" 
    public var hasToilet: Bool = false 
    
    // 3.4 - 3.8 แหล่งอำนวยความสะดวก 
    public var agricultureLandSize: String = "" 
    public var drinkingWaterSource: String = "" 
    public var electricitySource: String = "" 
    public var hasVehicle: Bool = false 
    public var vehicleTypeAndAge: String = "" 
    public var householdAppliances: [String] = [] 
    
    // 4. ข้อมูลทั่วไปของสถาบัน (กรณีครัวเรือนสถาบัน)
    public var isInstitutionHousehold: Bool = false 
    public var institutionType: String = "" 
    public var institutionName: String = "" 
    public var institutionProvince: String = "" 
    public var institutionManagerName: String = "" 
    public var institutionPhone: String = "" 
    public var staySinceMonth: String = "" 
    public var staySinceYear: String = "" 
    public var stayType: String = "" 
    public var institutionSupports: [String] = [] 
    public var yearlyExpensePerStudent: Double = 0.0 
    public var totalStudentsInCare: Int = 0 
    public var institutionLandSize: String = "" 
    public var yearlyDonationValue: Double = 0.0 
    public var wantsEEFSubsidy: Bool = true 
    
    // 5. การเดินทางจากที่พักอาศัยไปโรงเรียน
    public var travelMethod: String = "" 
    public var travelDistanceKM: Double = 0.0 
    public var travelTimeHours: Double = 0.0 
    public var travelExpensePerMonth: Double = 0.0 
    public var dailySchoolPocketMoney: Double = 0.0 
    
    // 6. ที่ตั้งที่พักอาศัยนักเรียน ในปัจจุบัน
    public var addressNo: String = "" 
    public var addressMoo: String = "" 
    public var addressSoi: String = "" 
    public var addressRoad: String = "" 
    public var addressSubDistrict: String = "" 
    public var addressDistrict: String = "" 
    public var addressProvince: String = "" 
    public var addressPostcode: String = "" 
    
    // 7. ภาพถ่ายที่พักอาศัย
    public var photoTypeSource: String = "" 
    public var houseExteriorPhoto: Data? = nil 
    public var houseInteriorPhoto: Data? = nil 
    
    // 8-10. การรับรองข้อมูล (เก็บลายเซ็นเป็นไฟล์รูปโปร่งใส PNG)
    public var signatureStudent: Data? = nil 
    public var signatureGuardian: Data? = nil 
    
    public var governmentOfficialName: String = "" 
    public var governmentOfficialID: String = "" 
    public var governmentOfficialPosition: String = "" 
    public var governmentOfficialStatus: String = "" 
    public var signatureOfficial: Data? = nil 
    
    public var signatureDirector: Data? = nil 
    public var signatureTeacher: Data? = nil 
    public var interviewDate: Date = Date() 
    
    // ผูกโมเดลตารางสมาชิกและระบบคำนวณรายได้เข้ามาที่นี่
    public var eefFormModel: EEFFormModel = EEFFormModel()
    
    // สถานะการซิงก์ข้อมูลขึ้นคลาวด์
    public var isSyncedWithCloud: Bool = false
    public var syncState: String? = "Draft" // "Draft", "Pending Sync", "Synced"
    
    public init(studentID: String, studentName: String) {
        self.studentID = studentID
        self.studentName = studentName
    }
}

// MARK: - EEFFormSummary Struct Definition
public struct EEFFormSummary: Codable, Identifiable {
    public var id: String { studentID }
    public var studentID: String
    public var studentName: String
    public var isSyncedWithCloud: Bool
    public var updatedAt: Date
    
    public init(studentID: String, studentName: String, isSyncedWithCloud: Bool, updatedAt: Date) {
        self.studentID = studentID
        self.studentName = studentName
        self.isSyncedWithCloud = isSyncedWithCloud
        self.updatedAt = updatedAt
    }
}

// MARK: - KeychainHelper
public class KeychainHelper {
    public static let shared = KeychainHelper()
    private let service = "th.or.eef.securesqlite"
    private let account = "db_passphrase"
    
    private init() {}
    
    /// ดึงรหัสความลับผ่าน Keychain หรือทำการสร้างใหม่เข้ารหัสหากเป็นการเปิดแอปครั้งแรก
    public func getDatabaseKey() -> String? {
        let (key, status) = loadKey()
        if status == errSecInteractionNotAllowed {
            print("KeychainHelper: Device is locked. Access denied.")
            return nil
        }
        
        if let existingKey = key {
            return existingKey
        }
        
        let newKey = generateSecureKey()
        saveKey(newKey)
        return newKey
    }
    
    private func loadKey() -> (String?, OSStatus) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var dataTypeRef: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &dataTypeRef)
        
        if status == errSecSuccess, let data = dataTypeRef as? Data, let key = String(data: data, encoding: .utf8) {
            return (key, status)
        }
        return (nil, status)
    }
    
    private func saveKey(_ key: String) {
        guard let data = key.data(using: .utf8) else { return }
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecValueData as String: data
        ]
        
        SecItemDelete(query as CFDictionary)
        let status = SecItemAdd(query as CFDictionary, nil)
        if status != errSecSuccess {
            print("KeychainHelper: Failed to save encryption key. Status: \(status)")
        }
    }
    
    private func generateSecureKey() -> String {
        var bytes = [UInt8](repeating: 0, count: 32)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        return bytes.map { String(format: "%02hhx", $0) }.joined()
    }
}