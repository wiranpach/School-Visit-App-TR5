import SwiftUI

// MARK: - FormViewModel.swift (Logic Layer)
public class FormViewModel: ObservableObject {
    @Published public var currentPage: Int = 1
    @Published public var formData: EEFFormFormData
    public let totalPages = 5
    
    @Published public var isSaving: Bool = false
    
    public init(studentID: String = UUID().uuidString) {
        // ดึงร่างฟอร์มเดิม (ถ้ามี) หรือสร้างฟอร์มใหม่
        if let draft = LocalStorageService.shared.fetchFormDraft(byStudentID: studentID) {
            self.formData = draft
        } else {
            self.formData = EEFFormFormData(studentID: studentID, studentName: "")
        }
    }
    
    public func nextPage() {
        if currentPage < totalPages {
            withAnimation(.easeInOut) { currentPage += 1 }
        }
    }
    
    public func previousPage() {
        if currentPage > 1 {
            withAnimation(.easeInOut) { currentPage -= 1 }
        }
    }
    
    public func saveDraft() {
        isSaving = true
        let dataToSave = formData
        DispatchQueue.global(qos: .background).async {
            LocalStorageService.shared.saveFormDraft(dataToSave)
            DispatchQueue.main.async {
                self.isSaving = false
                print("บันทึกข้อมูลร่างของ \(dataToSave.studentID) สำเร็จ")
            }
        }
    }
}

