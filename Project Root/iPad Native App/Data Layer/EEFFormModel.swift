// MARK: - EEFFormModel
public struct EEFFormModel: Codable {
    // Master Data 
    public let schoolName: String // [cite: 6]
    public let schoolAffiliation: String // [cite: 7]
    public let semester: String // [cite: 4]
    public let academicYear: String // [cite: 4]
    
    // 2. จำนวนสมาชิกในครัวเรือน (รวมตัวนักเรียน) [cite: 33]
    public var totalMembersCount: Int = 1 // [cite: 33]
    public var householdMembers: [HouseholdMember] = [] // บันทึกสูงสุด 10 คน [cite: 77]
    
    // Computed Properties สำหรับการคำนวณรายได้
    public var totalHouseholdIncome: Double {
        // รวมรายได้ครัวเรือน (รายการที่ 1 - 10) [cite: 86]
        return householdMembers.reduce(0) { $0 + $1.totalMonthlyIncome }
    }
    
    public var averageIncomePerPerson: Double {
        // รายได้ครัวเรือนเฉลี่ยต่อคน (รวมรายได้ครัวเรือน หารด้วยจำนวนสมาชิกทั้งหมด จากข้อ 2) [cite: 87]
        guard totalMembersCount > 0 else { return 0 }
        return totalHouseholdIncome / Double(totalMembersCount)
    }
    
    public init(membersCount: Int = 1, members: [HouseholdMember] = []) {
        // ดึงค่า Master Data อัตโนมัติจาก Pointer ป้องกันการ Hardcode
        self.schoolName = AppSettingsModel.shared.schoolName // [cite: 6]
        self.schoolAffiliation = AppSettingsModel.shared.schoolAffiliation // [cite: 7]
        self.semester = AppSettingsModel.shared.semester // [cite: 4]
        self.academicYear = AppSettingsModel.shared.academicYear // [cite: 4]
        
        self.totalMembersCount = membersCount // [cite: 33]
        self.householdMembers = members
    }
}

// MARK: - HouseholdMember Model
public struct HouseholdMember: Codable, Identifiable {
    public var id: UUID = UUID()
    public var name: String = "" // [cite: 39]
    public var relation: String = "" // [cite: 40]
    public var nationalID: String = "" // [cite: 41]
    public var highestEducation: String = "" // [cite: 42]
    public var age: Int = 0 // [cite: 43]
    public var hasDisability: Bool = false // [cite: 44]
    public var hasChronicDisease: Bool = false // [cite: 45]
    
    // รายได้เฉลี่ยต่อเดือนแยกตามประเภท (บาท)
    public var salary: Double = 0.0 // [cite: 46]
    public var agricultureIncome: Double = 0.0 // [cite: 47]
    public var businessIncome: Double = 0.0 // [cite: 48]
    public var stateWelfare: Double = 0.0 // [cite: 49]
    public var otherIncome: Double = 0.0 // [cite: 50]
    
    public var totalMonthlyIncome: Double {
        // รายได้รวมเฉลี่ยต่อเดือนของแต่ละบุคคล [cite: 52]
        return salary + agricultureIncome + businessIncome + stateWelfare + otherIncome
    }
    
    public init() {}
}