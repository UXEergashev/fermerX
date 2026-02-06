import { getAllByUserId } from './operations';

/**
 * Analytics Engine - Foyda tahlili va hisobotlar uchun
 */

// Ekinlar bo'yicha foyda tahlili
export const calculateCropProfitAnalysis = async (userId) => {
    try {
        const [crops, expenses, income] = await Promise.all([
            getAllByUserId('crops', userId),
            getAllByUserId('expenses', userId),
            getAllByUserId('income', userId)
        ]);

        return crops.map(crop => {
            // Ekin bilan bog'liq xarajatlar (cropId bo'yicha yoki ekin nomidan foydalanib)
            const cropExpenses = expenses.filter(exp =>
                exp.cropId === crop.id ||
                (exp.notes && exp.notes.toLowerCase().includes(crop.name.toLowerCase()))
            );

            // Ekin bilan bog'liq daromadlar
            const cropIncome = income.filter(inc =>
                inc.cropId === crop.id ||
                (inc.source && inc.source.toLowerCase().includes(crop.name.toLowerCase()))
            );

            const totalExpenses = cropExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
            const totalIncome = cropIncome.reduce((sum, inc) => sum + parseFloat(inc.amount || 0), 0);
            const profit = totalIncome - totalExpenses;
            const profitPerHectare = crop.area > 0 ? profit / parseFloat(crop.area) : 0;
            const profitability = totalIncome > 0 ? ((profit / totalIncome) * 100) : (profit > 0 ? 100 : 0);

            return {
                id: crop.id,
                name: crop.name,
                area: parseFloat(crop.area) || 0,
                landId: crop.landId,
                totalExpenses,
                totalIncome,
                profit,
                profitPerHectare,
                profitability: profitability.toFixed(1),
                isProfitable: profit >= 0
            };
        });
    } catch (error) {
        console.error('Error calculating crop profit analysis:', error);
        return [];
    }
};

// Yerlar bo'yicha foyda tahlili
export const calculateLandProfitAnalysis = async (userId) => {
    try {
        const [lands, crops, expenses, income] = await Promise.all([
            getAllByUserId('land', userId),
            getAllByUserId('crops', userId),
            getAllByUserId('expenses', userId),
            getAllByUserId('income', userId)
        ]);

        return lands.map(land => {
            // Shu yerdagi ekinlar
            const landCrops = crops.filter(crop => crop.landId === land.id);
            const cropIds = landCrops.map(c => c.id);
            const cropNames = landCrops.map(c => c.name.toLowerCase());

            // Shu yer bilan bog'liq xarajatlar
            const landExpenses = expenses.filter(exp =>
                exp.landId === land.id ||
                cropIds.includes(exp.cropId) ||
                (exp.notes && cropNames.some(name => exp.notes.toLowerCase().includes(name)))
            );

            // Shu yer bilan bog'liq daromadlar
            const landIncome = income.filter(inc =>
                inc.landId === land.id ||
                cropIds.includes(inc.cropId) ||
                (inc.source && cropNames.some(name => inc.source.toLowerCase().includes(name)))
            );

            const totalExpenses = landExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
            const totalIncome = landIncome.reduce((sum, inc) => sum + parseFloat(inc.amount || 0), 0);
            const profit = totalIncome - totalExpenses;
            const profitPerHectare = land.totalArea > 0 ? profit / parseFloat(land.totalArea) : 0;

            return {
                id: land.id,
                name: land.name,
                totalArea: parseFloat(land.totalArea) || 0,
                cropsCount: landCrops.length,
                totalExpenses,
                totalIncome,
                profit,
                profitPerHectare,
                isProfitable: profit >= 0,
                isLosing: profit < 0
            };
        });
    } catch (error) {
        console.error('Error calculating land profit analysis:', error);
        return [];
    }
};

// Eng foydali ekinlar
export const getTopProfitableCrops = async (userId, limit = 5) => {
    const cropAnalysis = await calculateCropProfitAnalysis(userId);
    return cropAnalysis
        .filter(crop => crop.profit > 0)
        .sort((a, b) => b.profit - a.profit)
        .slice(0, limit);
};

// Zarar keltirayotgan yerlar
export const getLosingLands = async (userId) => {
    const landAnalysis = await calculateLandProfitAnalysis(userId);
    return landAnalysis.filter(land => land.profit < 0);
};

// Mavsumiy trend - oxirgi 12 oy
export const getSeasonalTrends = async (userId, months = 12) => {
    try {
        const [expenses, income] = await Promise.all([
            getAllByUserId('expenses', userId),
            getAllByUserId('income', userId)
        ]);

        const now = new Date();
        const trends = [];

        const monthNames = [
            'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
            'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
        ];

        for (let i = months - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const month = date.getMonth();
            const year = date.getFullYear();

            // Shu oydagi xarajatlar
            const monthExpenses = expenses.filter(exp => {
                const expDate = new Date(exp.date);
                return expDate.getMonth() === month && expDate.getFullYear() === year;
            });

            // Shu oydagi daromadlar
            const monthIncome = income.filter(inc => {
                const incDate = new Date(inc.date);
                return incDate.getMonth() === month && incDate.getFullYear() === year;
            });

            const totalExpenses = monthExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
            const totalIncome = monthIncome.reduce((sum, inc) => sum + parseFloat(inc.amount || 0), 0);
            const profit = totalIncome - totalExpenses;

            trends.push({
                month: `${monthNames[month]} ${year}`,
                shortMonth: monthNames[month].slice(0, 3),
                expenses: totalExpenses,
                income: totalIncome,
                profit: profit
            });
        }

        return trends;
    } catch (error) {
        console.error('Error calculating seasonal trends:', error);
        return [];
    }
};

// Umumiy tahlil xulosasi
export const getAnalyticsSummary = async (userId) => {
    try {
        const [cropAnalysis, landAnalysis, trends] = await Promise.all([
            calculateCropProfitAnalysis(userId),
            calculateLandProfitAnalysis(userId),
            getSeasonalTrends(userId, 12)
        ]);

        const totalProfit = cropAnalysis.reduce((sum, crop) => sum + crop.profit, 0);
        const totalIncome = cropAnalysis.reduce((sum, crop) => sum + crop.totalIncome, 0);
        const totalExpenses = cropAnalysis.reduce((sum, crop) => sum + crop.totalExpenses, 0);

        const profitableCrops = cropAnalysis.filter(c => c.isProfitable);
        const losingCrops = cropAnalysis.filter(c => !c.isProfitable);
        const profitableLands = landAnalysis.filter(l => l.isProfitable);
        const losingLands = landAnalysis.filter(l => l.isLosing);

        const topCrop = cropAnalysis.length > 0
            ? cropAnalysis.reduce((a, b) => a.profit > b.profit ? a : b)
            : null;

        const worstLand = landAnalysis.length > 0
            ? landAnalysis.reduce((a, b) => a.profit < b.profit ? a : b)
            : null;

        return {
            totalProfit,
            totalIncome,
            totalExpenses,
            profitableCropsCount: profitableCrops.length,
            losingCropsCount: losingCrops.length,
            profitableLandsCount: profitableLands.length,
            losingLandsCount: losingLands.length,
            topCrop: topCrop ? { name: topCrop.name, profit: topCrop.profit } : null,
            worstLand: worstLand && worstLand.profit < 0
                ? { name: worstLand.name, loss: Math.abs(worstLand.profit) }
                : null,
            monthlyTrend: trends.slice(-3) // Oxirgi 3 oy
        };
    } catch (error) {
        console.error('Error getting analytics summary:', error);
        return {
            totalProfit: 0,
            totalIncome: 0,
            totalExpenses: 0,
            profitableCropsCount: 0,
            losingCropsCount: 0,
            profitableLandsCount: 0,
            losingLandsCount: 0,
            topCrop: null,
            worstLand: null,
            monthlyTrend: []
        };
    }
};
