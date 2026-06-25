// MARK: - Page4InstitutionAndTravelView.swift (UI Layer)
public struct Page4InstitutionAndTravelView: View {
    @Binding public var formData: EEFFormFormData
    
    // ข้อมูล Master สำหรับ Picker
    private let instTypes = ["สถานสงเคราะห์ของรัฐบาล", "มูลนิธิ/สถานสงเคราะห์เอกชน", "วัด/ศาสนสถาน", "อื่นๆ"]
    private let stayTypes = ["ประจำไม่ไปกลับ", "ไปกลับบ้านเสาร์-อาทิตย์/ช่วงปิดภาคเรียน"]
    private let supportOptions = ["ให้เงินสด", "ให้สิ่งของ", "ให้ที่พักอาศัย", "ให้อาหาร", "ให้การเดินทาง", "ดูแลด้านการศึกษา", "ดูแลด้านสุขภาพ"]
    private let travelMethods = ["เดิน", "จักรยาน", "รถโรงเรียน", "จักรยานยนต์ส่วนตัว", "รถส่วนตัว", "เรือส่วนตัว", "จักรยานยนต์รับจ้าง", "รถโดยสารประจำทาง/รับจ้าง", "เรือโดยสารประจำทาง/รับจ้าง"]
    private let months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"]

    public init(formData: Binding<EEFFormFormData>) {
        self._formData = formData
    }
    
    public var body: some View {
        Form {
            // 4. ข้อมูลทั่วไปของสถาบัน
            Section(header: Text("4. ข้อมูลทั่วไปของสถาบัน")) {
                Toggle("นักเรียนอาศัยอยู่ในครัวเรือนสถาบัน", isOn: $formData.isInstitutionHousehold)
                    .toggleStyle(SwitchToggleStyle(tint: .blue))
                
                if formData.isInstitutionHousehold {
                    Group {
                        Picker("ประเภทสถาบัน", selection: $formData.institutionType) {
                            Text("กรุณาเลือก").tag("")
                            ForEach(instTypes, id: \.self) { Text($0).tag($0) }
                        }
                        
                        TextField("ชื่อสถาบัน", text: $formData.institutionName)
                        TextField("จังหวัด", text: $formData.institutionProvince)
                        TextField("ชื่อผู้รับผิดชอบสถาบัน", text: $formData.institutionManagerName)
                        TextField("เบอร์โทรศัพท์", text: $formData.institutionPhone)
                            .keyboardType(.phonePad)
                        
                        HStack {
                            Text("อยู่กับสถาบันตั้งแต่เดือน")
                            Picker("", selection: $formData.staySinceMonth) {
                                Text("เดือน").tag("")
                                ForEach(months, id: \.self) { Text($0).tag($0) }
                            }
                            Text("ปี พ.ศ.")
                            TextField("พ.ศ.", text: $formData.staySinceYear)
                                .keyboardType(.numberPad)
                        }
                        
                        Picker("พักอาศัยในสถาบันแบบ", selection: $formData.stayType) {
                            Text("กรุณาเลือก").tag("")
                            ForEach(stayTypes, id: \.self) { Text($0).tag($0) }
                        }
                        
                        // วิธีช่วยเหลือ (เลือกได้มากกว่า 1)
                        Text("สถาบันให้ความช่วยเหลือด้วยวิธี:")
                            .font(.subheadline)
                            .padding(.top, 4)
                        ForEach(supportOptions, id: \.self) { support in
                            Toggle(support, isOn: supportBinding(for: support))
                                .toggleStyle(CheckmarkToggleStyle()) // ใช้ CheckmarkToggleStyle จากหน้า 3
                                .padding(.leading, 16)
                        }
                        
                        HStack {
                            Text("รายจ่ายเฉลี่ยดูแลนักเรียน")
                            TextField("0.00", value: $formData.yearlyExpensePerStudent, format: .number)
                                .keyboardType(.decimalPad).textFieldStyle(.roundedBorder)
                            Text("บาท/ปี")
                        }
                        HStack {
                            Text("นักเรียนในความดูแลปัจจุบัน")
                            TextField("0", value: $formData.totalStudentsInCare, format: .number)
                                .keyboardType(.numberPad).textFieldStyle(.roundedBorder)
                            Text("คน")
                        }
                        TextField("สถาบันมีที่ดิน (ระบุจำนวนไร่ งาน ตร.ว.)", text: $formData.institutionLandSize)
                        HStack {
                            Text("รายรับจากบริจาครวม")
                            TextField("0.00", value: $formData.yearlyDonationValue, format: .number)
                                .keyboardType(.decimalPad).textFieldStyle(.roundedBorder)
                            Text("บาท/ปี")
                        }
                        
                        Toggle("ต้องการรับเงินอุดหนุนจาก กสศ.", isOn: $formData.wantsEEFSubsidy)
                            .toggleStyle(SwitchToggleStyle(tint: .blue))
                    }
                }
            }
            
            // 5. การเดินทางจากที่พักอาศัยไปโรงเรียน
            Section(header: Text("5. การเดินทางจากที่พักอาศัยไปโรงเรียน")) {
                Picker("วิธีเดินทางหลัก", selection: $formData.travelMethod) {
                    Text("กรุณาเลือก").tag("")
                    ForEach(travelMethods, id: \.self) { Text($0).tag($0) }
                }
                
                HStack {
                    Text("ระยะทางไป-กลับ")
                    TextField("0.00", value: $formData.travelDistanceKM, format: .number)
                        .keyboardType(.decimalPad).textFieldStyle(.roundedBorder)
                    Text("กิโลเมตร/วัน")
                }
                
                HStack {
                    Text("ใช้เวลาไป-กลับ")
                    TextField("0.00", value: $formData.travelTimeHours, format: .number)
                        .keyboardType(.decimalPad).textFieldStyle(.roundedBorder)
                    Text("ชั่วโมง/วัน")
                }
                
                HStack {
                    Text("ค่าเดินทางไป-กลับ")
                    TextField("0.00", value: $formData.travelExpensePerMonth, format: .number)
                        .keyboardType(.decimalPad).textFieldStyle(.roundedBorder)
                    Text("บาท/เดือน")
                }
                
                HStack {
                    Text("ได้เงินมาโรงเรียน (ไม่รวมค่าเดินทาง)")
                    TextField("0.00", value: $formData.dailySchoolPocketMoney, format: .number)
                        .keyboardType(.decimalPad).textFieldStyle(.roundedBorder)
                    Text("บาท/วัน")
                }
            }
            
            // 6. ที่ตั้งที่พักอาศัยนักเรียน ในปัจจุบัน
            Section(header: Text("6. ที่ตั้งที่พักอาศัยนักเรียน ในปัจจุบัน")) {
                TextField("บ้านเลขที่", text: $formData.addressNo)
                TextField("หมู่ที่", text: $formData.addressMoo)
                TextField("ตรอก/ซอย", text: $formData.addressSoi)
                TextField("ถนน", text: $formData.addressRoad)
                TextField("ตำบล/แขวง", text: $formData.addressSubDistrict)
                TextField("อำเภอ/เขต", text: $formData.addressDistrict)
                TextField("จังหวัด", text: $formData.addressProvince)
                TextField("รหัสไปรษณีย์", text: $formData.addressPostcode)
                    .keyboardType(.numberPad)
            }
        }
    }
    
    // MARK: - Helper Function
    private func supportBinding(for support: String) -> Binding<Bool> {
        Binding(
            get: { formData.institutionSupports.contains(support) },
            set: { isSelected in
                if isSelected && !formData.institutionSupports.contains(support) {
                    formData.institutionSupports.append(support)
                } else if !isSelected {
                    formData.institutionSupports.removeAll { $0 == support }
                }
            }
        )
    }
}