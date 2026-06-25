import Foundation
import UIKit
import PDFKit
import CoreGraphics
import PencilKit

// MARK: - PDFRenderService
public class PDFRenderService {
    
    public static let shared = PDFRenderService()
    
    private init() {}
    
    /// เมธอดหลักในการสร้างเอกสาร PDF (Overlay ข้อมูลลงบน Template กสศ.01)
    /// - Parameter formData: ข้อมูลฟอร์มที่กรอกเสร็จสมบูรณ์จาก SQLite
    /// - Returns: Data ของไฟล์ PDF พร้อมส่งต่อหรือพิมพ์
    public func renderPDF(from formData: EEFFormFormData) -> Data? {
        // รายชื่อไฟล์ Template เผื่อกรณีสะกดต่างกัน
        let templateNames = [
            "แบบฟอร์ม นร._กสศ. 01 แบบขอรับเงินอุดหนุนนักเรียนยากจน",
            "eef_form_template",
            "กสศ_01"
        ]
        
        var templateURL: URL? = nil
        for name in templateNames {
            if let url = Bundle.main.url(forResource: name, withExtension: "pdf") {
                templateURL = url
                break
            }
        }
        
        // ถ้าไม่พบ Template PDF ใน Bundle เลย ให้ใช้ระบบ Fallback อัติโนมัติ 
        // วาดโครงสร้างและตัวหนังสือลงบน PDF หน้าเปล่าขนาด A4 เพื่อป้องกันระบบแครช
        guard let url = templateURL, let document = CGPDFDocument(url as CFURL) else {
            print("PDFRenderService: ไม่พบไฟล์ PDF ต้นแบบกสศ.01 ใน bundle ทรัพยากร ระบบจะวาดหน้าเปล่า A4 เป็น Fallback")
            return generateFallbackPDF(from: formData)
        }
        
        let pdfData = NSMutableData()
        guard let consumer = CGDataConsumer(data: pdfData) else { return nil }
        
        let numberOfPages = document.numberOfPages
        // ขนาดมาตรฐาน A4 (กว้าง 595.27 x สูง 841.89 จุด)
        var mediaBox = CGRect(x: 0, y: 0, width: 595.27, height: 841.89)
        
        guard let writeContext = CGContext(consumer: consumer, mediaBox: &mediaBox, nil) else { return nil }
        
        for pageNum in 1...numberOfPages {
            guard let page = document.page(at: pageNum) else { continue }
            let pageRect = page.getBoxRect(.mediaBox)
            var mutablePageRect = pageRect
            
            writeContext.beginPage(mediaBox: &mutablePageRect)
            
            // 1. วาด Template PDF ดั้งเดิม (ใช้ระบบพิกัด PDF ดั้งเดิมที่จุดเริ่มอยู่มุมซ้ายล่าง)
            writeContext.saveGState()
            writeContext.drawPDFPage(page)
            writeContext.restoreGState()
            
            // 2. ปรับระบบพิกัดสำหรับ UIKit overlay (ย้ายจุดเริ่มมามุมซ้ายบนตามปกติของการจัด Layout iOS)
            writeContext.saveGState()
            writeContext.translateBy(x: 0, y: pageRect.size.height)
            writeContext.scaleBy(x: 1.0, y: -1.0)
            
            // ดัน Context เข้าสู่ระบบวาดภาพแบบ UIKit
            UIGraphicsPushContext(writeContext)
            
            // วาดข้อมูล overlay ลงในแต่ละหน้า
            drawOverlayForPage(pageNum, in: pageRect, context: writeContext, formData: formData)
            
            UIGraphicsPopContext()
            writeContext.restoreGState()
            
            writeContext.endPage()
        }
        
        writeContext.closePDF()
        return pdfData as Data
    }
    
    // MARK: - Core Page-by-Page Mapping
    
    /// ทำการวิเคราะห์หน้าและเขียนฟิลด์ข้อมูลทับพิกัดที่แม่นยำ
    private func drawOverlayForPage(_ pageNum: Int, in rect: CGRect, context: CGContext, formData: EEFFormFormData) {
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.alignment = .left
        
        // แบบตัวอักษรมาตรฐานภาษาไทยใน iOS (System Font รองรับการแสดงผลภาษาไทยอย่างสมบูรณ์แบบ)
        let textFont = UIFont.systemFont(ofSize: 10)
        let boldFont = UIFont.boldSystemFont(ofSize: 10)
        let smallFont = UIFont.systemFont(ofSize: 8)
        
        let textAttributes: [NSAttributedString.Key: Any] = [
            .font: textFont,
            .foregroundColor: UIColor.black,
            .paragraphStyle: paragraphStyle
        ]
        
        let boldAttributes: [NSAttributedString.Key: Any] = [
            .font: boldFont,
            .foregroundColor: UIColor.black,
            .paragraphStyle: paragraphStyle
        ]
        
        let smallAttributes: [NSAttributedString.Key: Any] = [
            .font: smallFont,
            .foregroundColor: UIColor.black,
            .paragraphStyle: paragraphStyle
        ]
        
        switch pageNum {
        case 1:
            // ---------------- PAGE 1: ข้อมูลโรงเรียน & ข้อมูลนักเรียน & ตารางสมาชิก 1-5 ----------------
            // ข้อมูลโรงเรียน & ปีการศึกษา
            drawText(formData.eefFormModel.schoolName, at: CGPoint(x: 190, y: 145), attributes: textAttributes)
            drawText(formData.eefFormModel.schoolAffiliation, at: CGPoint(x: 450, y: 145), attributes: textAttributes)
            drawText(formData.eefFormModel.semester, at: CGPoint(x: 310, y: 112), attributes: textAttributes)
            drawText(formData.eefFormModel.academicYear, at: CGPoint(x: 410, y: 112), attributes: textAttributes)
            
            // ข้อมูลนักเรียน
            drawText(formData.studentName, at: CGPoint(x: 110, y: 180), attributes: textAttributes)
            drawText(formData.studentLastName, at: CGPoint(x: 270, y: 180), attributes: textAttributes)
            // ระบุระดับชั้นเรียน (กสศ.01 หน้า 1)
            drawText("ประถมศึกษา", at: CGPoint(x: 470, y: 180), attributes: textAttributes)
            
            // รหัสประจำตัวประชาชนของนักเรียน (แบ่งลงกล่องตารางเว้นวรรค)
            drawDistributedID(formData.studentID, startX: 210, y: 205, spacing: 13.5, attributes: boldAttributes)
            
            // สถานภาพครอบครัว (ตรวจสอบข้อมูลและวาดเครื่องหมายติ๊กถูก)
            let famStatus = formData.familyStatus
            drawCheckmark(if: famStatus.contains("อยู่ด้วยกัน"), at: CGPoint(x: 178, y: 228))
            drawCheckmark(if: famStatus.contains("แยกกันอยู่"), at: CGPoint(x: 268, y: 228))
            drawCheckmark(if: famStatus.contains("หย่าร้าง"), at: CGPoint(x: 358, y: 228))
            drawCheckmark(if: famStatus.contains("พ่อเสียชีวิต"), at: CGPoint(x: 440, y: 228))
            drawCheckmark(if: famStatus.contains("แม่เสียชีวิต"), at: CGPoint(x: 178, y: 250))
            drawCheckmark(if: famStatus.contains("เสียชีวิตทั้งคู่"), at: CGPoint(x: 288, y: 250))
            drawCheckmark(if: famStatus.contains("ทอดทิ้ง"), at: CGPoint(x: 390, y: 250))
            
            // นักเรียนอาศัยอยู่กับใคร
            let livingWith = formData.livingWith
            drawCheckmark(if: livingWith.contains("พ่อ") || livingWith.contains("แม่"), at: CGPoint(x: 172, y: 276))
            drawCheckmark(if: livingWith.contains("ญาติ"), at: CGPoint(x: 238, y: 276))
            drawCheckmark(if: livingWith.contains("ลำพัง"), at: CGPoint(x: 290, y: 276))
            drawCheckmark(if: livingWith.contains("ผู้อุปการะ"), at: CGPoint(x: 346, y: 276))
            drawCheckmark(if: livingWith.contains("สถาบัน"), at: CGPoint(x: 442, y: 276))
            
            // ข้อมูลผู้ปกครอง
            drawText("\(formData.guardianFirstName) \(formData.guardianLastName)", at: CGPoint(x: 142, y: 306), attributes: textAttributes)
            drawText(formData.guardianRelationship, at: CGPoint(x: 452, y: 306), attributes: textAttributes)
            drawText(formData.guardianEducation, at: CGPoint(x: 610, y: 306), attributes: textAttributes)
            drawText(formData.guardianOccupation, at: CGPoint(x: 75, y: 334), attributes: textAttributes)
            drawText(formData.guardianPhone, at: CGPoint(x: 275, y: 334), attributes: textAttributes)
            drawDistributedID(formData.guardianID, startX: 500, y: 334, spacing: 13.5, attributes: boldAttributes)
            drawCheckmark(if: formData.guardianNoID, at: CGPoint(x: 665, y: 356))
            drawCheckmark(if: formData.guardianHasStateWelfare, at: CGPoint(x: 60, y: 395))
            
            // ตารางสมาชิกครอบครัว คนที่ 1 - 5 (พิกัด Y เริ่มที่ 492, แถวสูง 28 จุด)
            drawTableRows(members: formData.eefFormModel.householdMembers, startIdx: 0, endIdx: 5, startY: 492, rowHeight: 28, attributes: textAttributes)
            
        case 2:
            // ---------------- PAGE 2: ตารางสมาชิก 6-10 & สถานภาพที่อยู่อาศัย ----------------
            // ตารางสมาชิกครอบครัว คนที่ 6 - 10 (พิกัด Y เริ่มที่ 282)
            drawTableRows(members: formData.eefFormModel.householdMembers, startIdx: 5, endIdx: 10, startY: 282, rowHeight: 28, attributes: textAttributes)
            
            // ยอดรวมรายได้เฉลี่ยรายบุคคล
            drawText(String(format: "%.2f บาท", formData.eefFormModel.totalHouseholdIncome), at: CGPoint(x: 500, y: 422), attributes: boldAttributes)
            drawText(String(format: "%.2f บาท", formData.eefFormModel.averageIncomePerPerson), at: CGPoint(x: 500, y: 450), attributes: boldAttributes)
            
            // ข้อ 3 ข้อมูลสถานภาพครัวเรือน
            // 3.1 ครัวเรือนมีภาระพึ่งพิง
            drawCheckmark(if: !formData.hasDependents, at: CGPoint(x: 178, y: 518))
            drawCheckmark(if: formData.hasDependents, at: CGPoint(x: 308, y: 518))
            
            if formData.hasDependents {
                drawCheckmark(if: formData.dependentDisability, at: CGPoint(x: 190, y: 540))
                drawCheckmark(if: formData.dependentChronicDisease, at: CGPoint(x: 328, y: 540))
                drawCheckmark(if: formData.dependentElderly, at: CGPoint(x: 446, y: 540))
                drawCheckmark(if: formData.dependentSingleParent, at: CGPoint(x: 190, y: 562))
                drawCheckmark(if: formData.dependentUnemployed, at: CGPoint(x: 328, y: 562))
            }
            
            // 3.2 การอยู่อาศัย
            let housingType = formData.housingType
            drawCheckmark(if: housingType.contains("ตนเอง"), at: CGPoint(x: 178, y: 588))
            drawCheckmark(if: housingType.contains("เช่า"), at: CGPoint(x: 308, y: 588))
            if housingType.contains("เช่า") && formData.rentCost > 0 {
                drawText(String(format: "%.0f", formData.rentCost), at: CGPoint(x: 452, y: 588), attributes: textAttributes)
            }
            drawCheckmark(if: housingType.contains("ผู้อื่น") || housingType.contains("ฟรี"), at: CGPoint(x: 178, y: 610))
            drawCheckmark(if: housingType.contains("หอพัก"), at: CGPoint(x: 308, y: 610))
            
        case 3:
            // ---------------- PAGE 3: ลักษณะสิ่งแวดล้อมที่อยู่อาศัย & ข้อมูลสถาบัน ----------------
            // 3.3 ลักษณะที่อยู่อาศัย (วัสดุ)
            let floor = formData.floorMaterial
            drawCheckmark(if: floor.contains("กระเบื้อง") || floor.contains("เซรามิค"), at: CGPoint(x: 218, y: 92))
            drawCheckmark(if: floor.contains("ปาเก้") || floor.contains("ไม้ขัดเงา"), at: CGPoint(x: 358, y: 92))
            drawCheckmark(if: floor.contains("ซีเมนต์"), at: CGPoint(x: 478, y: 92))
            drawCheckmark(if: floor.contains("ไม้กระดาน"), at: CGPoint(x: 562, y: 92))
            drawCheckmark(if: floor.contains("ไวนิล") || floor.contains("เสื่อน้ำมัน"), at: CGPoint(x: 218, y: 114))
            drawCheckmark(if: floor.contains("ไม้ไผ่"), at: CGPoint(x: 358, y: 114))
            drawCheckmark(if: floor.contains("ดิน"), at: CGPoint(x: 478, y: 114))
            drawCheckmark(if: floor.contains("อื่น"), at: CGPoint(x: 562, y: 114))
            
            let wall = formData.wallMaterial
            drawCheckmark(if: wall.contains("ฉาบซีเมนต์"), at: CGPoint(x: 218, y: 136))
            drawCheckmark(if: wall.contains("อิฐ") || wall.contains("บล็อก"), at: CGPoint(x: 328, y: 136))
            drawCheckmark(if: wall.contains("สังกะสี"), at: CGPoint(x: 478, y: 136))
            drawCheckmark(if: wall.contains("ไม้กระดาน"), at: CGPoint(x: 562, y: 136))
            drawCheckmark(if: wall.contains("ไม้อัด"), at: CGPoint(x: 218, y: 158))
            drawCheckmark(if: wall.contains("สมาร์ทบอร์ด"), at: CGPoint(x: 328, y: 158))
            drawCheckmark(if: wall.contains("ไม้ไผ่") || wall.contains("เศษไม้"), at: CGPoint(x: 478, y: 158))
            drawCheckmark(if: wall.contains("ดิน") || wall.contains("อื่น"), at: CGPoint(x: 218, y: 180))
            
            let roof = formData.roofMaterial
            drawCheckmark(if: roof.contains("โลหะ") || roof.contains("สังกะสี"), at: CGPoint(x: 218, y: 202))
            drawCheckmark(if: roof.contains("กระเบื้อง"), at: CGPoint(x: 378, y: 202))
            drawCheckmark(if: roof.contains("ไม้กระดาน"), at: CGPoint(x: 498, y: 202))
            drawCheckmark(if: roof.contains("ใบไม้") || roof.contains("ธรรมชาติ"), at: CGPoint(x: 218, y: 224))
            drawCheckmark(if: roof.contains("พลาสติก") || roof.contains("กระดาษ"), at: CGPoint(x: 378, y: 224))
            drawCheckmark(if: roof.contains("อื่น"), at: CGPoint(x: 498, y: 224))
            
            drawCheckmark(if: formData.hasToilet, at: CGPoint(x: 218, y: 246))
            drawCheckmark(if: !formData.hasToilet, at: CGPoint(x: 288, y: 246))
            
            // 3.4 ที่ดินทำการเกษตร
            let hasAgri = !formData.agricultureLandSize.isEmpty && formData.agricultureLandSize != "ไม่ทำเกษตร"
            drawCheckmark(if: !hasAgri, at: CGPoint(x: 268, y: 280))
            drawCheckmark(if: hasAgri, at: CGPoint(x: 378, y: 280))
            if hasAgri {
                let size = formData.agricultureLandSize
                drawCheckmark(if: size.contains("น้อยกว่า 1"), at: CGPoint(x: 218, y: 302))
                drawCheckmark(if: size.contains("1 ถึง 5"), at: CGPoint(x: 318, y: 302))
                drawCheckmark(if: size.contains("มากกว่า 5"), at: CGPoint(x: 438, y: 302))
            }
            
            // 3.5 แหล่งน้ำดื่ม
            let water = formData.drinkingWaterSource
            drawCheckmark(if: water.contains("ขวด") || water.contains("หยอดน้ำ"), at: CGPoint(x: 120, y: 334))
            drawCheckmark(if: water.contains("ประปา") && !water.contains("ภูเขา"), at: CGPoint(x: 278, y: 334))
            drawCheckmark(if: water.contains("บ่อ") || water.contains("บาดาล"), at: CGPoint(x: 378, y: 334))
            drawCheckmark(if: water.contains("ฝน") || water.contains("ประปาภูเขา"), at: CGPoint(x: 478, y: 334))
            
            // 3.6 แหล่งไฟฟ้า
            let elec = formData.electricitySource
            drawCheckmark(if: elec.contains("ไม่มี"), at: CGPoint(x: 218, y: 366))
            drawCheckmark(if: !elec.contains("ไม่มี") && !elec.isEmpty, at: CGPoint(x: 308, y: 366))
            if !elec.contains("ไม่มี") && !elec.isEmpty {
                drawCheckmark(if: elec.contains("ปั่นไฟ") || elec.contains("โซลา"), at: CGPoint(x: 268, y: 388))
                drawCheckmark(if: elec.contains("พ่วง"), at: CGPoint(x: 388, y: 388))
                drawCheckmark(if: elec.contains("บ้าน") || elec.contains("มิเตอร์"), at: CGPoint(x: 498, y: 388))
            }
            
            // 3.7 ยานพาหนะ
            drawCheckmark(if: !formData.hasVehicle, at: CGPoint(x: 268, y: 420))
            drawCheckmark(if: formData.hasVehicle, at: CGPoint(x: 388, y: 420))
            if formData.hasVehicle {
                let vType = formData.vehicleTypeAndAge
                if vType.contains("รถยนต์นั่ง") {
                    drawCheckmark(at: CGPoint(x: 218, y: 442))
                    drawCheckmark(if: vType.contains("เกิน 15"), at: CGPoint(x: 378, y: 442))
                    drawCheckmark(if: vType.contains("ไม่เกิน 15"), at: CGPoint(x: 478, y: 442))
                }
                if vType.contains("ปิกอัพ") || vType.contains("บรรทุก") || vType.contains("รถตู") {
                    drawCheckmark(at: CGPoint(x: 218, y: 464))
                    drawCheckmark(if: vType.contains("เกิน 15"), at: CGPoint(x: 378, y: 464))
                    drawCheckmark(if: vType.contains("ไม่เกิน 15"), at: CGPoint(x: 478, y: 464))
                }
                if vType.contains("รถไถ") || vType.contains("รถเกี่ยว") {
                    drawCheckmark(at: CGPoint(x: 218, y: 486))
                    drawCheckmark(if: vType.contains("เกิน 15"), at: CGPoint(x: 378, y: 486))
                    drawCheckmark(if: vType.contains("ไม่เกิน 15"), at: CGPoint(x: 478, y: 486))
                }
                if vType.contains("มอเตอร์ไซ") || vType.contains("เรือ") {
                    drawCheckmark(at: CGPoint(x: 218, y: 508))
                }
            }
            
            // 3.8 ของใช้ในครัวเรือน
            let apps = formData.householdAppliances
            drawCheckmark(if: apps.isEmpty, at: CGPoint(x: 268, y: 530))
            drawCheckmark(if: !apps.isEmpty, at: CGPoint(x: 388, y: 530))
            if !apps.isEmpty {
                drawCheckmark(if: apps.contains("คอมพิวเตอร์"), at: CGPoint(x: 218, y: 552))
                drawCheckmark(if: apps.contains("แอร์"), at: CGPoint(x: 308, y: 552))
                drawCheckmark(if: apps.contains("ทีวี"), at: CGPoint(x: 378, y: 552))
                drawCheckmark(if: apps.contains("เครื่องซักผ้า"), at: CGPoint(x: 458, y: 552))
                drawCheckmark(if: apps.contains("ตู้เย็น"), at: CGPoint(x: 538, y: 552))
            }
            
            // ข้อ 4 ข้อมูลสถาบัน (ในกรณีเด็กหอ/นักเรียนอาศัยในครัวเรือนสถาบัน)
            if formData.isInstitutionHousehold {
                drawCheckmark(if: formData.institutionType.contains("รัฐ"), at: CGPoint(x: 180, y: 590))
                drawCheckmark(if: formData.institutionType.contains("เอกชน"), at: CGPoint(x: 100, y: 610))
                drawText(formData.institutionName, at: CGPoint(x: 150, y: 630), attributes: textAttributes)
                drawText(formData.institutionProvince, at: CGPoint(x: 450, y: 630), attributes: textAttributes)
                drawText(formData.institutionManagerName, at: CGPoint(x: 180, y: 650), attributes: textAttributes)
                drawText(formData.institutionPhone, at: CGPoint(x: 450, y: 650), attributes: textAttributes)
            }
            
        case 4:
            // ---------------- PAGE 4: การเดินทาง & ภาพถ่ายสภาพบ้าน ----------------
            // ข้อ 5 การเดินทาง
            let travel = formData.travelMethod
            drawCheckmark(if: travel.contains("เดิน"), at: CGPoint(x: 178, y: 90))
            drawCheckmark(if: travel.contains("จักรยาน") && !travel.contains("ยนต์"), at: CGPoint(x: 238, y: 90))
            drawCheckmark(if: travel.contains("รถโรงเรียน"), at: CGPoint(x: 308, y: 90))
            drawCheckmark(if: travel.contains("จักรยานยนต์ส่วนตัว"), at: CGPoint(x: 388, y: 90))
            drawCheckmark(if: travel.contains("รถส่วนตัว"), at: CGPoint(x: 478, y: 90))
            drawCheckmark(if: travel.contains("เรือส่วนตัว"), at: CGPoint(x: 538, y: 90))
            drawCheckmark(if: travel.contains("จักรยานยนต์รับจ้าง"), at: CGPoint(x: 80, y: 112))
            drawCheckmark(if: travel.contains("รถโดยสาร"), at: CGPoint(x: 178, y: 112))
            drawCheckmark(if: travel.contains("เรือโดยสาร"), at: CGPoint(x: 358, y: 112))
            
            if formData.travelDistanceKM > 0 {
                drawText(String(format: "%.1f", formData.travelDistanceKM), at: CGPoint(x: 218, y: 134), attributes: textAttributes)
            }
            if formData.travelTimeHours > 0 {
                let hrs = Int(formData.travelTimeHours)
                let mins = Int((formData.travelTimeHours - Double(hrs)) * 60)
                drawText("\(hrs)", at: CGPoint(x: 358, y: 134), attributes: textAttributes)
                drawText("\(mins)", at: CGPoint(x: 408, y: 134), attributes: textAttributes)
            }
            if formData.travelExpensePerMonth > 0 {
                drawText(String(format: "%.0f", formData.travelExpensePerMonth), at: CGPoint(x: 218, y: 156), attributes: textAttributes)
            }
            if formData.dailySchoolPocketMoney > 0 {
                drawText(String(format: "%.0f", formData.dailySchoolPocketMoney), at: CGPoint(x: 500, y: 156), attributes: textAttributes)
            }
            
            // ข้อ 6 ที่ตั้งของนักเรียนในปัจจุบัน
            drawText(formData.addressNo, at: CGPoint(x: 100, y: 190), attributes: textAttributes)
            drawText(formData.addressMoo, at: CGPoint(x: 220, y: 190), attributes: textAttributes)
            drawText(formData.addressSoi, at: CGPoint(x: 310, y: 190), attributes: textAttributes)
            drawText(formData.addressRoad, at: CGPoint(x: 460, y: 190), attributes: textAttributes)
            drawText(formData.addressSubDistrict, at: CGPoint(x: 100, y: 215), attributes: textAttributes)
            drawText(formData.addressDistrict, at: CGPoint(x: 240, y: 215), attributes: textAttributes)
            drawText(formData.addressProvince, at: CGPoint(x: 380, y: 215), attributes: textAttributes)
            drawText(formData.addressPostcode, at: CGPoint(x: 500, y: 215), attributes: textAttributes)
            
            // ข้อ 7 รูปถ่ายที่พักอาศัย (จัดวางลงในกรอบพิกัดสี่เหลี่ยมรักษาอัตราส่วน)
            drawImage(formData.houseExteriorPhoto, in: CGRect(x: 75, y: 388, width: 200, height: 130))
            drawImage(formData.houseInteriorPhoto, in: CGRect(x: 320, y: 388, width: 200, height: 130))
            
        case 5:
            // ---------------- PAGE 5: ลายเซ็นและการรับรองความเห็น ----------------
            // ลายเซ็นนักเรียน & ผู้ปกครอง (Overlay รูปภาพ PNG โปร่งใส)
            drawImage(formData.signatureStudent, in: CGRect(x: 180, y: 80, width: 100, height: 40))
            drawImage(formData.signatureGuardian, in: CGRect(x: 440, y: 80, width: 100, height: 40))
            
            // ชื่อใต้ลายเซ็น
            drawText(formData.studentName, at: CGPoint(x: 180, y: 125), attributes: textAttributes)
            drawText("\(formData.guardianFirstName) \(formData.guardianLastName)", at: CGPoint(x: 440, y: 125), attributes: textAttributes)
            
            // ลายเซ็นเจ้าหน้าที่รับรอง
            drawText(formData.governmentOfficialName, at: CGPoint(x: 150, y: 210), attributes: textAttributes)
            drawText(formData.governmentOfficialID, at: CGPoint(x: 440, y: 210), attributes: textAttributes)
            drawText(formData.governmentOfficialPosition, at: CGPoint(x: 150, y: 230), attributes: textAttributes)
            
            drawImage(formData.signatureOfficial, in: CGRect(x: 280, y: 290, width: 100, height: 40))
            
            // ลายเซ็นผู้อำนวยการโรงเรียน
            drawImage(formData.signatureDirector, in: CGRect(x: 280, y: 440, width: 100, height: 40))
            
            // ลายเซ็นคุณครูเยี่ยมบ้าน
            drawImage(formData.signatureTeacher, in: CGRect(x: 260, y: 640, width: 100, height: 40))
            
        default:
            break
        }
    }
    
    // MARK: - Helper Rendering Methods
    
    private func drawText(_ text: String, at point: CGPoint, attributes: [NSAttributedString.Key: Any]) {
        let nsString = text as NSString
        nsString.draw(at: point, withAttributes: attributes)
    }
    
    private func drawCheckmark(if condition: Bool = true, at point: CGPoint) {
        guard condition else { return }
        let checkmark = "✓"
        let checkFont = UIFont.boldSystemFont(ofSize: 11)
        let checkAttributes: [NSAttributedString.Key: Any] = [
            .font: checkFont,
            .foregroundColor: UIColor.systemBlue // ติ๊กสีฟ้าเพื่อให้อ่านง่าย แตกต่างจาก Template ดำขาว
        ]
        (checkmark as NSString).draw(at: point, withAttributes: checkAttributes)
    }
    
    private func drawDistributedID(_ id: String, startX: CGFloat, y: CGFloat, spacing: CGFloat, attributes: [NSAttributedString.Key: Any]) {
        var currentX = startX
        let cleanId = id.replacingOccurrences(of: "-", with: "")
        for char in cleanId {
            let str = String(char)
            drawText(str, at: CGPoint(x: currentX, y: y), attributes: attributes)
            currentX += spacing
        }
    }
    
    private func drawTableRows(members: [HouseholdMember], startIdx: Int, endIdx: Int, startY: CGFloat, rowHeight: CGFloat, attributes: [NSAttributedString.Key: Any]) {
        var currentY = startY
        for i in startIdx..<endIdx {
            guard i < members.count else { break }
            let member = members[i]
            
            // ดึงเฉพาะ 10 คนแรกตามขีดจำกัดตารางแบบฟอร์ม กสศ.01
            drawText("\(i + 1)", at: CGPoint(x: 25, y: currentY), attributes: attributes)
            drawText(member.name, at: CGPoint(x: 50, y: currentY), attributes: attributes)
            drawText(member.relation, at: CGPoint(x: 135, y: currentY), attributes: attributes)
            
            // เลขประจำตัวประชาชนของสมาชิกแบบย่อ spacing ลงช่อง
            drawDistributedID(member.nationalID, startX: 180, y: currentY, spacing: 6.5, attributes: attributes)
            
            drawText(member.highestEducation, at: CGPoint(x: 265, y: currentY), attributes: attributes)
            drawText("\(member.age)", at: CGPoint(x: 310, y: currentY), attributes: attributes)
            
            // ติ๊กสถานะความพึ่งพิง
            drawCheckmark(if: member.hasDisability, at: CGPoint(x: 338, y: currentY - 3))
            drawCheckmark(if: member.hasChronicDisease, at: CGPoint(x: 368, y: currentY - 3))
            
            // รายได้แยกประเภท
            if member.salary > 0 { drawText(String(format: "%.0f", member.salary), at: CGPoint(x: 398, y: currentY), attributes: attributes) }
            if member.agricultureIncome > 0 { drawText(String(format: "%.0f", member.agricultureIncome), at: CGPoint(x: 432, y: currentY), attributes: attributes) }
            if member.businessIncome > 0 { drawText(String(format: "%.0f", member.businessIncome), at: CGPoint(x: 466, y: currentY), attributes: attributes) }
            if member.stateWelfare > 0 { drawText(String(format: "%.0f", member.stateWelfare), at: CGPoint(x: 500, y: currentY), attributes: attributes) }
            if member.otherIncome > 0 { drawText(String(format: "%.0f", member.otherIncome), at: CGPoint(x: 534, y: currentY), attributes: attributes) }
            
            // ยอดรวมต่อแถว
            if member.totalMonthlyIncome > 0 {
                drawText(String(format: "%.0f", member.totalMonthlyIncome), at: CGPoint(x: 568, y: currentY), attributes: attributes)
            }
            
            currentY += rowHeight
        }
    }
    
    private func drawImage(_ data: Data?, in rect: CGRect) {
        guard let data = data else { return }
        if let image = UIImage(data: data) {
            let fitRect = calculateAspectFit(imageSize: image.size, targetRect: rect)
            image.draw(in: fitRect)
        } else if let drawing = try? PKDrawing(data: data) {
            // หากรูปเป็นเวกเตอร์ของ PencilKit (PKDrawing) ให้ทำการเรนเดอร์ลายเส้นเป็นรูปพื้นโปร่งใสแบบ On-The-Fly ก่อนพิมพ์
            let drawingBounds = drawing.bounds.isEmpty ? CGRect(x: 0, y: 0, width: 1, height: 1) : drawing.bounds
            let fitRect = calculateAspectFit(imageSize: drawingBounds.size, targetRect: rect)
            let image = drawing.image(from: drawingBounds, scale: UIScreen.main.scale)
            image.draw(in: fitRect)
        }
    }
    
    private func calculateAspectFit(imageSize: CGSize, targetRect: CGRect) -> CGRect {
        guard imageSize.width > 0, imageSize.height > 0 else { return targetRect }
        let scale = min(targetRect.width / imageSize.width, targetRect.height / imageSize.height)
        let scaledWidth = imageSize.width * scale
        let scaledHeight = imageSize.height * scale
        let x = targetRect.origin.x + (targetRect.width - scaledWidth) / 2.0
        let y = targetRect.origin.y + (targetRect.height - scaledHeight) / 2.0
        return CGRect(x: x, y: y, width: scaledWidth, height: scaledHeight)
    }
    
    // MARK: - Fallback PDF Generator
    
    /// สร้างเอกสาร PDF รูปแบบจำลองขึ้นมาใหม่กรณีที่หาไฟล์ PDF แม่แบบไม่พบ
    private func generateFallbackPDF(from formData: EEFFormFormData) -> Data? {
        let pdfData = NSMutableData()
        guard let consumer = CGDataConsumer(data: pdfData) else { return nil }
        
        var mediaBox = CGRect(x: 0, y: 0, width: 595.27, height: 841.89)
        guard let writeContext = CGContext(consumer: consumer, mediaBox: &mediaBox, nil) else { return nil }
        
        let totalPages = 5
        for pageNum in 1...totalPages {
            var pageRect = mediaBox
            writeContext.beginPage(mediaBox: &pageRect)
            
            // วาดกรอบสี่เหลี่ยมรอบหน้าเพื่อแสดงขนาดเอกสารจำลอง
            writeContext.saveGState()
            writeContext.setStrokeColor(UIColor.lightGray.cgColor)
            writeContext.setLineWidth(1)
            writeContext.addRect(pageRect.insetBy(dx: 20, dy: 20))
            writeContext.strokePath()
            writeContext.restoreGState()
            
            // พลิกพิกัดวาดเป็น UIKit
            writeContext.saveGState()
            writeContext.translateBy(x: 0, y: pageRect.size.height)
            writeContext.scaleBy(x: 1.0, y: -1.0)
            
            UIGraphicsPushContext(writeContext)
            
            let headerFont = UIFont.boldSystemFont(ofSize: 13)
            let headerAttributes: [NSAttributedString.Key: Any] = [
                .font: headerFont,
                .foregroundColor: UIColor.black
            ]
            
            let title = "แบบ นร./กสศ.01 หน้าที่ \(pageNum) [Fallback Layout - ไม่พบแม่แบบ PDF จริง]"
            (title as NSString).draw(at: CGPoint(x: 40, y: 40), withAttributes: headerAttributes)
            
            // เรียกพิกัดฟังก์ชันเขียนทับปกติ ข้อมูลจะลอยอยู่ตามพิกัดจำลองที่ถูกต้อง
            drawOverlayForPage(pageNum, in: pageRect, context: writeContext, formData: formData)
            
            UIGraphicsPopContext()
            writeContext.restoreGState()
            
            writeContext.endPage()
        }
        
        writeContext.closePDF()
        return pdfData as Data
    }
}
