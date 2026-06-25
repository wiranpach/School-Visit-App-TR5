import SwiftUI

// MARK: - Page1StudentInfoView
public struct Page1StudentInfoView: View {
    @Binding public var formData: EEFFormFormData
    @ObservedObject private var settings = AppSettingsModel.shared
    
    // ตัวเลือกสำหรับ Picker
    private let familyStatuses = [
        "พ่อแม่อยู่ด้วยกัน", "พ่อแม่แยกกันอยู่", "พ่อแม่หย่าร้าง", "พ่อเสียชีวิต/สาบสูญ",
        "แม่เสียชีวิต/สาบสูญ", "เสียชีวิตทั้งคู่/สาบสูญ", "พ่อ/แม่ทอดทิ้ง"
    ] // [cite: 15, 16]
    
    private let livingArrangements = [
        "พ่อ/แม่", "ญาติ", "อยู่ลำพัง", "ผู้อุปการะ/นายจ้าง", "ครัวเรือนสถาบัน"
    ] // [cite: 18, 19, 20]
    
    public init(formData: Binding<EEFFormFormData>) {
        self._formData = formData
    }
    
    public var body: some View {
        Form {
            // ส่วนหัวกระดาษ: Master Data (Read-Only)
            Section(header: Text("ข้อมูลสถานศึกษา (Master Data)")) {
                HStack {
                    Text("โรงเรียน:").fontWeight(.semibold) // [cite: 6]
                    Text(settings.schoolName.isEmpty ? "-" : settings.schoolName)
                    Spacer()
                    Text("สังกัด:").fontWeight(.semibold) // [cite: 7]
                    Text(settings.schoolAffiliation.isEmpty ? "-" : settings.schoolAffiliation)
                }
                .foregroundColor(.secondary)
                
                HStack {
                    Text("ภาคเรียนที่:").fontWeight(.semibold) // [cite: 4]
                    Text(settings.semester.isEmpty ? "-" : settings.semester)
                    Spacer()
                    Text("ปีการศึกษา:").fontWeight(.semibold) // [cite: 4]
                    Text(settings.academicYear.isEmpty ? "-" : settings.academicYear)
                }
                .foregroundColor(.secondary)
            }
            
            // 1. ข้อมูลนักเรียน 
            Section(header: Text("1. ข้อมูลนักเรียน")) { // [cite: 9]
                TextField("ชื่อนักเรียน", text: $formData.studentName) // [cite: 9]
                TextField("นามสกุล", text: $formData.studentLastName) // [cite: 10]
                TextField("เลขประจำตัวประชาชน/เลขรหัส G", text: $formData.studentID) // [cite: 12]
                    .keyboardType(.numbersAndPunctuation)
            }
            
            // สถานภาพครอบครัว 
            Section(header: Text("สถานภาพครอบครัวและการอยู่อาศัย")) {
                Picker("สถานภาพครอบครัว", selection: $formData.familyStatus) { // [cite: 14]
                    Text("กรุณาเลือก").tag("")
                    ForEach(familyStatuses, id: \.self) { status in
                        Text(status).tag(status)
                    }
                } // [cite: 15, 16]
                
                Picker("นักเรียนอาศัยอยู่กับ", selection: $formData.livingWith) { // [cite: 17]
                    Text("กรุณาเลือก").tag("")
                    ForEach(livingArrangements, id: \.self) { arrangement in
                        Text(arrangement).tag(arrangement)
                    }
                } // [cite: 18, 19, 20]
            }
            
            // ข้อมูลผู้ปกครองนักเรียน 
            Section(header: Text("ข้อมูลผู้ปกครองนักเรียน")) { // [cite: 21]
                TextField("ชื่อผู้ปกครอง", text: $formData.guardianFirstName) // [cite: 21]
                TextField("นามสกุล", text: $formData.guardianLastName) // [cite: 22]
                TextField("ความสัมพันธ์กับนักเรียน", text: $formData.guardianRelationship) // [cite: 23]
                TextField("การศึกษาสูงสุด", text: $formData.guardianEducation) // [cite: 24]
                TextField("อาชีพ", text: $formData.guardianOccupation) // [cite: 25]
                TextField("เบอร์โทรศัพท์ติดต่อได้", text: $formData.guardianPhone) // [cite: 26]
                    .keyboardType(.phonePad)
                
                HStack {
                    TextField("เลขประจำตัวประชาชน", text: $formData.guardianID) // [cite: 27]
                        .keyboardType(.numberPad)
                        .disabled(formData.guardianNoID)
                    
                    Toggle("ไม่มีเลขประจำตัวประชาชน", isOn: $formData.guardianNoID) // [cite: 31]
                        .labelsHidden()
                }
                
                Toggle("ได้สวัสดิการแห่งรัฐ (ทะเบียนคนจน)", isOn: $formData.guardianHasStateWelfare) // [cite: 32]
            }
            
            // 2. จำนวนสมาชิกในครัวเรือน 
            Section(header: Text("2. จำนวนสมาชิกในครัวเรือน (รวมตัวนักเรียน)")) { // [cite: 33]
                HStack {
                    Text("รวม") // [cite: 33]
                    // เชื่อมต่อเข้ากับ Property ใน EEFFormModel โดยตรง 
                    TextField("จำนวนสมาชิก", value: $formData.eefFormModel.totalMembersCount, format: .number)
                        .keyboardType(.numberPad)
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 100)
                    Text("คน") // [cite: 35]
                }
                Text("(หากอาศัยอยู่ในครัวเรือนสถาบัน ให้ข้ามไปตอบข้อที่ 4)") // [cite: 35]
                    .font(.caption)
                    .foregroundColor(.gray)
            }
        }
    }
}