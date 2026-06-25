// MARK: - SettingsView.swift (UI Layer)
public struct SettingsView: View {
    @ObservedObject private var settings = AppSettingsModel.shared
    
    @State private var schoolName: String
    @State private var schoolAffiliation: String
    @State private var semester: String
    @State private var academicYear: String
    
    public init() {
        // โหลดค่า Master Data ปัจจุบันมาแสดงใน Local State
        _schoolName = State(initialValue: AppSettingsModel.shared.schoolName)
        _schoolAffiliation = State(initialValue: AppSettingsModel.shared.schoolAffiliation)
        _semester = State(initialValue: AppSettingsModel.shared.semester)
        _academicYear = State(initialValue: AppSettingsModel.shared.academicYear)
    }
    
    public var body: some View {
        Form {
            Section(header: Text("ข้อมูล Master Data โรงเรียน")) {
                // ใช้ TextField มาตรฐานของระบบ เพื่อรองรับ Scribble และ Dictation บน iPadOS 100%
                TextField("ชื่อโรงเรียน", text: $schoolName)
                TextField("สังกัด", text: $schoolAffiliation)
                TextField("ภาคเรียนที่", text: $semester)
                TextField("ปีการศึกษา", text: $academicYear)
            }
            
            Button(action: saveProfile) {
                Text("บันทึกค่าโปรไฟล์")
                    .frame(maxWidth: .infinity, alignment: .center)
                    .foregroundColor(.white)
                    .padding(.vertical, 4)
            }
            .listRowBackground(Color.blue)
        }
        .navigationTitle("ตั้งค่าระบบ")
    }
    
    private func saveProfile() {
        settings.schoolName = schoolName
        settings.schoolAffiliation = schoolAffiliation
        settings.semester = semester
        settings.academicYear = academicYear
        print("อัปเดต Master Data เรียบร้อย")
    }
}

