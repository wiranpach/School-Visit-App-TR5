import SwiftUI

// MARK: - Page2HouseholdIncomeView (UI Layer)
public struct Page2HouseholdIncomeView: View {
    @Binding public var formData: EEFFormFormData
    
    public init(formData: Binding<EEFFormFormData>) {
        self._formData = formData
    }
    
    public var body: some View {
        VStack(spacing: 0) {
            // ส่วนที่ 1: Scrollable Forms
            ScrollView {
                LazyVStack(spacing: 20) {
                    // วนลูปสร้างการ์ดสมาชิกตามจำนวนที่มีใน eefFormModel
                    ForEach(0..<formData.eefFormModel.householdMembers.count, id: \.self) { index in
                        memberCard(for: index)
                    }
                }
                .padding()
            }
            .onAppear {
                syncMembersCount()
            }
            .onChange(of: formData.eefFormModel.totalMembersCount) { _ in
                syncMembersCount()
            }
            
            // ส่วนที่ 2: Sticky Footer สรุปรายได้
            VStack(spacing: 12) {
                HStack {
                    Text("รวมรายได้ครัวเรือน (รายการที่ 1-10):")
                        .font(.headline)
                    Spacer()
                    Text("\(formData.eefFormModel.totalHouseholdIncome, specifier: "%.2f") บาท")
                        .font(.title3)
                        .bold()
                        .foregroundColor(.blue)
                }
                
                HStack {
                    Text("รายได้ครัวเรือนเฉลี่ยต่อคน:")
                        .font(.subheadline)
                    Spacer()
                    Text("\(formData.eefFormModel.averageIncomePerPerson, specifier: "%.2f") บาท/คน")
                        .font(.headline)
                        .bold()
                        .foregroundColor(.green)
                }
            }
            .padding()
            .background(Color(UIColor.secondarySystemBackground))
            .overlay(
                Rectangle()
                    .frame(width: nil, height: 1, alignment: .top)
                    .foregroundColor(Color.gray.opacity(0.3)), 
                alignment: .top
            )
        }
    }
    
    // MARK: - Helper Functions
    
    /// ปรับจำนวนอ็อบเจกต์ใน Array ให้ตรงกับ totalMembersCount แบบ Real-time (สูงสุด 10 คน)
    private func syncMembersCount() {
        let targetCount = min(max(1, formData.eefFormModel.totalMembersCount), 10)
        var currentMembers = formData.eefFormModel.householdMembers
        
        if currentMembers.count < targetCount {
            let needed = targetCount - currentMembers.count
            for _ in 0..<needed {
                currentMembers.append(HouseholdMember())
            }
        } else if currentMembers.count > targetCount {
            currentMembers.removeLast(currentMembers.count - targetCount)
        }
        
        if currentMembers.count != formData.eefFormModel.householdMembers.count {
            formData.eefFormModel.householdMembers = currentMembers
        }
    }
    
    /// สร้าง Component การ์ดกรอกข้อมูลต่อ 1 บุคคล
    @ViewBuilder
    private func memberCard(for index: Int) -> some View {
        // ใช้ Custom Binding ป้องกัน Index out of bounds ระหว่างที่ UI กำลัง Render รอบใหม่
        let memberBinding = Binding<HouseholdMember>(
            get: {
                if index < formData.eefFormModel.householdMembers.count {
                    return formData.eefFormModel.householdMembers[index]
                }
                return HouseholdMember()
            },
            set: { newValue in
                if index < formData.eefFormModel.householdMembers.count {
                    formData.eefFormModel.householdMembers[index] = newValue
                }
            }
        )
        
        GroupBox(label: Text("คนที่ \(index + 1)").font(.headline).foregroundColor(.blue)) {
            VStack(alignment: .leading, spacing: 16) {
                // แถวที่ 1
                HStack {
                    TextField("ชื่อ - นามสกุล", text: memberBinding.name)
                        .textFieldStyle(.roundedBorder)
                    TextField("ความสัมพันธ์", text: memberBinding.relation)
                        .textFieldStyle(.roundedBorder)
                    TextField("อายุ", value: memberBinding.age, format: .number)
                        .keyboardType(.numberPad)
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 80)
                }
                
                // แถวที่ 2
                HStack {
                    TextField("เลขประจำตัวประชาชน", text: memberBinding.nationalID)
                        .keyboardType(.numberPad)
                        .textFieldStyle(.roundedBorder)
                    TextField("การศึกษาสูงสุด", text: memberBinding.highestEducation)
                        .textFieldStyle(.roundedBorder)
                }
                
                // แถวที่ 3: เช็กบ็อกซ์คู่
                HStack(spacing: 20) {
                    Toggle("มีความพิการทางร่างกาย/สติปัญญา", isOn: memberBinding.hasDisability)
                    Toggle("มีโรคเรื้อรัง (ยกเว้น ความดัน/เบาหวาน)", isOn: memberBinding.hasChronicDisease)
                }
                .toggleStyle(SwitchToggleStyle(tint: .blue))
                
                Divider().padding(.vertical, 4)
                
                // กลุ่มช่องกรอกรายได้
                Text("รายได้เฉลี่ยต่อเดือนแยกตามประเภท (บาท)")
                    .font(.subheadline)
                    .fontWeight(.bold)
                
                VStack(spacing: 12) {
                    incomeRow(title: "ค่าจ้าง/เงินเดือน", value: memberBinding.salary)
                    incomeRow(title: "อาชีพเกษตรกรรม (หลังหักต้นทุน)", value: memberBinding.agricultureIncome)
                    incomeRow(title: "ธุรกิจส่วนตัว (หลังหักต้นทุน)", value: memberBinding.businessIncome)
                    incomeRow(title: "สวัสดิการจากรัฐ (บำนาญ/เบี้ยผู้สูงอายุ)", value: memberBinding.stateWelfare)
                    incomeRow(title: "รายได้จากแหล่งอื่น ๆ", value: memberBinding.otherIncome)
                }
            }
            .padding(.top, 8)
        }
        .backgroundStyle(Color(UIColor.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.06), radius: 4, x: 0, y: 2)
    }
    
    /// Component ย่อยสำหรับช่องกรอกรายได้เพื่อความสะอาดของโค้ด
    @ViewBuilder
    private func incomeRow(title: String, value: Binding<Double>) -> some View {
        HStack {
            Text(title)
                .font(.callout)
            Spacer()
            TextField("0.00", value: value, format: .number)
                .keyboardType(.decimalPad)
                .textFieldStyle(.roundedBorder)
                .multilineTextAlignment(.trailing)
                .frame(width: 150)
        }
    }
}