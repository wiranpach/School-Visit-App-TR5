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
            // หมายเหตุ: ใน Production ควรใช้ Keychain ในการเก็บ Key ไม่ควร Hardcode
            try db?.key("EEF_SECURE_ENCRYPTION_KEY_2026") 
            
            // สร้างตารางหากยังไม่มี
            try db?.run(draftsTable.create(ifNotExists: true) { t in
                t.column(colStudentID, primaryKey: true)
                t.column(colStudentName)
                t.column(colFormData)
                t.column(colIsSyncedWithCloud, defaultValue: false)
                t.column(colUpdatedAt)
            })
            
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
    public var hasDependents: Bool = false // [cite: 89]
    public var dependentDisability: Bool = false // [cite: 90]
    public var dependentChronicDisease: Bool = false // [cite: 91]
    public var dependentElderly: Bool = false // [cite: 91]
    public var dependentSingleParent: Bool = false // [cite: 92]
    public var dependentUnemployed: Bool = false // [cite: 92]
    
    // 3.2 การอยู่อาศัย 
    public var housingType: String = "" // [cite: 94, 95, 96, 97]
    public var rentCost: Double = 0.0 // [cite: 96, 98]
    
    // 3.3 ลักษณะที่อยู่อาศัย (วัสดุ) 
    public var floorMaterial: String = "" // [cite: 112]
    public var wallMaterial: String = "" // [cite: 125]
    public var roofMaterial: String = "" // [cite: 141]
    public var hasToilet: Bool = false // [cite: 152]
    
    // 3.4 - 3.8 แหล่งอำนวยความสะดวก 
    public var agricultureLandSize: String = "" // [cite: 154]
    public var drinkingWaterSource: String = "" // [cite: 159]
    public var electricitySource: String = "" // [cite: 168]
    public var hasVehicle: Bool = false // [cite: 176]
    public var vehicleTypeAndAge: String = "" // [cite: 181, 188, 196, 203]
    public var householdAppliances: [String] = [] // [cite: 205, 208]
    
    // ผูกโมเดลตารางสมาชิกและระบบคำนวณรายได้เข้ามาที่นี่
    public var eefFormModel: EEFFormModel = EEFFormModel()
    
    // สถานะการซิงก์ข้อมูลขึ้นคลาวด์
    public var isSyncedWithCloud: Bool = false
    
    public init(studentID: String, studentName: String) {
        self.studentID = studentID
        self.studentName = studentName
    }
}