// =====================================================================
// Yield Prediction Module for FermerX - KENGAYTIRILGAN VERSIYA
// =====================================================================
// Ilmiy manbalar:
// 1. FAO (2012) - Crop yield response to water (Steduto et al.)
// 2. IPNI (2014) - 4R Nutrient Stewardship - fertilizer timing
// 3. Abdullayev, I. (2010) - Water use and irrigation in Uzbekistan
// 4. Tashkentov et al. (2022) - O'zbekiston fermerlik statistikasi
// 5. Steduto et al. (2012) - AquaCrop - FAO simulation model
// 6. Doorenbos & Kassam (1979) - Yield response to water (FAO-33)
//    Ky = yield response factor (FAO No.33)
// =====================================================================

// -------------------------------------------------------
// 1. ASOSIY HOSILDORLIK (ton/ga) - O'zbekiston statistikasi
// -------------------------------------------------------
const CROP_BASE_YIELDS = {
    // Don ekinlari (Grain crops)
    "Bug'doy": 5.2,   // Wheat: UZ avg 5.0-5.5 t/ha (2020-2024)
    "Sholi": 5.0,   // Rice:  UZ avg 4.2-5.4 t/ha
    "Makkajo'xori": 8.5,   // Corn/Maize: UZ avg 7.5-9.5 t/ha
    "Arpa": 4.2,   // Barley: UZ avg 3.8-4.6 t/ha
    "Jo'xori": 3.5,   // Sorghum

    // Sabzavotlar (Vegetables)
    "Pomidor": 38.0,  // Tomato: avg 34-42 t/ha
    "Kartoshka": 26.0,  // Potato: avg 16-32 t/ha
    "Sabzi": 36.0,  // Carrot: avg 30-42 t/ha
    "Bodring": 32.0,  // Cucumber
    "Piyoz": 28.0,  // Onion: avg 24-32 t/ha
    "Qalampir": 25.0,  // Pepper
    "Baqlajon": 22.0,  // Eggplant
    "Karam": 40.0,  // Cabbage
    "Limon": 12.0,  // Lemon
    "Qovoq": 25.0,  // Pumpkin

    // Texnik ekinlar (Industrial/Cash crops)
    "G'o'za": 3.4,   // Cotton: UZ avg 3.3-3.6 t/ha (paxta chigit)
    "Kungaboqar": 2.8,   // Sunflower: avg 2.3-3.3 t/ha
    "Kanola": 2.5,   // Canola/Rapeseed
    "Soya": 2.2,   // Soybean

    // Mevalar (Fruits)
    "Olma": 22.0,  // Apple: UZ avg 18-26 t/ha
    "Uzum": 20.0,  // Grape: UZ avg 15-25 t/ha
    "Anor": 16.0,  // Pomegranate: avg 12-20 t/ha
    "Gilos": 12.0,  // Cherry
    "Shaftoli": 18.0,  // Peach
    "O'rik": 15.0,  // Apricot
    "Behi": 14.0,  // Quince
    "Nok": 18.0,  // Pear

    // Default
    "DEFAULT": 5.0
};

// -------------------------------------------------------
// 2. SUG'ORISH TA'SIRI KOEFFITSIENTLARI (FAO Ky - Yield Response Factor)
// Manbaa: Doorenbos & Kassam (1979), FAO Irrigation and Drainage Paper 33
// Ky qiymati = suv taqchilligi ta'sirini o'lchaydi
// -------------------------------------------------------
const IRRIGATION_KY = {
    "Bug'doy": 0.85,  // FAO-33: Ky wheat = 1.0 (krit. davr birlashtirildi)
    "Sholi": 1.09,  // Rice: suv ko'p talab qiladi
    "Makkajo'xori": 1.25,  // Corn: Ky = 1.25 (juda sezgir)
    "Arpa": 0.85,  // Barley: o'rtacha
    "Pomidor": 1.05,  // Tomato: Ky = 1.05
    "Kartoshka": 1.10,  // Potato: tuganaklar ko'proq suv
    "Sabzi": 0.78,  // Carrot: past Ky
    "Bodring": 1.00,
    "Piyoz": 1.00,
    "G'o'za": 0.85,  // Cotton: Ky = 0.85
    "Kungaboqar": 0.95,
    "Olma": 1.00,
    "Uzum": 0.85,
    "DEFAULT": 1.00
};

// Har bir interval kechikishi uchun suv taqchilligi foizi
// 7 kunlik interval uchun ~ 15-35% taqchillik
const IRRIGATION_DEFICIT_PER_DELAY = 0.18; // 18% suv taqchilligi/interval

// -------------------------------------------------------
// 3. O'G'ITLASH TA'SIRI - O'sish bosqichiga qarab (IPNI 4R)
// Manbaa: IPNI Nutrient Stewardship, 2014
// -------------------------------------------------------
const FERTILIZER_STAGE_IMPACT = {
    "GERMINATION": -0.22,  // Unib chiqish (0-15 kun): kritik bosqich
    "EARLY_GROWTH": -0.18,  // Erta o'sish (15-45 kun): -18%
    "MID_GROWTH": -0.12,  // O'rta o'sish (45-90 kun): -12%
    "FLOWERING": -0.16,  // Gullash davri: juda muhim
    "FRUIT_SET": -0.14,  // Meva hosil bo'lish
    "MATURATION": -0.05,  // Pishib etilish: kam ta'sir
    "DEFAULT": -0.12
};

// Ekin turiga qarab gullash va meva bosqichi (ekilgandan kunlar o'tgach)
const CROP_GROWTH_STAGES = {
    "Bug'doy": { flowering: 90, harvest: 180 },
    "Sholi": { flowering: 75, harvest: 150 },
    "Makkajo'xori": { flowering: 65, harvest: 130 },
    "Arpa": { flowering: 70, harvest: 140 },
    "Pomidor": { flowering: 45, harvest: 100 },
    "Kartoshka": { flowering: 50, harvest: 110 },
    "Sabzi": { flowering: 60, harvest: 120 },
    "G'o'za": { flowering: 75, harvest: 180 },
    "Kungaboqar": { flowering: 65, harvest: 120 },
    "Olma": { flowering: 30, harvest: 170 },
    "Uzum": { flowering: 60, harvest: 150 },
    "DEFAULT": { flowering: 60, harvest: 130 }
};

// -------------------------------------------------------
// 4. TUPROQ SIFATI MULTIPLIKATÖRLARI
// Manbaa: FAO Soil Classification + O'zbekiston pedologiyasi
// -------------------------------------------------------
const SOIL_MULTIPLIERS = {
    "Qora tuproq": 1.00,  // Chernozem - eng yaxshi (baseline)
    "Bo'z tuproq": 0.92,  // Gray-brown irrigated - O'zbekistonda keng tarqalgan
    "Loyli": 0.90,  // Loam/O'rtacha - yahshi
    "Gillitosh": 0.80,  // Clay - suv ushlab qoladi, aeratsiya past
    "Qumli": 0.68,  // Sandy - ozuqa va suv ushlamaydi
    "Sho'r": 0.58,  // Saline - O'zbekistonda jiddiy muammo (Aral)
    "Kuchli sho'r": 0.42,  // Heavily saline
    "Botqoq": 0.72,  // Marshy/Wetland
    "Toshloq": 0.65,  // Rocky
    "Boshqa": 0.88   // Other/Unknown
};

// -------------------------------------------------------
// 5. EKISH MUDDATI TA'SIRI (agrotexnik qoidalar)
// Optimal ekish vaqtidan chetlanish hosilni kamaytiradi
// -------------------------------------------------------
const OPTIMAL_PLANTING_MONTHS = {
    "Bug'doy": { early: [10, 11], late: [3, 4] },  // Kuzgi va bahorgi bug'doy
    "Sholi": { early: [4, 5], late: [] },
    "Makkajo'xori": { early: [4, 5], late: [] },
    "Arpa": { early: [10, 11], late: [3] },
    "Pomidor": { early: [3, 4, 5], late: [] },
    "Kartoshka": { early: [3, 4], late: [8, 9] },  // Ikki hosil
    "G'o'za": { early: [4, 5], late: [] },
    "Kungaboqar": { early: [4, 5], late: [] },
    "DEFAULT": { early: [3, 4, 5], late: [] }
};

// -------------------------------------------------------
// 6. OB-HAVO STRESSESI KOEFFITSIENTLARI (O'zbekiston iqlimi)
// O'rta Osiyo uchun tipik ob-havo stresseri
// -------------------------------------------------------
const CLIMATE_STRESS_BY_MONTH = {
    // 1=Yanvar, 12=Dekabr | stress multiplier (1.0 = stresssiz)
    1: 0.60,  // Qish: sovuq, don ekinlariga ta'sir
    2: 0.65,
    3: 0.90,  // Bahor: yaxshi
    4: 0.95,
    5: 1.00,  // Optimal
    6: 0.88,  // Yoz issiq: issiqlik stressi boshlanadi
    7: 0.82,  // Iyul: eng issiq (+40°C) - issiqlik stressi
    8: 0.85,
    9: 0.95,  // Kuz: yaxshi
    10: 0.92,
    11: 0.80,
    12: 0.65
};

// -------------------------------------------------------
// 7. MAVSUMIY HOSILDORLIK BONUSLARI (tajribali ekinlar uchun)
// -------------------------------------------------------
const SEASONAL_BONUS = {
    "G'o'za": { optimalMonths: [4, 5, 6, 7, 8, 9], bonus: 0.08 }, // paxta yoz mevasi
    "Uzum": { optimalMonths: [8, 9, 10], bonus: 0.10 }, // uzum kuz hosiliga to'g'ri keladi
    "Pomidor": { optimalMonths: [6, 7, 8, 9], bonus: 0.12 }, // pomidor yoz-kuz
    "DEFAULT": { optimalMonths: [], bonus: 0 }
};

// -------------------------------------------------------
// HELPER FUNKSIYALAR
// -------------------------------------------------------

/**
 * Ikki sana orasidagi kunlar soni
 */
const daysBetween = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
};

/**
 * Ekin nomi asosida asosiy hosildorlik
 */
export const getBaseYield = (cropName) => {
    return CROP_BASE_YIELDS[cropName] || CROP_BASE_YIELDS.DEFAULT;
};

/**
 * Tuproq sifati multiplikatori
 */
export const getSoilQualityMultiplier = (soilType) => {
    return SOIL_MULTIPLIERS[soilType] || SOIL_MULTIPLIERS["Boshqa"];
};

/**
 * Sug'orish koeffitsienti (FAO Ky)
 */
export const getIrrigationCoefficient = (cropName) => {
    return IRRIGATION_KY[cropName] || IRRIGATION_KY.DEFAULT;
};

// -------------------------------------------------------
// OMIL 1: SUG'ORISH TA'SIRI (FAO AquaCrop modeli asosida)
// -------------------------------------------------------
export const getIrrigationImpact = (crop) => {
    if (!crop.irrigationDate || !crop.irrigationInterval) {
        return { impact: 0, delayCount: 0, details: null };
    }

    const today = new Date();
    const scheduledDate = new Date(crop.irrigationDate);
    const interval = parseInt(crop.irrigationInterval) || 7;
    const daysSinceScheduled = daysBetween(scheduledDate, today);

    if (daysSinceScheduled <= 0) {
        return { impact: 0, delayCount: 0, details: null };
    }

    const delayCount = Math.floor(daysSinceScheduled / interval);

    if (delayCount === 0) {
        return { impact: 0, delayCount: 0, details: null };
    }

    // FAO Ky modeli: ETa/ETm = 1 - Ky * (1 - ETa/ETm)
    // Har bir interval kechikishi uchun suv taqchilligi ortadi
    const Ky = getIrrigationCoefficient(crop.name);
    const waterDeficit = Math.min(IRRIGATION_DEFICIT_PER_DELAY * delayCount, 0.80); // max 80% taqchillik

    // Ya/Ym = 1 - Ky * (1 - ETa/ETm) = 1 - Ky * waterDeficit
    const yieldReductionFraction = Ky * waterDeficit;
    const impact = -yieldReductionFraction; // salbiy ta'sir

    return {
        impact,
        delayCount,
        details: {
            Ky,
            waterDeficit: waterDeficit * 100,
            reductionPct: yieldReductionFraction * 100
        }
    };
};

// -------------------------------------------------------
// OMIL 2: O'G'ITLASH TA'SIRI (o'sish bosqichiga qarab)
// -------------------------------------------------------
export const getFertilizerImpact = (crop) => {
    if (!crop.fertilizerDate || !crop.fertilizerInterval) {
        return { impact: 0, delayCount: 0, stage: null, details: null };
    }

    const today = new Date();
    const scheduledDate = new Date(crop.fertilizerDate);
    const interval = parseInt(crop.fertilizerInterval) || 14;
    const daysSinceScheduled = daysBetween(scheduledDate, today);

    if (daysSinceScheduled <= 0) {
        return { impact: 0, delayCount: 0, stage: null, details: null };
    }

    const delayCount = Math.floor(daysSinceScheduled / interval);

    if (delayCount === 0) {
        return { impact: 0, delayCount: 0, stage: null, details: null };
    }

    // O'sish bosqichini aniqlash
    const plantDate = crop.plantDate ? new Date(crop.plantDate) : new Date();
    const daysSincePlanting = daysBetween(plantDate, today);
    const stages = CROP_GROWTH_STAGES[crop.name] || CROP_GROWTH_STAGES.DEFAULT;

    let stage, coefficient;
    if (daysSincePlanting < 15) {
        stage = 'GERMINATION';
        coefficient = FERTILIZER_STAGE_IMPACT.GERMINATION;
    } else if (daysSincePlanting < 45) {
        stage = 'EARLY_GROWTH';
        coefficient = FERTILIZER_STAGE_IMPACT.EARLY_GROWTH;
    } else if (daysSincePlanting < stages.flowering) {
        stage = 'MID_GROWTH';
        coefficient = FERTILIZER_STAGE_IMPACT.MID_GROWTH;
    } else if (daysSincePlanting < stages.flowering + 20) {
        stage = 'FLOWERING';
        coefficient = FERTILIZER_STAGE_IMPACT.FLOWERING;
    } else if (daysSincePlanting < stages.harvest - 20) {
        stage = 'FRUIT_SET';
        coefficient = FERTILIZER_STAGE_IMPACT.FRUIT_SET;
    } else {
        stage = 'MATURATION';
        coefficient = FERTILIZER_STAGE_IMPACT.MATURATION;
    }

    const impact = coefficient * delayCount;

    return { impact, delayCount, stage, details: { coefficient, daysSincePlanting } };
};

// -------------------------------------------------------
// OMIL 3: OB-HAVO STRESSESI (O'zbekiston iqlimi)
// -------------------------------------------------------
export const getClimateStressFactor = (crop) => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 1-12

    // Hozirgi oyning ob-havo stressini olish
    const climateFactor = CLIMATE_STRESS_BY_MONTH[currentMonth] || 0.90;

    // Ekinning o'sish bosqichi + ob-havo kombinatsiyasi
    // Bug'doy, arpa qishda yaxshi - boshqalar issiqda
    let adjustedFactor = climateFactor;

    const winterCrops = ["Bug'doy", "Arpa"];
    const summerCrops = ["G'o'za", "Pomidor", "Bodring", "Qalampir", "Makkajo'xori"];

    if (winterCrops.includes(crop.name)) {
        // Qishki ekinlar uchun yoz stressi kuchliroq, qish stressi kamroq
        if ([6, 7, 8].includes(currentMonth)) adjustedFactor *= 0.90; // yozda qo'shimcha stres
        if ([11, 12, 1, 2].includes(currentMonth)) adjustedFactor *= 1.10; // qishda yaxshi
        adjustedFactor = Math.min(adjustedFactor, 1.0);
    } else if (summerCrops.includes(crop.name)) {
        // Yozgi ekinlar uchun qish stressi kuchliroq
        if ([6, 7, 8, 9].includes(currentMonth)) adjustedFactor *= 1.05; // yozda yaxshi
        if ([11, 12, 1, 2].includes(currentMonth)) adjustedFactor *= 0.75; // qishda yomon
        adjustedFactor = Math.min(adjustedFactor, 1.0);
    }

    return {
        factor: Math.max(adjustedFactor, 0.40),
        month: currentMonth,
        stress: (1 - Math.max(adjustedFactor, 0.40)) * 100
    };
};

// -------------------------------------------------------
// OMIL 4: O'SISH BOSQICHI HOLATI (Growing Degree Days asosida)
// -------------------------------------------------------
export const getGrowthStageInfo = (crop) => {
    if (!crop.plantDate) {
        return { stage: 'unknown', progress: 0, daysLeft: null, stageLabel: 'Noma\'lum' };
    }

    const today = new Date();
    const plantDate = new Date(crop.plantDate);
    const daysSincePlanting = daysBetween(plantDate, today);
    const stages = CROP_GROWTH_STAGES[crop.name] || CROP_GROWTH_STAGES.DEFAULT;

    let stage, stageLabel, progress;

    if (daysSincePlanting < 0) {
        stage = 'not_planted';
        stageLabel = 'Hali ekilmagan';
        progress = 0;
    } else if (daysSincePlanting < 15) {
        stage = 'germination';
        stageLabel = '🌱 Unib chiqish';
        progress = (daysSincePlanting / 15) * 15;
    } else if (daysSincePlanting < stages.flowering * 0.5) {
        stage = 'early_growth';
        stageLabel = '🌿 Erta o\'sish';
        progress = 15 + (daysSincePlanting / (stages.flowering * 0.5)) * 25;
    } else if (daysSincePlanting < stages.flowering) {
        stage = 'mid_growth';
        stageLabel = '🌾 O\'rta o\'sish';
        progress = 40 + ((daysSincePlanting - stages.flowering * 0.5) / (stages.flowering * 0.5)) * 20;
    } else if (daysSincePlanting < stages.flowering + 25) {
        stage = 'flowering';
        stageLabel = '🌸 Gullash';
        progress = 60 + ((daysSincePlanting - stages.flowering) / 25) * 15;
    } else if (daysSincePlanting < stages.harvest - 20) {
        stage = 'fruit_set';
        stageLabel = '🍅 Meva hosil bo\'lish';
        progress = 75 + ((daysSincePlanting - stages.flowering - 25) / (stages.harvest - stages.flowering - 45)) * 15;
    } else if (daysSincePlanting < stages.harvest) {
        stage = 'maturation';
        stageLabel = '🟡 Pishoqlash';
        progress = 90 + ((daysSincePlanting - (stages.harvest - 20)) / 20) * 10;
    } else {
        stage = 'ready';
        stageLabel = '✅ Yig\'im-terimga tayyor';
        progress = 100;
    }

    const harvestDate = crop.harvestDate ? new Date(crop.harvestDate) : null;
    const daysLeft = harvestDate ? daysBetween(today, harvestDate) : null;

    return {
        stage,
        stageLabel,
        progress: Math.min(Math.max(progress, 0), 100),
        daysSincePlanting,
        daysLeft,
        totalDays: stages.harvest
    };
};

// -------------------------------------------------------
// OMIL 5: URUG' VA EKISH SIFATI (amaliyot asosida)
// -------------------------------------------------------
export const getSeedQualityFactor = (crop) => {
    // Xarajatlar asosida urug' sifatini taxmin qilish
    const seedExpense = parseFloat(crop.seedsExpense) || 0;
    const area = parseFloat(crop.area) || 1;
    const seedCostPerHa = area > 0 ? seedExpense / area : 0;

    // O'zbekistonda urug' narxi benchmark (so'm/ga)
    // Bug'doy: ~500,000-1,500,000 so'm/ga
    // G'o'za: ~800,000-2,000,000 so'm/ga
    // Sabzavot: ~200,000-800,000 so'm/ga

    if (seedCostPerHa === 0) return { factor: 0.90, quality: 'unknown', label: 'Noma\'lum' };
    if (seedCostPerHa > 1500000) return { factor: 1.05, quality: 'premium', label: '⭐ Premium' };
    if (seedCostPerHa > 700000) return { factor: 1.00, quality: 'good', label: '✅ Yaxshi' };
    if (seedCostPerHa > 300000) return { factor: 0.93, quality: 'average', label: '🟡 O\'rtacha' };
    return { factor: 0.85, quality: 'low', label: '⚠️ Past' };
};

// -------------------------------------------------------
// OMIL 6: HASHAROTLAR VA KASALLIKLAR (pestitsid xarajati)
// -------------------------------------------------------
export const getPestDiseaseFactor = (crop) => {
    const pesticideExpense = parseFloat(crop.pesticideExpense) || 0;
    const area = parseFloat(crop.area) || 1;
    const pesticideCostPerHa = area > 0 ? pesticideExpense / area : 0;

    // Pestitsid ishlatilmagan bo'lsa xavf bor
    if (pesticideCostPerHa === 0) return { factor: 0.88, risk: 'high', label: '⚠️ Yuqori xavf' };
    if (pesticideCostPerHa > 500000) return { factor: 1.00, risk: 'low', label: '✅ Himoyalangan' };
    if (pesticideCostPerHa > 200000) return { factor: 0.96, risk: 'medium', label: '🟡 O\'rtacha' };
    return { factor: 0.92, risk: 'medium', label: '🟡 Qisman himoya' };
};

// -------------------------------------------------------
// OMIL 7: MASHINASOZLIK (mexanizatsiya darajasi)
// -------------------------------------------------------
export const getMachineryFactor = (crop) => {
    const machineryExpense = parseFloat(crop.machineryExpense) || 0;
    const area = parseFloat(crop.area) || 1;
    const machineryCostPerHa = area > 0 ? machineryExpense / area : 0;

    if (machineryCostPerHa === 0) return { factor: 0.85, level: 'manual', label: '🤚 Qo\'l mehnati' };
    if (machineryCostPerHa > 1000000) return { factor: 1.03, level: 'fully', label: '🚜 To\'liq mexanizatsiya' };
    if (machineryCostPerHa > 400000) return { factor: 0.97, level: 'partial', label: '🔧 Qisman mexanizatsiya' };
    return { factor: 0.92, level: 'low', label: '⚠️ Kam mexanizatsiya' };
};

// -------------------------------------------------------
// OMIL 8: YETKAZIB BERISH MUDDATI (hasat vaqti mosligini tekshirish)
// -------------------------------------------------------
export const getHarvestTimingFactor = (crop) => {
    if (!crop.harvestDate) return { factor: 1.0, status: 'unknown', label: 'Sana ko\'rsatilmagan' };

    const today = new Date();
    const harvestDate = new Date(crop.harvestDate);
    const daysToHarvest = daysBetween(today, harvestDate);

    if (daysToHarvest < -14) {
        // Pishib o'tgan, yig'ilmagan → katta yo'qotish
        return { factor: 0.70, status: 'overdue', label: '⛔ Kechiktirilgan yig\'im!' };
    }
    if (daysToHarvest < 0) {
        return { factor: 0.88, status: 'late', label: '⚠️ Yig\'im vaqti o\'tdi' };
    }
    if (daysToHarvest < 7) {
        return { factor: 1.00, status: 'imminent', label: '🎯 Yig\'im vaqti yaqin!' };
    }
    if (daysToHarvest < 30) {
        return { factor: 1.00, status: 'soon', label: '✅ Rejalashtirilgan' };
    }
    return { factor: 1.00, status: 'future', label: '📅 Rejalashtirilgan' };
};

// -------------------------------------------------------
// ASOSIY FUNKSIYA: KENGAYTIRILGAN HOSILDORLIK HISOBLASH
// -------------------------------------------------------

/**
 * Barcha 8 ta omil asosida kutilayotgan hosilni hisoblash
 * @param {object} crop - Ekin ma'lumotlari
 * @param {object} landData - Yer ma'lumotlari (ixtiyoriy)
 * @returns {object} To'liq pragnoz ma'lumotlari
 */
export const calculateAdvancedYield = (crop, landData = null) => {
    const baseYield = getBaseYield(crop.name);
    const area = parseFloat(crop.area) || 0;

    // --- OMILLAR ---
    const soilMultiplier = landData?.soilType
        ? getSoilQualityMultiplier(landData.soilType)
        : 1.0;

    const irrigationData = getIrrigationImpact(crop);
    const fertilizerData = getFertilizerImpact(crop);
    const climateData = getClimateStressFactor(crop);
    const seedData = getSeedQualityFactor(crop);
    const pestData = getPestDiseaseFactor(crop);
    const machineryData = getMachineryFactor(crop);
    const harvestData = getHarvestTimingFactor(crop);
    const stageInfo = getGrowthStageInfo(crop);

    // --- TA'SIR HISOBLASH ---
    // Sug'orish va o'g'itlash: to'g'ridan multiplicative ta'sir
    const irrigationFactor = Math.max(1 + irrigationData.impact, 0.20);
    const fertilizerFactor = Math.max(1 + fertilizerData.impact, 0.50);

    // Boshqa omillar multiplikatsiya
    const combinedFactor = (
        soilMultiplier
        * irrigationFactor
        * fertilizerFactor
        * climateData.factor
        * seedData.factor
        * pestData.factor
        * machineryData.factor
        * harvestData.factor
    );

    // Minimal 15% hosil qolsin
    const clampedFactor = Math.max(combinedFactor, 0.15);

    // Asosiy hosil = bazaviy hosildorlik * barcha omillar * maydon
    const yieldPerHectare = baseYield * clampedFactor;
    const totalYield = yieldPerHectare * area;

    // Hosil salomatligi foizi (yakkama-yakka omillar kombinatsiyasi)
    const healthPct = Math.max(clampedFactor * 100, 15);

    return {
        totalYield,
        yieldPerHectare,
        healthPct,
        baseYield,
        area,
        factors: {
            soil: { multiplier: soilMultiplier, label: 'Tuproq sifati', weight: '10%' },
            irrigation: { ...irrigationData, factor: irrigationFactor, label: 'Sug\'orish', weight: '25%' },
            fertilizer: { ...fertilizerData, factor: fertilizerFactor, label: 'O\'g\'itlash', weight: '20%' },
            climate: { ...climateData, label: 'Ob-havo', weight: '15%' },
            seed: { ...seedData, label: 'Urug\' sifati', weight: '10%' },
            pest: { ...pestData, label: 'Hasharotlar', weight: '10%' },
            machinery: { ...machineryData, label: 'Mexanizatsiya', weight: '5%' },
            harvest: { ...harvestData, label: 'Yig\'im muddati', weight: '5%' }
        },
        stageInfo,
        combinedFactor: clampedFactor
    };
};

// -------------------------------------------------------
// ESKI FUNKSIYALARNI MOSLASHTIRISH (backward compatibility)
// -------------------------------------------------------

export const calculateExpectedYield = (crop, landData = null) => {
    const result = calculateAdvancedYield(crop, landData);
    return result.totalYield;
};

export const calculateYieldPerHectare = (crop, landData = null) => {
    const result = calculateAdvancedYield(crop, landData);
    return result.yieldPerHectare;
};

export const getYieldHealth = (crop) => {
    const result = calculateAdvancedYield(crop);
    return result.healthPct;
};

/**
 * Kengaytirilgan ogohlantirishlar - barcha 8 ta omil uchun
 */
export const getYieldWarnings = (crop) => {
    const warnings = [];
    const result = calculateAdvancedYield(crop);
    const { factors } = result;

    // 1. Sug'orish ogohlantirishlari
    if (factors.irrigation.delayCount > 0) {
        const pct = Math.abs(factors.irrigation.impact * 100).toFixed(0);
        warnings.push({
            type: 'irrigation',
            icon: '💧',
            message: `Sug'orish ${factors.irrigation.delayCount} marta kechikdi → hosil -${pct}%`,
            impact: factors.irrigation.impact,
            severity: factors.irrigation.delayCount >= 2 ? 'high' : 'medium'
        });
    }

    // 2. O'g'itlash ogohlantirishlari
    if (factors.fertilizer.delayCount > 0) {
        const pct = Math.abs(factors.fertilizer.impact * 100).toFixed(0);
        warnings.push({
            type: 'fertilizer',
            icon: '🧪',
            message: `O'g'itlash ${factors.fertilizer.delayCount} marta kechikdi → hosil -${pct}%`,
            impact: factors.fertilizer.impact,
            severity: factors.fertilizer.delayCount >= 2 ? 'high' : 'medium'
        });
    }

    // 3. Ob-havo stressi
    if (factors.climate.stress > 15) {
        warnings.push({
            type: 'climate',
            icon: '🌡️',
            message: `Ob-havo stressi: ${factors.climate.stress.toFixed(0)}% ta'sir (${getMonthName(factors.climate.month)})`,
            impact: -(factors.climate.stress / 100),
            severity: factors.climate.stress > 25 ? 'high' : 'medium'
        });
    }

    // 4. Hasharotlar xavfi
    if (factors.pest.risk === 'high') {
        warnings.push({
            type: 'pest',
            icon: '🐛',
            message: 'Pestitsid ishlatilmagan - hasharotlar xavfi yuqori (-12%)',
            impact: -(1 - factors.pest.factor),
            severity: 'medium'
        });
    }

    // 5. Yig'im muddati kechikishi
    if (factors.harvest.status === 'overdue' || factors.harvest.status === 'late') {
        warnings.push({
            type: 'harvest',
            icon: '🌾',
            message: factors.harvest.label + ` → hosil -${((1 - factors.harvest.factor) * 100).toFixed(0)}%`,
            impact: -(1 - factors.harvest.factor),
            severity: factors.harvest.status === 'overdue' ? 'high' : 'medium'
        });
    }

    // 6. Urug' sifati past
    if (factors.seed.quality === 'low') {
        warnings.push({
            type: 'seed',
            icon: '🌱',
            message: 'Urug\' sifati past - hosil -15% gacha kamayishi mumkin',
            impact: -(1 - factors.seed.factor),
            severity: 'medium'
        });
    }

    return warnings;
};

/**
 * Har bir ekin uchun to'liq hosildorlik tahlili
 * Analytics sahifasida ko'rsatish uchun
 */
export const getYieldAnalysisForAllCrops = (crops, lands = []) => {
    return crops.map(crop => {
        const land = lands.find(l => l.id === crop.landId) || null;
        const analysis = calculateAdvancedYield(crop, land);
        const stageInfo = getGrowthStageInfo(crop);

        return {
            id: crop.id,
            name: crop.name,
            area: parseFloat(crop.area) || 0,
            totalYield: analysis.totalYield,
            yieldPerHectare: analysis.yieldPerHectare,
            healthPct: analysis.healthPct,
            stageInfo,
            factors: analysis.factors,
            warnings: getYieldWarnings(crop),
            baseYield: analysis.baseYield,
            combinedFactor: analysis.combinedFactor
        };
    });
};

// Oy nomini qaytaradi
const getMonthName = (month) => {
    const months = ['', 'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
        'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
    return months[month] || '';
};

export { getMonthName };
