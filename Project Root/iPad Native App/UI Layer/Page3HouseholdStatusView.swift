import SwiftUI

// MARK: - ส่วนที่ต้องนำไปเติมเพิ่มใน public struct EEFFormFormData: Codable (ไฟล์ SQLite.swift)
/*
    // 3.1 ภาระพึ่งพิง
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
*/

// MARK: - Page3HouseholdStatusView.swift (UI Layer)
public struct Page3HouseholdStatusView: View {
    @Binding public var formData: EEFFormFormData
    
    // ข้อมูล Master สำหรับ Picker
    private let housingOptions = ["อยู่บ้านตนเอง/เจ้าของบ้าน", "อยู่กับผู้อื่น/อยู่ฟรี", "อยู่บ้านเช่า (เสียค่าเช่า)", "หอพัก"]
    private let floorOptions = ["กระเบื้อง/เซรามิค", "ปาเก้/ไม้ขัดเงา", "ซีเมนต์เปลือย", "ไม้กระดาน", "ไวนิล/กระเบื้องยาง/เสื่อน้ำมัน", "ไม้ไผ่", "ดิน/ทราย", "อื่น ๆ"]
    private let wallOptions = ["ฉาบซีเมนต์", "อิฐ/ก้อนปูน/อิฐบล็อก", "สังกะสี", "ไม้กระดาน", "ไม้อัด", "สมาร์ทบอร์ด/ไฟเบอร์/ซีเมนต์บอร์ด", "ไม้ไผ่/ท่อนไม้/เศษไม้", "ดิน", "ไวนิล", "อื่น ๆ"]
    private let roofOptions = ["โลหะ (เช่น สังกะสี/เหล็ก/อะลูมิเนียม)", "กระเบื้อง/เซรามิค", "ไม้กระดาน", "ใบไม้/วัสดุธรรมชาติ", "ไวนิล/กระดาษ/แผ่นพลาสติก", "อื่น ๆ"]
    private let landOptions = ["ไม่ทำเกษตร", "ทำเกษตร มีที่ดินน้อยกว่า 1 ไร่", "ทำเกษตร มีที่ดิน 1 ถึง 5 ไร่", "ทำเกษตร มีที่ดินมากกว่า 5 ไร่"]
    private let waterOptions = ["น้ำดื่มบรรจุขวด/ตู้หยอดน้ำ", "น้ำประปา", "น้ำบ่อ/น้ำบาดาล", "น้ำฝน/น้ำประปาภูเขา/ลำธาร"]
    private let electricOptions = ["ไม่มีไฟฟ้า/ไม่มีเครื่องกำเนิดไฟฟ้าชนิดอื่น ๆ", "มีไฟฟ้า เครื่องปั่นไฟ/โซลาเซลล์", "มีไฟฟ้า ไฟต่อพ่วง/แบตเตอรี่", "มีไฟฟ้า ไฟบ้านหรือมิเตอร์"]
    private let vehicleOptions = ["รถยนต์นั่งส่วนบุคคล (เกิน 15 ปี)", "รถยนต์นั่งส่วนบุคคล (ไม่เกิน 15 ปี)", "รถปิกอัพ/รถบรรทุกเล็ก/รถตู้ (เกิน 15 ปี)", "รถปิกอัพ/รถบรรทุกเล็ก/รถตู้ (ไม่เกิน 15 ปี)", "รถไถ/รถเกี่ยวข้าว/รถประเภทเดียวกัน (เกิน 15 ปี)", "รถไถ/รถเกี่ยวข้าว/รถประเภทเดียวกัน (ไม่เกิน 15 ปี)", "รถมอเตอร์ไซต์/เรือประมงพื้นบ้าน (ขนาดเล็ก)"]
    private let appliances = ["คอมพิวเตอร์", "แอร์", "ทีวีจอแบน", "เครื่องซักผ้า", "ตู้เย็น"]

    public init(formData: Binding<EEFFormFormData>) {
        self._formData = formData
    }
    
    public var body: some View {
        Form {
            // 3.1 ครัวเรือนมีภาระพึ่งพิง
            Section(header: Text("3.1 ครัวเรือนมีภาระพึ่งพิง")) {
                Toggle("ครัวเรือนมีภาระพึ่งพิง", isOn: $formData.hasDependents)
                    .toggleStyle(SwitchToggleStyle(tint: .blue))
                
                if formData.hasDependents {
                    Group {
                        Toggle("มีความพิการทางร่างกาย/สติปัญญา", isOn: $formData.dependentDisability)
                        Toggle("มีโรคเรื้อรัง ยกเว้น ความดัน/เบาหวาน", isOn: $formData.dependentChronicDisease)
                        Toggle("ผู้สูงอายุตั้งแต่ 60 ปีขึ้นไป", isOn: $formData.dependentElderly)
                        Toggle("เป็นพ่อ/แม่เลี้ยงเดี่ยว", isOn: $formData.dependentSingleParent)
                        Toggle("มีคนอายุ 15-65 ปีที่ว่างงาน (ที่ไม่ใช่นักเรียน/นักศึกษา)", isOn: $formData.dependentUnemployed)
                    }
                    .toggleStyle(CheckmarkToggleStyle()) // ใช้สไตล์ Checkbox
                    .padding(.leading, 16)
                }
            }
            
            // 3.2 การอยู่อาศัย
            Section(header: Text("3.2 การอยู่อาศัย")) {
                Picker("ลักษณะการอยู่อาศัย", selection: $formData.housingType) {
                    Text("กรุณาเลือก").tag("")
                    ForEach(housingOptions, id: \.self) { Text($0).tag($0) }
                }
                .pickerStyle(.menu)
                
                HStack {
                    Text("เดือนละ")
                    TextField("0.00", value: $formData.rentCost, format: .number)
                        .keyboardType(.decimalPad)
                        .textFieldStyle(.roundedBorder)
                        // เปิดให้กรอกได้เฉพาะเมื่อเลือก "อยู่บ้านเช่า (เสียค่าเช่า)"
                        .disabled(formData.housingType != "อยู่บ้านเช่า (เสียค่าเช่า)")
                    Text("บาท")
                }
                .foregroundColor(formData.housingType == "อยู่บ้านเช่า (เสียค่าเช่า)" ? .primary : .secondary)
            }
            
            // 3.3 ลักษณะที่อยู่อาศัย (วัสดุ)
            Section(header: Text("3.3 ลักษณะที่อยู่อาศัย (บันทึกสิ่งที่เห็น)")) {
                Picker("วัสดุที่ใช้ทำพื้นบ้าน", selection: $formData.floorMaterial) {
                    Text("กรุณาเลือก").tag("")
                    ForEach(floorOptions, id: \.self) { Text($0).tag($0) }
                }
                Picker("วัสดุที่ใช้ทำฝาบ้าน", selection: $formData.wallMaterial) {
                    Text("กรุณาเลือก").tag("")
                    ForEach(wallOptions, id: \.self) { Text($0).tag($0) }
                }
                Picker("วัสดุที่ใช้ทำหลังคา", selection: $formData.roofMaterial) {
                    Text("กรุณาเลือก").tag("")
                    ForEach(roofOptions, id: \.self) { Text($0).tag($0) }
                }
                Toggle("มีห้องส้วมในที่อยู่อาศัย/บริเวณบ้าน", isOn: $formData.hasToilet)
                    .toggleStyle(SwitchToggleStyle(tint: .blue))
            }
            
            // 3.4 - 3.6 สิ่งอำนวยความสะดวก
            Section(header: Text("3.4 - 3.6 ที่ดินทำเกษตร แหล่งน้ำ และไฟฟ้า")) {
                Picker("ที่ดินทำการเกษตรได้ (รวมเช่า)", selection: $formData.agricultureLandSize) {
                    Text("กรุณาเลือก").tag("")
                    ForEach(landOptions, id: \.self) { Text($0).tag($0) }
                }
                Picker("แหล่งน้ำดื่ม", selection: $formData.drinkingWaterSource) {
                    Text("กรุณาเลือก").tag("")
                    ForEach(waterOptions, id: \.self) { Text($0).tag($0) }
                }
                Picker("แหล่งไฟฟ้า", selection: $formData.electricitySource) {
                    Text("กรุณาเลือก").tag("")
                    ForEach(electricOptions, id: \.self) { Text($0).tag($0) }
                }
            }
            
            // 3.7 ยานพาหนะ
            Section(header: Text("3.7 ยานพาหนะในครัวเรือน (ที่ใช้งานได้)")) {
                Toggle("มียานพาหนะในครัวเรือน", isOn: $formData.hasVehicle)
                    .toggleStyle(SwitchToggleStyle(tint: .blue))
                
                if formData.hasVehicle {
                    Picker("ประเภทยานพาหนะและอายุ", selection: $formData.vehicleTypeAndAge) {
                        Text("กรุณาเลือก").tag("")
                        ForEach(vehicleOptions, id: \.self) { Text($0).tag($0) }
                    }
                }
            }
            
            // 3.8 ของใช้ในครัวเรือน
            Section(header: Text("3.8 ของใช้ในครัวเรือน (ที่ใช้งานได้)")) {
                ForEach(appliances, id: \.self) { appliance in
                    Toggle(appliance, isOn: applianceBinding(for: appliance))
                        .toggleStyle(CheckmarkToggleStyle())
                }
            }
        }
    }
    
    // MARK: - Helper Functions
    
    /// แปลงสถานะใน Array ของ [String] ให้ใช้งานร่วมกับ Toggle (Bool) ได้
    private func applianceBinding(for appliance: String) -> Binding<Bool> {
        Binding(
            get: { formData.householdAppliances.contains(appliance) },
            set: { isSelected in
                if isSelected {
                    if !formData.householdAppliances.contains(appliance) {
                        formData.householdAppliances.append(appliance)
                    }
                } else {
                    formData.householdAppliances.removeAll { $0 == appliance }
                }
            }
        )
    }
}

// MARK: - Checkmark Toggle Style
/// ปรับแต่ง Toggle แบบดั้งเดิมของ iOS ให้มีลักษณะเป็น Checkbox สี่เหลี่ยม
public struct CheckmarkToggleStyle: ToggleStyle {
    public func makeBody(configuration: Configuration) -> some View {
        Button {
            configuration.isOn.toggle()
        } label: {
            HStack {
                Image(systemName: configuration.isOn ? "checkmark.square.fill" : "square")
                    .foregroundColor(configuration.isOn ? .blue : .gray)
                    .font(.title2)
                configuration.label
                    .foregroundColor(.primary)
                Spacer()
            }
        }
        .buttonStyle(PlainButtonStyle())
        .padding(.vertical, 4)
    }
}