/**
 * js/config/formSchema.js
 * Single Source of Truth for the 5-page student home-visit (กสศ. 01) form state.
 * Exports a creation function to return fresh data instances.
 */

export function createEmptyFormSchema() {
  return {
    // Page 1: General School & Student Info
    schoolName: "",
    term: "",
    academicYear: "",
    studentName: "",
    studentSurname: "",
    nationalId: "",
    GCode: "",
    familyStatus: "", // e.g., "อยู่ร่วมกัน", "แยกกันอยู่", "หย่าร้าง", "เสียชีวิต"
    livingWith: "",   // e.g., "บิดามารดา", "บิดา", "มารดา", "ญาติ"
    guardianDetails: {
      name: "",
      relation: "",
      education: "",
      career: "",
      phone: "",
      citizenId: "",
      welfareStatus: "" // e.g., "ได้รับบัตรสวัสดิการแห่งรัฐ", "ไม่ได้รับ"
    },
    totalHouseholdMembers: 1,

    // Page 1-2: Household Members Array (up to 10 members)
    householdMembers: Array.from({ length: 10 }, (_, index) => ({
      id: index + 1,
      name: "",
      relation: "",
      nationalId: "",
      education: "",
      age: "",
      physicalDisability: false,
      chronicDisease: false,
      incomeWages: 0,
      incomeAgriculture: 0,
      incomeBusiness: 0,
      incomeWelfare: 0,
      incomeOther: 0,
      totalMonthlyIncome: 0
    })),

    // Page 2: Financial Aggregations
    aggregateHouseholdIncome: 0,
    averageIncomePerHead: 0,

    // Page 2-3: Household Conditions & Assets
    householdBurden: {
      disability: false,
      chronic: false,
      elderly: false,
      singleParent: false,
      unemployed: false
    },
    housingStatus: {
      type: "", // e.g., "owned", "livingFree", "rented", "dormitory"
      rentCost: 0
    },
    housingMaterials: {
      floor: "", // e.g., "concrete", "wood", "dirt"
      wall: "",  // e.g., "brick", "wood", "bamboo"
      roof: "",  // e.g., "concrete", "zinc", "thatch"
      toiletExist: false
    },
    agriculturalLand: {
      status: "" // e.g., "none", "lessThan1", "1to5", "moreThan5"
    },
    drinkingWaterSource: "", // e.g., "tap", "well", "rainwater", "bottled"
    electricitySource: "",   // e.g., "grid", "solar", "generator", "none"
    vehiclesOwned: {
      car: false,
      pickup: false,
      tractor: false,
      motorcycle: false,
      ageOver15: false,
      ageUnder15: false
    },
    appliancesOwned: {
      computer: false,
      airCon: false,
      flatTv: false,
      washingMachine: false,
      refrigerator: false
    },

    // Page 3: Institution/Boarding Section 4
    institution: {
      institutionType: "",
      institutionName: "",
      province: "",
      managerName: "",
      phone: "",
      arrivalMonth: "",
      arrivalYear: "",
      stayType: "",
      assistanceType: "",
      annualExpensePerHead: 0,
      currentStudentCount: 0,
      landOwnership: "",
      annualDonationRevenue: 0,
      fundingNeedStatus: ""
    },

    // Page 4: Section 5 & 6 (Travel & Address)
    travel: {
      travelMethod: "", // e.g., "เดินเท้า", "จักรยาน", "มอเตอร์ไซค์", "รถโรงเรียน"
      distanceKm: 0,
      travelTimeHours: 0,
      travelExpenseMonthly: 0,
      studentDailyAllowance: 0
    },
    address: {
      addressNo: "",
      moo: "",
      alley: "",
      road: "",
      subdistrict: "",
      district: "",
      province: "",
      postalCode: ""
    },

    // Page 4: Section 7 (Photos)
    photos: {
      photoType: "", // e.g., "บ้านเดี่ยว", "ทาวน์เฮ้าส์", "ห้องเช่า"
      photoExteriorBase64: "",
      photoInteriorBase64: ""
    },

    // Page 4-5: Section 8, 9 & 10 (Signatures & Verifications)
    signatures: {
      studentSignatureBase64: "",
      studentSignedDate: "",
      guardianSignatureBase64: "",
      guardianSignedDate: "",
      teacherSignatureBase64: "",
      teacherSignedDate: "",
      officerSignatureBase64: "",
      officerSignedDate: "",
      directorSignatureBase64: "",
      directorSignedDate: "",
      verificationStatus: false, // Surveying teacher verified
      directorApproved: false    // School Director certified
    }
  };
}
