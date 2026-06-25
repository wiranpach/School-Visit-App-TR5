/**
 * js/config/pdfCoordinates.js
 * Blueprint specifying exact (X, Y) coordinate points for stamping data on the A4 PDF form.
 * Units are in PDF points (72 points = 1 inch, origin at bottom-left corner).
 */

export const PDFCoordinatesBlueprint = {
  // Page 1 (Index 0 of PDF Document)
  0: {
    schoolName: { x: 255, y: 782, type: 'text', fontSize: 10 },
    term: { x: 425, y: 782, type: 'text', fontSize: 10 },
    academicYear: { x: 505, y: 782, type: 'text', fontSize: 10 },
    studentName: { x: 135, y: 742, type: 'text', fontSize: 10 },
    studentSurname: { x: 305, y: 742, type: 'text', fontSize: 10 },
    nationalId: { x: 135, y: 717, type: 'text', fontSize: 10 },
    GCode: { x: 385, y: 717, type: 'text', fontSize: 10 },
    
    // Family Status Checkboxes
    "familyStatus_อยู่ร่วมกัน": { x: 125, y: 687, type: 'checkbox' },
    "familyStatus_แยกกันอยู่": { x: 205, y: 687, type: 'checkbox' },
    "familyStatus_หย่าร้าง": { x: 285, y: 687, type: 'checkbox' },
    "familyStatus_เสียชีวิต": { x: 365, y: 687, type: 'checkbox' },
    "familyStatus_ครัวเรือนสถาบัน": { x: 445, y: 687, type: 'checkbox' },
    
    // Living With Checkboxes
    "livingWith_บิดามารดา": { x: 125, y: 662, type: 'checkbox' },
    "livingWith_บิดา": { x: 205, y: 662, type: 'checkbox' },
    "livingWith_มารดา": { x: 285, y: 662, type: 'checkbox' },
    "livingWith_ญาติ": { x: 365, y: 662, type: 'checkbox' },
    "livingWith_ผู้ปกครอง": { x: 445, y: 662, type: 'checkbox' },
    
    // Guardian Parameters
    "guardianDetails.name": { x: 155, y: 632, type: 'text', fontSize: 10 },
    "guardianDetails.relation": { x: 385, y: 632, type: 'text', fontSize: 10 },
    "guardianDetails.phone": { x: 505, y: 632, type: 'text', fontSize: 10 },
    "guardianDetails.citizenId": { x: 155, y: 607, type: 'text', fontSize: 10 },
    "guardianDetails.education": { x: 305, y: 607, type: 'text', fontSize: 10 },
    "guardianDetails.career": { x: 455, y: 607, type: 'text', fontSize: 10 },
    "guardianDetails.welfareStatus_ได้รับบัตรสวัสดิการแห่งรัฐ": { x: 155, y: 582, type: 'checkbox' },
    "guardianDetails.welfareStatus_ไม่ได้รับ": { x: 285, y: 582, type: 'checkbox' }
  },

  // Page 2 (Index 1 of PDF Document)
  1: {
    aggregateHouseholdIncome: { x: 350, y: 320, type: 'text', fontSize: 10 },
    averageIncomePerHead: { x: 350, y: 295, type: 'text', fontSize: 10 }
  },

  // Page 3 (Index 2 of PDF Document)
  2: {
    // Section 4: Institution Details
    "institution.institutionType": { x: 155, y: 782, type: 'text', fontSize: 10 },
    "institution.institutionName": { x: 305, y: 782, type: 'text', fontSize: 10 },
    "institution.province": { x: 485, y: 782, type: 'text', fontSize: 10 },
    "institution.managerName": { x: 155, y: 757, type: 'text', fontSize: 10 },
    "institution.phone": { x: 305, y: 757, type: 'text', fontSize: 10 },
    "institution.arrivalMonth": { x: 425, y: 757, type: 'text', fontSize: 10 },
    "institution.arrivalYear": { x: 505, y: 757, type: 'text', fontSize: 10 },
    
    // 3.1 Household Burdens Checkboxes
    "householdBurden.disability": { x: 105, y: 682, type: 'checkbox' },
    "householdBurden.chronic": { x: 205, y: 682, type: 'checkbox' },
    "householdBurden.elderly": { x: 305, y: 682, type: 'checkbox' },
    "householdBurden.singleParent": { x: 405, y: 682, type: 'checkbox' },
    "householdBurden.unemployed": { x: 505, y: 682, type: 'checkbox' },

    // 3.2 Housing Status Checkboxes & Fields
    "housingStatus.type_owned": { x: 125, y: 622, type: 'checkbox' },
    "housingStatus.type_livingFree": { x: 205, y: 622, type: 'checkbox' },
    "housingStatus.type_rented": { x: 285, y: 622, type: 'checkbox' },
    "housingStatus.type_dormitory": { x: 365, y: 622, type: 'checkbox' },
    "housingStatus.rentCost": { x: 455, y: 622, type: 'text', fontSize: 10 },

    // 3.3 Housing Materials
    "housingMaterials.floor_คอนกรีต/กระเบื้อง": { x: 155, y: 562, type: 'checkbox' },
    "housingMaterials.floor_ไม้กระดาน": { x: 255, y: 562, type: 'checkbox' },
    "housingMaterials.floor_ดิน/ไม้ไผ่": { x: 355, y: 562, type: 'checkbox' },
    "housingMaterials.wall_อิฐ/ปูน": { x: 155, y: 537, type: 'checkbox' },
    "housingMaterials.wall_ไม้ไผ่/สังกะสี": { x: 255, y: 537, type: 'checkbox' },
    "housingMaterials.wall_ใบจาก/ฟาง": { x: 355, y: 537, type: 'checkbox' },
    "housingMaterials.roof_คอนกรีต/กระเบื้องโมเนีย": { x: 155, y: 512, type: 'checkbox' },
    "housingMaterials.roof_สังกะสีผุพัง": { x: 255, y: 512, type: 'checkbox' },
    "housingMaterials.roof_หญ้าคา/จาก": { x: 355, y: 512, type: 'checkbox' },
    "housingMaterials.toiletExist_true": { x: 155, y: 482, type: 'checkbox' },
    "housingMaterials.toiletExist_false": { x: 255, y: 482, type: 'checkbox' },

    // 3.4 Agricultural Land
    "agriculturalLand.status_none": { x: 155, y: 422, type: 'checkbox' },
    "agriculturalLand.status_lessThan1": { x: 255, y: 422, type: 'checkbox' },
    "agriculturalLand.status_1to5": { x: 355, y: 422, type: 'checkbox' },
    "agriculturalLand.status_moreThan5": { x: 455, y: 422, type: 'checkbox' }
  },

  // Page 4 (Index 3 of PDF Document)
  3: {
    // 3.5 Drinking Water Source
    "drinkingWaterSource_น้ำขวดบรรจุเสร็จ": { x: 155, y: 782, type: 'checkbox' },
    "drinkingWaterSource_น้ำประปาต้ม": { x: 255, y: 782, type: 'checkbox' },
    "drinkingWaterSource_น้ำบ่อขุด/น้ำฝน": { x: 355, y: 782, type: 'checkbox' },
    "drinkingWaterSource_แม่น้ำลำคลอง": { x: 455, y: 782, type: 'checkbox' },
    
    // 3.6 Electricity Source
    "electricitySource_สายส่งระบบการไฟฟ้า": { x: 155, y: 757, type: 'checkbox' },
    "electricitySource_แผงโซลาร์เซลล์": { x: 255, y: 757, type: 'checkbox' },
    "electricitySource_เครื่องปั่นไฟ/แบตเตอรี่": { x: 355, y: 757, type: 'checkbox' },
    "electricitySource_ไม่มีไฟฟ้า": { x: 455, y: 757, type: 'checkbox' },

    // 3.7 Vehicles Owned
    "vehiclesOwned.car": { x: 105, y: 712, type: 'checkbox' },
    "vehiclesOwned.pickup": { x: 205, y: 712, type: 'checkbox' },
    "vehiclesOwned.tractor": { x: 305, y: 712, type: 'checkbox' },
    "vehiclesOwned.motorcycle": { x: 405, y: 712, type: 'checkbox' },

    // 3.8 Appliances Owned
    "appliancesOwned.computer": { x: 105, y: 662, type: 'checkbox' },
    "appliancesOwned.airCon": { x: 205, y: 662, type: 'checkbox' },
    "appliancesOwned.flatTv": { x: 305, y: 662, type: 'checkbox' },
    "appliancesOwned.washingMachine": { x: 405, y: 662, type: 'checkbox' },
    "appliancesOwned.refrigerator": { x: 505, y: 662, type: 'checkbox' },

    // Section 5: Travel
    "travel.travelMethod": { x: 185, y: 602, type: 'text', fontSize: 10 },
    "travel.distanceKm": { x: 355, y: 602, type: 'text', fontSize: 10 },
    "travel.travelTimeHours": { x: 485, y: 602, type: 'text', fontSize: 10 },
    "travel.travelExpenseMonthly": { x: 185, y: 577, type: 'text', fontSize: 10 },
    "travel.studentDailyAllowance": { x: 355, y: 577, type: 'text', fontSize: 10 },

    // Section 6: Physical Address
    "address.addressNo": { x: 105, y: 522, type: 'text', fontSize: 10 },
    "address.moo": { x: 205, y: 522, type: 'text', fontSize: 10 },
    "address.alley": { x: 305, y: 522, type: 'text', fontSize: 10 },
    "address.road": { x: 405, y: 522, type: 'text', fontSize: 10 },
    "address.subdistrict": { x: 105, y: 497, type: 'text', fontSize: 10 },
    "address.district": { x: 225, y: 497, type: 'text', fontSize: 10 },
    "address.province": { x: 355, y: 497, type: 'text', fontSize: 10 },
    "address.postalCode": { x: 485, y: 497, type: 'text', fontSize: 10 },

    // Section 7: House Photos
    "photos.photoExteriorBase64": { x: 80, y: 220, type: 'image', width: 200, height: 140 },
    "photos.photoInteriorBase64": { x: 320, y: 220, type: 'image', width: 200, height: 140 },

    // Page 4 Signatures
    "signatures.studentSignatureBase64": { x: 180, y: 90, type: 'signature', width: 100, height: 35 },
    "signatures.studentSignedDate": { x: 180, y: 70, type: 'text', fontSize: 9 },
    "signatures.guardianSignatureBase64": { x: 430, y: 90, type: 'signature', width: 100, height: 35 },
    "signatures.guardianSignedDate": { x: 430, y: 70, type: 'text', fontSize: 9 }
  },

  // Page 5 (Index 4 of PDF Document)
  4: {
    // Certifying checkmarks
    "signatures.verificationStatus": { x: 105, y: 752, type: 'checkbox' },
    "signatures.directorApproved": { x: 105, y: 552, type: 'checkbox' },

    // Page 5 Signatures
    "signatures.teacherSignatureBase64": { x: 180, y: 682, type: 'signature', width: 100, height: 35 },
    "signatures.teacherSignedDate": { x: 180, y: 662, type: 'text', fontSize: 9 },
    
    "signatures.officerSignatureBase64": { x: 430, y: 682, type: 'signature', width: 100, height: 35 },
    "signatures.officerSignedDate": { x: 430, y: 662, type: 'text', fontSize: 9 },
    
    "signatures.directorSignatureBase64": { x: 300, y: 482, type: 'signature', width: 100, height: 35 },
    "signatures.directorSignedDate": { x: 300, y: 462, type: 'text', fontSize: 9 }
  }
};

/* =========================================================================
   Programmatic Loop Generation for 10 Household Members Rows
   ========================================================================= */

// Page 1 (Index 0): Members 1-5 (array index 0 to 4)
const page1BaseY = 480;
const page1RowHeight = 44;
for (let i = 0; i < 5; i++) {
  const y = page1BaseY - (i * page1RowHeight);
  PDFCoordinatesBlueprint[0][`householdMembers.${i}.name`] = { x: 50, y: y, type: 'text', fontSize: 8 };
  PDFCoordinatesBlueprint[0][`householdMembers.${i}.relation`] = { x: 145, y: y, type: 'text', fontSize: 8 };
  PDFCoordinatesBlueprint[0][`householdMembers.${i}.age`] = { x: 205, y: y, type: 'text', fontSize: 8 };
  PDFCoordinatesBlueprint[0][`householdMembers.${i}.education`] = { x: 235, y: y, type: 'text', fontSize: 8 };
  PDFCoordinatesBlueprint[0][`householdMembers.${i}.physicalDisability`] = { x: 295, y: y + 2, type: 'checkbox' };
  PDFCoordinatesBlueprint[0][`householdMembers.${i}.chronicDisease`] = { x: 315, y: y + 2, type: 'checkbox' };
  PDFCoordinatesBlueprint[0][`householdMembers.${i}.incomeWages`] = { x: 345, y: y, type: 'text', fontSize: 8 };
  PDFCoordinatesBlueprint[0][`householdMembers.${i}.incomeAgriculture`] = { x: 385, y: y, type: 'text', fontSize: 8 };
  PDFCoordinatesBlueprint[0][`householdMembers.${i}.incomeBusiness`] = { x: 425, y: y, type: 'text', fontSize: 8 };
  PDFCoordinatesBlueprint[0][`householdMembers.${i}.incomeWelfare`] = { x: 465, y: y, type: 'text', fontSize: 8 };
  PDFCoordinatesBlueprint[0][`householdMembers.${i}.incomeOther`] = { x: 505, y: y, type: 'text', fontSize: 8 };
  PDFCoordinatesBlueprint[0][`householdMembers.${i}.totalMonthlyIncome`] = { x: 545, y: y, type: 'text', fontSize: 8 };
}

// Page 2 (Index 1): Members 6-10 (array index 5 to 9)
const page2BaseY = 700;
const page2RowHeight = 44;
for (let i = 5; i < 10; i++) {
  const y = page2BaseY - ((i - 5) * page2RowHeight);
  PDFCoordinatesBlueprint[1][`householdMembers.${i}.name`] = { x: 50, y: y, type: 'text', fontSize: 8 };
  PDFCoordinatesBlueprint[1][`householdMembers.${i}.relation`] = { x: 145, y: y, type: 'text', fontSize: 8 };
  PDFCoordinatesBlueprint[1][`householdMembers.${i}.age`] = { x: 205, y: y, type: 'text', fontSize: 8 };
  PDFCoordinatesBlueprint[1][`householdMembers.${i}.education`] = { x: 235, y: y, type: 'text', fontSize: 8 };
  PDFCoordinatesBlueprint[1][`householdMembers.${i}.physicalDisability`] = { x: 295, y: y + 2, type: 'checkbox' };
  PDFCoordinatesBlueprint[1][`householdMembers.${i}.chronicDisease`] = { x: 315, y: y + 2, type: 'checkbox' };
  PDFCoordinatesBlueprint[1][`householdMembers.${i}.incomeWages`] = { x: 345, y: y, type: 'text', fontSize: 8 };
  PDFCoordinatesBlueprint[1][`householdMembers.${i}.incomeAgriculture`] = { x: 385, y: y, type: 'text', fontSize: 8 };
  PDFCoordinatesBlueprint[1][`householdMembers.${i}.incomeBusiness`] = { x: 425, y: y, type: 'text', fontSize: 8 };
  PDFCoordinatesBlueprint[1][`householdMembers.${i}.incomeWelfare`] = { x: 465, y: y, type: 'text', fontSize: 8 };
  PDFCoordinatesBlueprint[1][`householdMembers.${i}.incomeOther`] = { x: 505, y: y, type: 'text', fontSize: 8 };
  PDFCoordinatesBlueprint[1][`householdMembers.${i}.totalMonthlyIncome`] = { x: 545, y: y, type: 'text', fontSize: 8 };
}
