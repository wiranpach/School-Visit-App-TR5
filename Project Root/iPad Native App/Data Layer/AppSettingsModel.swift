import Foundation
import SwiftUI

// MARK: - AppSettingsModel
public class AppSettingsModel: ObservableObject {
    public static let shared = AppSettingsModel()
    
    // Persistent Local Storage สำหรับ Master Data
    @AppStorage("schoolName") public var schoolName: String = "" // [cite: 6]
    @AppStorage("schoolAffiliation") public var schoolAffiliation: String = "" // [cite: 7]
    @AppStorage("semester") public var semester: String = "" // [cite: 4]
    @AppStorage("academicYear") public var academicYear: String = "" // [cite: 4]
    
    private init() {}
}

