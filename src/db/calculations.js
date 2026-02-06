import { getAllByUserId } from './operations';

// Calculate dashboard statistics
export const calculateDashboardStats = async (userId) => {
    try {
        const [lands, crops, warehouse, expenses, income] = await Promise.all([
            getAllByUserId('land', userId),
            getAllByUserId('crops', userId),
            getAllByUserId('warehouse', userId),
            getAllByUserId('expenses', userId),
            getAllByUserId('income', userId)
        ]);

        // Calculate land statistics
        const totalLandArea = lands.reduce((sum, land) => sum + (parseFloat(land.totalArea) || 0), 0);
        const plantedArea = crops.reduce((sum, crop) => sum + (parseFloat(crop.area) || 0), 0);
        const emptyLandArea = totalLandArea - plantedArea;

        // Count active crops
        const activeCropsCount = crops.length;

        // Count warehouse items
        const warehouseItemsCount = warehouse.filter(item => item.quantity > 0).length;

        // Calculate financial totals
        const totalExpenses = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
        const totalIncome = income.reduce((sum, inc) => sum + (parseFloat(inc.amount) || 0), 0);

        return {
            totalLandArea: totalLandArea.toFixed(2),
            plantedArea: plantedArea.toFixed(2),
            emptyLandArea: emptyLandArea.toFixed(2),
            activeCropsCount,
            warehouseItemsCount,
            totalExpenses: totalExpenses.toFixed(2),
            totalIncome: totalIncome.toFixed(2),
            balance: (totalIncome - totalExpenses).toFixed(2)
        };
    } catch (error) {
        console.error('Error calculating dashboard stats:', error);
        return {
            totalLandArea: 0,
            plantedArea: 0,
            emptyLandArea: 0,
            activeCropsCount: 0,
            warehouseItemsCount: 0,
            totalExpenses: 0,
            totalIncome: 0,
            balance: 0
        };
    }
};

// Calculate available land for new crops
export const calculateAvailableLand = async (userId) => {
    const lands = await getAllByUserId('land', userId);
    const crops = await getAllByUserId('crops', userId);

    const totalLand = lands.reduce((sum, land) => sum + (parseFloat(land.totalArea) || 0), 0);
    const usedLand = crops.reduce((sum, crop) => sum + (parseFloat(crop.area) || 0), 0);

    return totalLand - usedLand;
};

// Get land usage for each plot
export const getLandUsage = async (userId) => {
    const lands = await getAllByUserId('land', userId);
    const crops = await getAllByUserId('crops', userId);

    return lands.map(land => {
        const usedArea = crops
            .filter(crop => crop.landId === land.id)
            .reduce((sum, crop) => sum + (parseFloat(crop.area) || 0), 0);

        return {
            ...land,
            usedArea: usedArea.toFixed(2),
            emptyArea: (land.totalArea - usedArea).toFixed(2)
        };
    });
};
