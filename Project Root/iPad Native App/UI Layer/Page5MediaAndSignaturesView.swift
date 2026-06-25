// MARK: - Page5MediaAndSignaturesView.swift (UI Layer)
public struct Page5MediaAndSignaturesView: View {
    @Binding public var formData: EEFFormFormData
    
    @State private var showingExteriorCamera = false
    @State private var showingInteriorCamera = false
    
    private let photoSources = ["คุณครูลงเยี่ยมบ้านด้วยตนเอง", "ให้นักเรียนถ่ายภาพมาให้"]
    private let officialStatuses = ["ขอรับรอง", "ไม่ขอรับรอง"]

    public init(formData: Binding<EEFFormFormData>) {
        self._formData = formData
    }
    
    public var body: some View {
        Form {
            // 7. ภาพถ่ายที่พักอาศัย
            Section(header: Text("7. ภาพถ่ายที่พักอาศัยของนักเรียนในปัจจุบัน")) {
                Picker("ภาพที่พักอาศัยได้มาจาก", selection: $formData.photoTypeSource) {
                    Text("กรุณาเลือก").tag("")
                    ForEach(photoSources, id: \.self) { Text($0).tag($0) }
                }
                .pickerStyle(.menu)
                
                // รูปที่ 1 ภายนอกที่พักอาศัย
                VStack(alignment: .leading) {
                    Text("รูปที่ 1 ภาพถ่ายนอกที่พักอาศัยนักเรียน")
                        .font(.headline)
                    Text("กรุณาถ่ายให้เห็นหลังคาและฝาผนังของที่พักอาศัยทั้งหลัง")
                        .font(.caption).foregroundColor(.gray)
                    
                    if let data = formData.houseExteriorPhoto, let uiImage = UIImage(data: data) {
                        Image(uiImage: uiImage)
                            .resizable()
                            .scaledToFit()
                            .frame(height: 200)
                            .cornerRadius(8)
                    }
                    
                    Button(action: { showingExteriorCamera = true }) {
                        Label("ถ่ายภาพภายนอกบ้าน", systemImage: "camera")
                    }
                }
                .padding(.vertical, 4)
                
                // รูปที่ 2 ภายในที่พักอาศัย
                VStack(alignment: .leading) {
                    Text("รูปที่ 2 ภาพถ่ายภายในที่พักอาศัยนักเรียน")
                        .font(.headline)
                    Text("กรุณาถ่ายให้เห็นพื้นและบริเวณภายในของที่พักอาศัย")
                        .font(.caption).foregroundColor(.gray)
                    
                    if let data = formData.houseInteriorPhoto, let uiImage = UIImage(data: data) {
                        Image(uiImage: uiImage)
                            .resizable()
                            .scaledToFit()
                            .frame(height: 200)
                            .cornerRadius(8)
                    }
                    
                    Button(action: { showingInteriorCamera = true }) {
                        Label("ถ่ายภาพภายในบ้าน", systemImage: "camera")
                    }
                }
                .padding(.vertical, 4)
            }
            
            // 8-9. การรับรองข้อมูลส่วนบุคคล
            Section(header: Text("8-9. การรับรองข้อมูลนักเรียนและผู้ปกครอง")) {
                signatureBox(title: "ลงชื่อ นักเรียน", signatureData: $formData.signatureStudent)
                signatureBox(title: "ลงชื่อ ผู้ปกครอง", signatureData: $formData.signatureGuardian)
            }
            
            // 10. การรับรองข้อมูลโดยเจ้าหน้าที่ของรัฐ
            Section(header: Text("10. การรับรองข้อมูลโดยเจ้าหน้าที่ของรัฐ และโรงเรียน")) {
                TextField("ชื่อเจ้าหน้าที่ของรัฐ", text: $formData.governmentOfficialName)
                TextField("เลขประจำตัวประชาชน", text: $formData.governmentOfficialID)
                    .keyboardType(.numberPad)
                TextField("ตำแหน่ง", text: $formData.governmentOfficialPosition)
                
                Picker("สถานะการรับรอง", selection: $formData.governmentOfficialStatus) {
                    Text("กรุณาเลือก").tag("")
                    ForEach(officialStatuses, id: \.self) { Text($0).tag($0) }
                }
                
                signatureBox(title: "ลงชื่อ เจ้าหน้าที่ของรัฐ", signatureData: $formData.signatureOfficial)
                signatureBox(title: "ลงชื่อ ผู้อำนวยการสถานศึกษา", signatureData: $formData.signatureDirector)
                signatureBox(title: "ลงชื่อ ครูผู้เยี่ยมบ้าน/สำรวจข้อมูล", signatureData: $formData.signatureTeacher)
                
                DatePicker("บันทึกข้อมูลวันที่", selection: $formData.interviewDate, displayedComponents: .date)
            }
        }
        .fullScreenCover(isPresented: $showingExteriorCamera) {
            CameraCaptureView(imageData: $formData.houseExteriorPhoto)
        }
        .fullScreenCover(isPresented: $showingInteriorCamera) {
            CameraCaptureView(imageData: $formData.houseInteriorPhoto)
        }
    }
    
    // Component สร้างกล่องลายเซ็น
    @ViewBuilder
    private func signatureBox(title: String, signatureData: Binding<Data?>) -> some View {
        VStack(alignment: .leading) {
            Text(title).font(.subheadline).fontWeight(.semibold)
            
            // PencilKit Canvas สำหรับรับลายเซ็น
            SignatureCanvasView(signatureData: signatureData)
                .frame(height: 120)
                .background(Color(UIColor.secondarySystemBackground))
                .cornerRadius(8)
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.gray.opacity(0.3), lineWidth: 1))
            
            Button("ล้างลายเซ็น") {
                signatureData.wrappedValue = nil
            }
            .font(.caption)
            .foregroundColor(.red)
        }
        .padding(.vertical, 8)
    }
}

// MARK: - Hardware Integrations

/// 1. Camera Integration พร้อมระบบบีบอัดภาพเพื่อลดขนาดไฟล์ฐานข้อมูล
public struct CameraCaptureView: UIViewControllerRepresentable {
    @Binding public var imageData: Data?
    @Environment(\.presentationMode) private var presentationMode
    
    public func makeCoordinator() -> Coordinator { Coordinator(self) }
    
    public func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        // ใน Simulator อาจจะ Crash ได้หากใช้ .camera ต้องทดสอบบน iPad จริงตาม Requirement
        if UIImagePickerController.isSourceTypeAvailable(.camera) {
            picker.sourceType = .camera
        } else {
            picker.sourceType = .photoLibrary // Fallback
        }
        picker.delegate = context.coordinator
        return picker
    }
    
    public func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}
    
    public class Coordinator: NSObject, UINavigationControllerDelegate, UIImagePickerControllerDelegate {
        let parent: CameraCaptureView
        
        init(_ parent: CameraCaptureView) { self.parent = parent }
        
        public func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
            if let uiImage = info[.originalImage] as? UIImage {
                // บีบอัดภาพ (Compress) เพื่อไม่ให้ SQLite บวม ตามข้อกำหนด
                parent.imageData = uiImage.jpegData(compressionQuality: 0.5)
            }
            parent.presentationMode.wrappedValue.dismiss()
        }
        
        public func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.presentationMode.wrappedValue.dismiss()
        }
    }
}

/// 2. PencilKit Integration สำหรับรับแรงกด Apple Pencil และส่งออกเป็น PNG โปร่งใส
public struct SignatureCanvasView: UIViewRepresentable {
    @Binding public var signatureData: Data?
    
    public func makeCoordinator() -> Coordinator { Coordinator(self) }
    
    public func makeUIView(context: Context) -> PKCanvasView {
        let canvas = PKCanvasView()
        canvas.drawingPolicy = .anyInput // รองรับทั้ง Apple Pencil และนิ้วมือในกรณีฉุกเฉิน
        canvas.tool = PKInkingTool(.pen, color: .black, width: 3)
        canvas.backgroundColor = .clear // พื้นหลังโปร่งใสตาม Requirement
        canvas.isOpaque = false
        canvas.delegate = context.coordinator
        
        // หากมีลายเซ็นเดิม (เช่นโหลดร่างกลับมา) ให้แปลงเป็นเส้น Drawing โชว์ไว้
        if let data = signatureData, let drawing = try? PKDrawing(data: data) {
            canvas.drawing = drawing
        }
        
        return canvas
    }
    
    public func updateUIView(_ uiView: PKCanvasView, context: Context) {
        if signatureData == nil {
            uiView.drawing = PKDrawing()
        }
    }
    
    public class Coordinator: NSObject, PKCanvasViewDelegate {
        let parent: SignatureCanvasView
        
        init(_ parent: SignatureCanvasView) { self.parent = parent }
        
        public func canvasViewDrawingDidChange(_ canvasView: PKCanvasView) {
            guard !canvasView.drawing.bounds.isEmpty else {
                parent.signatureData = nil
                return
            }
            // บันทึกเฉพาะข้อมูลพิกัดเวกเตอร์ PKDrawing เพื่อให้โหลดกลับมาแก้ไขและจัดเรียงลายเส้นต่อได้สมบูรณ์
            parent.signatureData = canvasView.drawing.dataRepresentation()
        }
    }
}