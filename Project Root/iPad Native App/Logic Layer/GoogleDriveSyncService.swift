import Foundation
import Network
import GoogleSignIn

// MARK: - NetworkStatus Enum
public enum NetworkStatus {
    case reachable
    case unreachable
}

// MARK: - SyncResult Enum
public enum SyncResult {
    case success
    case failed(Error?)
}

// MARK: - GoogleDriveSyncService
public class GoogleDriveSyncService {
    
    public static let shared = GoogleDriveSyncService()
    
    // Dispatch Queue สำหรับควบคุมการซิงก์ทีละรายการ (Serial Queue) ป้องกัน Race Condition
    private let syncQueue = DispatchQueue(label: "th.or.eef.GoogleDriveSyncService.Queue")
    private var isSyncingQueue = false
    
    // ระบบ Network Monitoring สำหรับเช็คสถานะการเชื่อมต่ออินเทอร์เน็ต
    private let pathMonitor = NWPathMonitor()
    private let monitorQueue = DispatchQueue(label: "th.or.eef.GoogleDriveSyncService.PathMonitor")
    
    private init() {
        startNetworkMonitoring()
    }
    
    /// สตาร์ทตัวตรวจวัดคุณภาพอินเทอร์เน็ต เมื่อเปลี่ยนเป็น Online จะสั่งรันคิวที่ค้างซิงก์อัติโนมัติ
    private func startNetworkMonitoring() {
        pathMonitor.pathUpdateHandler = { [weak self] path in
            guard let self = self else { return }
            let isConnected = path.status == .satisfied
            print("GoogleDriveSyncService: เครือข่ายเปลี่ยนสถานะเป็น \(isConnected ? "Online" : "Offline")")
            
            if isConnected {
                // หากกลับมาออนไลน์ ให้ล้างคิวที่ค้างอยู่ใน Background
                self.syncPendingQueue()
            }
        }
        pathMonitor.start(queue: monitorQueue)
    }
    
    // MARK: - Google Sign-In & Authentication
    
    /// ทำการล็อกอินครูผู้ใช้ผ่าน Google Sign-In SDK (กรณีเปลี่ยนบัญชี/ล็อกอินครั้งแรก)
    /// - Parameters:
    ///   - presentingViewController: UIViewController ต้นทางสำหรับการเปิดป๊อปอัพ OAuth
    ///   - completion: Callback ผลลัพธ์พร้อม Access Token
    public func authenticate(presentingViewController: UIViewController, completion: @escaping (Result<String, Error>) -> Void) {
        let driveScope = "https://www.googleapis.com/auth/drive.file"
        
        GIDSignIn.sharedInstance.signIn(
            withPresenting: presentingViewController,
            hint: nil,
            additionalScopes: [driveScope]
        ) { result, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let user = result?.user else {
                let err = NSError(domain: "GoogleDriveSyncService", code: -1, userInfo: [NSLocalizedDescriptionKey: "ไม่พบข้อมูลผู้ใช้ Google"])
                completion(.failure(err))
                return
            }
            
            // ดึง Access Token ออกมาใช้งาน
            let accessToken = user.accessToken.tokenString
            completion(.success(accessToken))
        }
    }
    
    /// ดึง Access Token ปัจจุบันออกมาใช้งาน (รองรับการ Restore Session และ Auto-refresh เงียบๆ)
    public func getAccessToken(completion: @escaping (Result<String, Error>) -> Void) {
        guard let currentUser = GIDSignIn.sharedInstance.currentUser else {
            // หากไม่มีบัญชีปัจจุบันใน Memory ให้พยายามกู้คืน Session ล่าสุด
            GIDSignIn.sharedInstance.restorePreviousSignIn { user, error in
                if let error = error {
                    completion(.failure(error))
                    return
                }
                
                guard let user = user else {
                    let err = NSError(domain: "GoogleDriveSyncService", code: -2, userInfo: [NSLocalizedDescriptionKey: "ไม่มีผู้ใช้ล็อกอินในระบบ กรุณาล็อกอินด้วยบัญชี Google"])
                    completion(.failure(err))
                    return
                }
                
                self.refreshUserTokenIfNeeded(user, completion: completion)
            }
            return
        }
        
        self.refreshUserTokenIfNeeded(currentUser, completion: completion)
    }
    
    private func refreshUserTokenIfNeeded(_ user: GIDGoogleUser, completion: @escaping (Result<String, Error>) -> Void) {
        user.refreshTokensIfNeeded { refreshedUser, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let refreshedUser = refreshedUser else {
                let err = NSError(domain: "GoogleDriveSyncService", code: -3, userInfo: [NSLocalizedDescriptionKey: "ต่ออายุ Token ล้มเหลว"])
                completion(.failure(err))
                return
            }
            
            let accessToken = refreshedUser.accessToken.tokenString
            completion(.success(accessToken))
        }
    }
    
    // MARK: - Sync Record Logic
    
    /// เมธอดหลักในการซิงก์ข้อมูลนักเรียน ขึ้น Google Drive (แบบ Offline-First)
    /// - Parameters:
    ///   - data: ข้อมูลฟอร์มนักเรียน
    ///   - networkStatus: Status เครือข่ายเรียลไทม์
    ///   - completion: Callback แจ้งผลลัพธ์ด่วนให้ UI ทราบ
    public func syncRecord(_ data: EEFFormFormData, networkStatus: NetworkStatus, completion: @escaping (SyncResult) -> Void) {
        // บันทึกแบบร่างลง SQLite ก่อนเสมอเพื่อความปลอดภัย
        LocalStorageService.shared.saveFormDraft(data)
        
        guard networkStatus == .reachable else {
            // กรณีออฟไลน์: Intercept ข้อผิดพลาด, ทำการมาร์ก "Pending Sync" ทันทีโดยไม่บล็อก UI
            print("GoogleDriveSyncService: ออฟไลน์อยู่ กำลังบันทึกสถานะรอดำเนินการ (Pending Sync) สำหรับรหัสนักเรียน: \(data.studentID)")
            LocalStorageService.shared.updateSyncStatus(forStudentID: data.studentID, isSynced: false, syncState: "Pending Sync")
            completion(.failed(NSError(domain: "GoogleDriveSyncService", code: -4, userInfo: [NSLocalizedDescriptionKey: "ตรวจพบสถานะออฟไลน์ ข้อมูลถูกบันทึกเข้าคิวรอดำเนินการซิงก์เมื่อเชื่อมต่ออินเทอร์เน็ต"])))
            return
        }
        
        // ดึง Access Token สำหรับทำ REST API
        self.getAccessToken { [weak self] tokenResult in
            guard let self = self else { return }
            
            switch tokenResult {
            case .success(let accessToken):
                // ส่งงานขึ้น Serial Queue หลัก เพื่อดำเนินการอัปโหลดใน Background
                self.syncQueue.async {
                    self.performSync(data, accessToken: accessToken) { success in
                        DispatchQueue.main.async {
                            if success {
                                completion(.success)
                            } else {
                                // ถ้าการคุยกับเซิร์ฟเวอร์ล้มเหลวชั่วคราว ให้ตีเข้าคิว Pending Sync เผื่อส่งใหม่
                                LocalStorageService.shared.updateSyncStatus(forStudentID: data.studentID, isSynced: false, syncState: "Pending Sync")
                                completion(.failed(NSError(domain: "GoogleDriveSyncService", code: -5, userInfo: [NSLocalizedDescriptionKey: "ส่งข้อมูลไม่สำเร็จ ข้อมูลถูกเข้าคิวเพื่อพยายามใหม่อัตโนมัติ"])))
                            }
                        }
                    }
                }
                
            case .failure(let error):
                // Token เสีย/ไม่มีการล็อกอิน: ตีเป็น Pending Sync เช่นกัน เมื่อครูล็อกอินใหม่ระบบจะทำงานต่อทันที
                print("GoogleDriveSyncService: ล็อกอินล้มเหลวหรือไม่มีสิทธิ์ เข้าคิวรอดำเนินการ: \(error.localizedDescription)")
                LocalStorageService.shared.updateSyncStatus(forStudentID: data.studentID, isSynced: false, syncState: "Pending Sync")
                completion(.failed(error))
            }
        }
    }
    
    // MARK: - Queue Processor
    
    /// สแกนหาแถวข้อมูลทั้งหมดใน SQLite ที่ค้างสถานะ "Pending Sync" และดำเนินการอัปโหลดต่อแบบแอนิเมชันเบื้องหลัง
    public func syncPendingQueue() {
        syncQueue.async { [weak self] in
            guard let self = self else { return }
            guard !self.isSyncingQueue else { return }
            self.isSyncingQueue = true
            defer { self.isSyncingQueue = false }
            
            // เช็คว่า ณ ตอนนี้ออนไลน์ชัวร์ไหม
            guard self.pathMonitor.currentPath.status == .satisfied else { return }
            
            let pendingRecords = LocalStorageService.shared.fetchPendingSyncDrafts()
            guard !pendingRecords.isEmpty else { return }
            
            print("GoogleDriveSyncService: พบข้อมูลตกค้างรอซิงก์ \(pendingRecords.count) รายการ เริ่มกระบวนการส่งประวัติเบื้องหลัง...")
            
            // ดึง Access Token มารอ
            let semaphore = DispatchSemaphore(value: 0)
            var optAccessToken: String?
            
            self.getAccessToken { tokenResult in
                if case .success(let token) = tokenResult {
                    optAccessToken = token
                }
                semaphore.signal()
            }
            
            _ = semaphore.wait(timeout: .now() + 15.0)
            
            guard let accessToken = optAccessToken else {
                print("GoogleDriveSyncService: กู้คืนโทเค็นเบื้องหลังล้มเหลว ข้ามการระเบิดคิวรอบนี้")
                return
            }
            
            // ลูปซิงก์ทีละตัวแบบ Synchronous บนคิว Background เพื่อป้องกันภาระเน็ตเวิร์กเกินพิกัด
            for record in pendingRecords {
                let innerSemaphore = DispatchSemaphore(value: 0)
                print("GoogleDriveSyncService: เริ่มอัปโหลดเรคคอร์ดของนักเรียน \(record.studentID) จากคิวตกค้าง...")
                
                self.performSync(record, accessToken: accessToken) { success in
                    if success {
                        print("GoogleDriveSyncService: ซิงก์ประวัติตกค้าง \(record.studentID) สำเร็จ!")
                    } else {
                        print("GoogleDriveSyncService: ซิงก์ประวัติตกค้าง \(record.studentID) ยังล้มเหลว ค้างสถานะไว้ตามเดิม")
                    }
                    innerSemaphore.signal()
                }
                
                // รอให้อัปโหลดเสร็จไม่เกิน 45 วินาทีต่อรายการ ก่อนจะเริ่มรายการถัดไป
                _ = innerSemaphore.wait(timeout: .now() + 45.0)
            }
        }
    }
    
    // MARK: - Core REST API Pipeline
    
    /// สั่งอัปโหลดเดี่ยว ทำงานแบบ Synchronous/Callback บน SyncQueue
    private func performSync(_ record: EEFFormFormData, accessToken: String, completion: @escaping (Bool) -> Void) {
        // 1. ตรวจหาหรือสร้างโฟลเดอร์ปลายทาง
        self.getOrCreateSyncFolder(accessToken: accessToken) { folderID in
            guard let folderID = folderID else {
                completion(false)
                return
            }
            
            // 2. แปลงข้อมูล Model ทั้งหมดเป็น JSON Data
            let encoder = JSONEncoder()
            encoder.outputFormatting = .prettyPrinted
            guard let jsonData = try? encoder.encode(record) else {
                print("GoogleDriveSyncService: แปลงข้อมูลนักเรียน \(record.studentID) เป็น JSON ล้มเหลว")
                completion(false)
                return
            }
            
            let filename = "\(record.studentID).json"
            
            // 3. ตรวจสอบว่าไฟล์ชื่อ [studentID].json เคยสร้างในโฟลเดอร์นี้หรือยัง ป้องกันไฟล์ขยะซ้ำซาก
            self.findFile(named: filename, parentID: folderID, accessToken: accessToken) { existingFileID in
                if let fileID = existingFileID {
                    // เคยมีไฟล์แล้ว: ใช้ PATCH เพื่อเขียนทับข้อมูลภายใน (Overwrite)
                    self.updateFileContent(fileID: fileID, contentData: jsonData, accessToken: accessToken) { success in
                        if success {
                            LocalStorageService.shared.updateSyncStatus(forStudentID: record.studentID, isSynced: true, syncState: "Synced")
                            completion(true)
                        } else {
                            completion(false)
                        }
                    }
                } else {
                    // ไม่เคยมีไฟล์: ใช้ POST แบบ multipart/related เพื่อสร้างไฟล์พร้อมเมตาดาต้า
                    self.createNewFile(named: filename, parentID: folderID, contentData: jsonData, accessToken: accessToken) { success in
                        if success {
                            LocalStorageService.shared.updateSyncStatus(forStudentID: record.studentID, isSynced: true, syncState: "Synced")
                            completion(true)
                        } else {
                            completion(false)
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - Google Drive API v3 Methods
    
    /// ตรวจหาโฟลเดอร์ปลายทางในลักษณะโครงสร้าง EEF_Student_Subsidies/01_Raw_Data_JSON/ ถ้าไม่เจอจะสร้างอัติโนมัติ
    private func getOrCreateSyncFolder(accessToken: String, completion: @escaping (String?) -> Void) {
        // ขั้นตอนที่ 1: ค้นหาโฟลเดอร์แม่ 'EEF_Student_Subsidies'
        self.findFolder(named: "EEF_Student_Subsidies", parentID: nil, accessToken: accessToken) { rootFolderID in
            if let rootID = rootFolderID {
                // ขั้นตอนที่ 2: ค้นหาโฟลเดอร์ย่อย '01_Raw_Data_JSON' ภายใต้โฟลเดอร์แม่
                self.findFolder(named: "01_Raw_Data_JSON", parentID: rootID, accessToken: accessToken) { subFolderID in
                    if let subID = subFolderID {
                        completion(subID)
                    } else {
                        // ไม่เจอโฟลเดอร์ย่อย: สร้างใหม่
                        self.createFolder(named: "01_Raw_Data_JSON", parentID: rootID, accessToken: accessToken, completion: completion)
                    }
                }
            } else {
                // ไม่พบโฟลเดอร์แม่: สร้างโฟลเดอร์แม่ก่อน แล้วต่อด้วยการสร้างโฟลเดอร์ย่อย
                self.createFolder(named: "EEF_Student_Subsidies", parentID: nil, accessToken: accessToken) { newRootID in
                    guard let newRootID = newRootID else {
                        completion(nil)
                        return
                    }
                    self.createFolder(named: "01_Raw_Data_JSON", parentID: newRootID, accessToken: accessToken, completion: completion)
                }
            }
        }
    }
    
    /// ค้นหาโฟลเดอร์ตามชื่อและไอดีโฟลเดอร์แม่
    private func findFolder(named name: String, parentID: String?, accessToken: String, completion: @escaping (String?) -> Void) {
        var query = "name = '\(name)' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
        if let parentID = parentID {
            query += " and '\(parentID)' in parents"
        }
        
        guard let encodedQuery = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "https://www.googleapis.com/drive/v3/files?q=\(encodedQuery)&fields=files(id,name)") else {
            completion(nil)
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            guard let data = data, error == nil else {
                completion(nil)
                return
            }
            
            struct ResponseData: Codable {
                struct FileItem: Codable {
                    let id: String
                }
                let files: [FileItem]
            }
            
            if let decoded = try? JSONDecoder().decode(ResponseData.self, from: data) {
                completion(decoded.files.first?.id)
            } else {
                completion(nil)
            }
        }
        task.resume()
    }
    
    /// สร้างโฟลเดอร์ใหม่
    private func createFolder(named name: String, parentID: String?, accessToken: String, completion: @escaping (String?) -> Void) {
        guard let url = URL(string: "https://www.googleapis.com/drive/v3/files") else {
            completion(nil)
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        var jsonBody: [String: Any] = [
            "name": name,
            "mimeType": "application/vnd.google-apps.folder"
        ]
        
        if let parentID = parentID {
            jsonBody["parents"] = [parentID]
        }
        
        request.httpBody = try? JSONSerialization.data(withJSONObject: jsonBody)
        
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            guard let data = data, error == nil else {
                completion(nil)
                return
            }
            
            struct CreateResponse: Codable {
                let id: String
            }
            
            if let decoded = try? JSONDecoder().decode(CreateResponse.self, from: data) {
                completion(decoded.id)
            } else {
                completion(nil)
            }
        }
        task.resume()
    }
    
    /// ค้นหาไฟล์ในโฟลเดอร์เฉพาะเจาะจง
    private func findFile(named name: String, parentID: String, accessToken: String, completion: @escaping (String?) -> Void) {
        let query = "name = '\(name)' and '\(parentID)' in parents and trashed = false"
        guard let encodedQuery = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "https://www.googleapis.com/drive/v3/files?q=\(encodedQuery)&fields=files(id,name)") else {
            completion(nil)
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            guard let data = data, error == nil else {
                completion(nil)
                return
            }
            
            struct FileSearchResponse: Codable {
                struct FileItem: Codable {
                    let id: String
                }
                let files: [FileItem]
            }
            
            if let decoded = try? JSONDecoder().decode(FileSearchResponse.self, from: data) {
                completion(decoded.files.first?.id)
            } else {
                completion(nil)
            }
        }
        task.resume()
    }
    
    /// สร้างไฟล์ใหม่ขึ้น Google Drive ด้วยสถาปัตยกรรม Multipart/Related (Metadata + Media ใน 1 Request)
    private func createNewFile(named name: String, parentID: String, contentData: Data, accessToken: String, completion: @escaping (Bool) -> Void) {
        guard let url = URL(string: "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart") else {
            completion(false)
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        
        let boundary = "th_or_eef_sync_boundary_\(UUID().uuidString)"
        request.setValue("multipart/related; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        // ประกอบ Body ของ Multipart
        var body = Data()
        
        // ส่วนของ Metadata
        let metadata: [String: Any] = [
            "name": name,
            "parents": [parentID],
            "mimeType": "application/json"
        ]
        
        guard let metadataData = try? JSONSerialization.data(withJSONObject: metadata) else {
            completion(false)
            return
        }
        
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Type: application/json; charset=UTF-8\r\n\r\n".data(using: .utf8)!)
        body.append(metadataData)
        body.append("\r\n".data(using: .utf8)!)
        
        // ส่วนของไฟล์ Media Content
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Type: application/json\r\n\r\n".data(using: .utf8)!)
        body.append(contentData)
        body.append("\r\n".data(using: .utf8)!)
        
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        
        request.httpBody = body
        
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("GoogleDriveSyncService [createNewFile] error: \(error.localizedDescription)")
                completion(false)
                return
            }
            
            if let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) {
                completion(true)
            } else {
                completion(false)
            }
        }
        task.resume()
    }
    
    /// เขียนทับข้อมูลลงบนไฟล์เก่าที่มีอยู่แล้ว (Patch Media)
    private func updateFileContent(fileID: String, contentData: Data, accessToken: String, completion: @escaping (Bool) -> Void) {
        guard let url = URL(string: "https://www.googleapis.com/upload/drive/v3/files/\(fileID)?uploadType=media") else {
            completion(false)
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = contentData
        
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("GoogleDriveSyncService [updateFileContent] error: \(error.localizedDescription)")
                completion(false)
                return
            }
            
            if let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) {
                completion(true)
            } else {
                completion(false)
            }
        }
        task.resume()
    }
}
