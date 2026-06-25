// MARK: - MainWizardContainer.swift (UI Layer)
public struct MainWizardContainer: View {
    @StateObject private var viewModel = FormViewModel()
    
    public var body: some View {
        VStack {
            // Step-by-Step Progress Bar
            ProgressBar(currentPage: viewModel.currentPage, totalPages: viewModel.totalPages)
                .padding()
            
            // สลับหน้าย่อยตาม State ของ ViewModel
            TabView(selection: $viewModel.currentPage) {
                Page1StudentInfoView(formData: $viewModel.formData).tag(1) // Placeholder สำหรับ View หน้า 1
                Page2HouseholdIncomeView(formData: $viewModel.formData).tag(2) // Placeholder สำหรับ View หน้า 2
                Page3HouseholdStatusView(formData: $viewModel.formData).tag(3) // Placeholder สำหรับ View หน้า 3
                Page4InstitutionAndTravelView(formData: $viewModel.formData).tag(4) // Placeholder สำหรับ View หน้า 4
                Page5MediaAndSignaturesView(formData: $viewModel.formData).tag(5) // Placeholder สำหรับ View หน้า 5
            }
            .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
            
            Divider()
            
            // แถบควบคุมปุ่มกด ถัดไป / ย้อนกลับ / บันทึกร่าง
            HStack {
                if viewModel.currentPage > 1 {
                    Button("ย้อนกลับ") { viewModel.previousPage() }
                        .buttonStyle(.bordered)
                }
                
                Spacer()
                
                Button("บันทึกร่าง") { viewModel.saveDraft() }
                    .buttonStyle(.borderedProminent)
                    .tint(.orange)
                
                Spacer()
                
                if viewModel.currentPage < viewModel.totalPages {
                    Button("ถัดไป") { viewModel.nextPage() }
                        .buttonStyle(.borderedProminent)
                } else {
                    Button("เสร็จสิ้น") { viewModel.saveDraft() }
                        .buttonStyle(.borderedProminent)
                        .tint(.green)
                }
            }
            .padding()
        }
    }
}

// Sub-component: ProgressBar 
struct ProgressBar: View {
    var currentPage: Int
    var totalPages: Int
    
    var body: some View {
        HStack {
            ForEach(1...totalPages, id: \.self) { step in
                Circle()
                    .fill(step <= currentPage ? Color.blue : Color.gray.opacity(0.3))
                    .frame(width: 30, height: 30)
                    .overlay(Text("\(step)").foregroundColor(.white).font(.caption))
                
                if step < totalPages {
                    Rectangle()
                        .fill(step < currentPage ? Color.blue : Color.gray.opacity(0.3))
                        .frame(height: 4)
                }
            }
        }
    }
}