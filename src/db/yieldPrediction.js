// Yield Prediction Module for FermerX
// Based on agricultural research data from Uzbekistan (2022-2024)

// Crop base yields in tons per hectare - from Uzbekistan agricultural statistics
const CROP_BASE_YIELDS = {
    // Don ekinlari (Grain crops)
    "Bug'doy": 5.0,      // Wheat: avg 4.5-7.0 t/ga
    "Sholi": 5.0,        // Rice: avg 4.2-5.4 t/ga
    "Makkajo'xori": 8.0, // Corn/Maize
    "Arpa": 4.0,         // Barley

    // Sabzavotlar (Vegetables)
    "Pomidor": 34,       // Tomato: avg 34-41 t/ga
    "Kartoshka": 25,     // Potato: avg 16-32 t/ga
    "Sabzi": 35,         // Carrot: avg 30-40 t/ga
    "Bodring": 30,       // Cucumber
    "Piyoz": 28,         // Onion
    "Qalampir": 25,      // Pepper

    // Poliz ekinlari (Industrial crops)
    "G'o'za": 3.4,       // Cotton: avg 3.4-3.5 t/ga
    "Kungaboqar": 2.8,   // Sunflower

    // Mevalar (Fruits)
    "Olma": 20,          // Apple
    "Uzum": 18,          // Grape
    "Anor": 15,          // Pomegranate

    // Default
    "DEFAULT": 5.0
};

// Irrigation impact coefficients (negative percentage per delay)
// Based on deficit irrigation meta-analysis studies
const IRRIGATION_IMPACT = {
    "Bug'doy": -0.07,      // Wheat: -7% per delay
    "Makkajo'xori": -0.19, // Corn: -19% per delay
    "G'o'za": -0.15,       // Cotton: -15%
    "Pomidor": -0.08,      // Tomato: -8%
    "Kartoshka": -0.14,    // Potato: -14%
    "DEFAULT": -0.10       // Default: -10%
};

// Fertilizer impact coefficients based on timing research
const FERTILIZER_IMPACT = {
    "EARLY_STAGE": -0.18,  // Critical growth: -18%
    "MID_STAGE": -0.12,    // Mid-season: -12%
    "LATE_STAGE": -0.05,   // Late season: -5%
    "DEFAULT": -0.12       // Default: -12%
};

// Soil quality multipliers based on soil fertility studies
const SOIL_MULTIPLIERS = {
    "Qora tuproq": 1.0,    // Black soil (baseline)
    "Loyli": 0.95,         // Loam
    "Gillitosh": 0.85,     // Clay
    "Qumli": 0.70,         // Sandy
    "Sho'r": 0.65,         // Saline
    "Boshqa": 0.90         // Other
};

/**
 * Get base yield for a specific crop
 * @param {string} cropName - Name of the crop
 * @returns {number} Base yield in tons/hectare
 */
export const getBaseYield = (cropName) => {
    return CROP_BASE_YIELDS[cropName] || CROP_BASE_YIELDS.DEFAULT;
};

/**
 * Get soil quality multiplier
 * @param {string} soilType - Type of soil
 * @returns {number} Multiplier (0.65-1.0)
 */
export const getSoilQualityMultiplier = (soilType) => {
    return SOIL_MULTIPLIERS[soilType] || SOIL_MULTIPLIERS["Boshqa"];
};

/**
 * Get irrigation impact coefficient for a crop
 * @param {string} cropName - Name of the crop
 * @returns {number} Negative coefficient
 */
export const getIrrigationCoefficient = (cropName) => {
    return IRRIGATION_IMPACT[cropName] || IRRIGATION_IMPACT.DEFAULT;
};

/**
 * Calculate number of days between two dates
 * @param {Date|string} date1 
 * @param {Date|string} date2 
 * @returns {number} Days difference
 */
const daysBetween = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
};

/**
 * Calculate irrigation impact on yield
 * @param {object} crop - Crop object with irrigation data
 * @returns {object} { impact: number, delayCount: number }
 */
export const getIrrigationImpact = (crop) => {
    if (!crop.irrigationDate || !crop.irrigationInterval) {
        return { impact: 0, delayCount: 0 };
    }

    const today = new Date();
    const scheduledDate = new Date(crop.irrigationDate);
    const interval = parseInt(crop.irrigationInterval) || 7; // Default 7 days
    const daysSinceScheduled = daysBetween(scheduledDate, today);

    if (daysSinceScheduled <= 0) {
        return { impact: 0, delayCount: 0 };
    }

    // Calculate how many times irrigation was delayed
    const delayCount = Math.floor(daysSinceScheduled / interval);

    if (delayCount === 0) {
        return { impact: 0, delayCount: 0 };
    }

    // Get crop-specific coefficient
    const coefficient = getIrrigationCoefficient(crop.name);
    const impact = coefficient * delayCount;

    return { impact, delayCount };
};

/**
 * Calculate fertilizer application impact on yield
 * @param {object} crop - Crop object with fertilizer data
 * @returns {object} { impact: number, delayCount: number, stage: string }
 */
export const getFertilizerImpact = (crop) => {
    if (!crop.fertilizerDate || !crop.fertilizerInterval) {
        return { impact: 0, delayCount: 0, stage: null };
    }

    const today = new Date();
    const scheduledDate = new Date(crop.fertilizerDate);
    const interval = parseInt(crop.fertilizerInterval) || 14; // Default 14 days
    const daysSinceScheduled = daysBetween(scheduledDate, today);

    if (daysSinceScheduled <= 0) {
        return { impact: 0, delayCount: 0, stage: null };
    }

    // Calculate how many times fertilization was delayed
    const delayCount = Math.floor(daysSinceScheduled / interval);

    if (delayCount === 0) {
        return { impact: 0, delayCount: 0, stage: null };
    }

    // Determine growth stage based on days since planting
    const plantDate = new Date(crop.plantDate);
    const daysSincePlanting = daysBetween(plantDate, today);

    let stage = 'MID_STAGE';
    let coefficient = FERTILIZER_IMPACT.MID_STAGE;

    if (daysSincePlanting < 30) {
        stage = 'EARLY_STAGE';
        coefficient = FERTILIZER_IMPACT.EARLY_STAGE;
    } else if (daysSincePlanting > 90) {
        stage = 'LATE_STAGE';
        coefficient = FERTILIZER_IMPACT.LATE_STAGE;
    }

    const impact = coefficient * delayCount;

    return { impact, delayCount, stage };
};

/**
 * Calculate expected yield for a crop
 * @param {object} crop - Crop object
 * @param {object} landData - Land data with soil type (optional)
 * @returns {number} Expected yield in tons
 */
export const calculateExpectedYield = (crop, landData = null) => {
    // Get base yield for the crop
    const baseYield = getBaseYield(crop.name);

    // Get soil quality multiplier
    const soilMultiplier = landData?.soilType
        ? getSoilQualityMultiplier(landData.soilType)
        : 1.0;

    // Get area
    const area = parseFloat(crop.area) || 0;

    // Calculate irrigation and fertilizer impacts
    const irrigationData = getIrrigationImpact(crop);
    const fertilizerData = getFertilizerImpact(crop);

    // Calculate total impact (negative values reduce yield)
    const totalImpact = 1 + irrigationData.impact + fertilizerData.impact;

    // Ensure impact doesn't go below 0.3 (30% of base yield minimum)
    const clampedImpact = Math.max(totalImpact, 0.3);

    // Calculate expected yield
    const expectedYield = baseYield * soilMultiplier * area * clampedImpact;

    return expectedYield;
};

/**
 * Calculate expected yield per hectare
 * @param {object} crop - Crop object
 * @param {object} landData - Land data with soil type (optional)
 * @returns {number} Expected yield per hectare in tons
 */
export const calculateYieldPerHectare = (crop, landData = null) => {
    const baseYield = getBaseYield(crop.name);
    const soilMultiplier = landData?.soilType
        ? getSoilQualityMultiplier(landData.soilType)
        : 1.0;

    const irrigationData = getIrrigationImpact(crop);
    const fertilizerData = getFertilizerImpact(crop);
    const totalImpact = 1 + irrigationData.impact + fertilizerData.impact;
    const clampedImpact = Math.max(totalImpact, 0.3);

    return baseYield * soilMultiplier * clampedImpact;
};

/**
 * Get yield health percentage (100% = optimal)
 * @param {object} crop - Crop object
 * @returns {number} Health percentage (30-100)
 */
export const getYieldHealth = (crop) => {
    const irrigationData = getIrrigationImpact(crop);
    const fertilizerData = getFertilizerImpact(crop);
    const totalImpact = 1 + irrigationData.impact + fertilizerData.impact;
    return Math.max(totalImpact * 100, 30);
};

/**
 * Generate warnings for delayed irrigation/fertilization
 * @param {object} crop - Crop object
 * @returns {array} Array of warning objects
 */
export const getYieldWarnings = (crop) => {
    const warnings = [];

    const irrigationData = getIrrigationImpact(crop);
    const fertilizerData = getFertilizerImpact(crop);

    // Irrigation warnings
    if (irrigationData.delayCount > 0) {
        const impactPercentage = Math.abs(irrigationData.impact * 100).toFixed(0);
        warnings.push({
            type: 'irrigation',
            icon: '💧',
            message: `Sug'orish ${irrigationData.delayCount} marta kechikdi → hosil -${impactPercentage}%`,
            impact: irrigationData.impact,
            severity: irrigationData.delayCount >= 2 ? 'high' : 'medium'
        });
    }

    // Fertilizer warnings
    if (fertilizerData.delayCount > 0) {
        const impactPercentage = Math.abs(fertilizerData.impact * 100).toFixed(0);
        warnings.push({
            type: 'fertilizer',
            icon: '🧪',
            message: `O'g'itlash ${fertilizerData.delayCount} marta kechikdi → hosil -${impactPercentage}%`,
            impact: fertilizerData.impact,
            severity: fertilizerData.delayCount >= 2 ? 'high' : 'medium'
        });
    }

    return warnings;
};
