// Excel Export Utility for FermerX Reports
// Uses SheetJS (xlsx) library to generate Excel files

import * as XLSX from 'xlsx';

/**
 * Format date for display
 * @param {Date|string} date 
 * @returns {string} Formatted date
 */
const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('uz-UZ');
};

/**
 * Format currency (Uzbek Som)
 * @param {number} value 
 * @returns {string} Formatted currency
 */
const formatCurrency = (value) => {
    if (!value) return '0';
    return parseFloat(value).toLocaleString('uz-UZ') + ' so\'m';
};

/**
 * Apply cell styling to worksheet
 * @param {Object} ws - Worksheet object
 * @param {Array} headerCells - Array of header cell addresses (e.g., ['A1', 'B1'])
 * @param {string} headerColor - Header background color
 */
const applyHeaderStyle = (ws, headerRow, startCol, endCol, headerColor = 'CCCCCC') => {
    if (!ws['!cols']) ws['!cols'] = [];

    for (let col = startCol.charCodeAt(0); col <= endCol.charCodeAt(0); col++) {
        const cellAddress = String.fromCharCode(col) + headerRow;
        if (ws[cellAddress]) {
            ws[cellAddress].s = {
                font: { bold: true, color: { rgb: 'FFFFFF' } },
                fill: { fgColor: { rgb: headerColor } },
                alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                border: {
                    top: { style: 'thin', color: { rgb: '000000' } },
                    bottom: { style: 'thin', color: { rgb: '000000' } },
                    left: { style: 'thin', color: { rgb: '000000' } },
                    right: { style: 'thin', color: { rgb: '000000' } }
                }
            };
        }
    }
};

/**
 * Set column widths automatically
 * @param {Object} ws - Worksheet object
 * @param {Array} data - Data array
 */
const setColumnWidths = (ws, data) => {
    const colWidths = [];

    data.forEach(row => {
        row.forEach((cell, colIndex) => {
            const cellLength = cell ? String(cell).length : 10;
            if (!colWidths[colIndex] || colWidths[colIndex] < cellLength) {
                colWidths[colIndex] = cellLength;
            }
        });
    });

    ws['!cols'] = colWidths.map(width => ({ wch: Math.min(width + 2, 50) }));
};

/**
 * Create summary worksheet
 * @param {Object} summary - Summary statistics
 * @param {Object} period - Report period
 * @returns {Object} Worksheet
 */
const createSummarySheet = (summary, period) => {
    const data = [
        ['📊 FERMERX HISOBOT - UMUMIY MA\'LUMOT'],
        [''],
        ['Davr:', `${formatDate(period.start)} - ${formatDate(period.end)}`],
        ['Yaratilgan:', formatDate(new Date())],
        [''],
        ['💰 MOLIYAVIY XULOSE'],
        ['Jami xarajatlar:', formatCurrency(summary.totalExpenses)],
        ['Jami daromadlar:', formatCurrency(summary.totalIncome)],
        ['Ombor sotuvlari:', formatCurrency(summary.warehouseRevenue)],
        ['Balans:', formatCurrency(summary.balance)],
        [''],
        ['🌾 EKINLAR MA\'LUMOTLARI'],
        ['Faol ekinlar soni:', summary.activeCrops],
        ['Jami yer maydoni:', summary.totalLand.toFixed(2) + ' ga'],
        ['Ishlatilgan yer:', summary.usedLand.toFixed(2) + ' ga'],
        ['Bo\'sh yer:', summary.availableLand.toFixed(2) + ' ga'],
        ['Taxminiy jami hosil:', summary.totalExpectedYield.toFixed(2) + ' t'],
        ['O\'rtacha hosildorlik:', summary.avgYieldPerHectare.toFixed(2) + ' t/ga'],
        [''],
        ['📦 OMBOR MA\'LUMOTLARI'],
        ['Faol mahsulotlar:', summary.warehouseItemCount],
        ['Sotishlar soni:', summary.warehouseSales],
        ['Ishlatishlar soni:', summary.warehouseUsage],
        [''],
        ['📊 XARAJATLAR TAQSIMOTI (TURI BO\'YICHA)'],
    ];

    // Add expense breakdown
    Object.entries(summary.expensesByType || {}).forEach(([type, amount]) => {
        data.push([type + ':', formatCurrency(amount)]);
    });

    data.push(['']);
    data.push(['📊 DAROMADLAR TAQSIMOTI (MANBA BO\'YICHA)']);

    // Add income breakdown
    Object.entries(summary.incomeBySource || {}).forEach(([source, amount]) => {
        data.push([source + ':', formatCurrency(amount)]);
    });

    data.push(['']);
    data.push(['📊 EKINLAR TAQSIMOTI (TUR BO\'YICHA)']);
    data.push(['Turi', 'Soni', 'Maydon (ga)', 'Taxminiy hosil (t)']);

    // Add crops breakdown
    Object.entries(summary.cropsByType || {}).forEach(([type, info]) => {
        data.push([
            type,
            info.count,
            info.area.toFixed(2),
            info.expectedYield.toFixed(2)
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    setColumnWidths(ws, data);

    return ws;
};

/**
 * Create crops worksheet
 * @param {Array} crops - Crops data
 * @returns {Object} Worksheet
 */
const createCropsSheet = (crops) => {
    const data = [
        ['🌾 EKINLAR HISOBOTI'],
        [''],
        ['Ekin nomi', 'Turi', 'Maydon (ga)', 'Ekilgan sana', 'Taxminiy hosil (t)', 'Hosildorlik (t/ga)', 'Xarajat (so\'m)', 'Izoh']
    ];

    crops.forEach(crop => {
        data.push([
            crop.name || '',
            crop.type || '',
            parseFloat(crop.area || 0).toFixed(2),
            formatDate(crop.plantDate),
            (crop.expectedYield || 0).toFixed(2),
            (crop.yieldPerHectare || 0).toFixed(2),
            formatCurrency(crop.cropExpenses || 0),
            crop.notes || ''
        ]);
    });

    // Add totals
    const totalArea = crops.reduce((sum, c) => sum + parseFloat(c.area || 0), 0);
    const totalYield = crops.reduce((sum, c) => sum + parseFloat(c.expectedYield || 0), 0);
    const totalExpenses = crops.reduce((sum, c) => sum + parseFloat(c.cropExpenses || 0), 0);

    data.push(['']);
    data.push(['JAMI:', '', totalArea.toFixed(2), '', totalYield.toFixed(2), '', formatCurrency(totalExpenses), '']);

    const ws = XLSX.utils.aoa_to_sheet(data);
    setColumnWidths(ws, data);
    return ws;
};

/**
 * Create expenses worksheet
 * @param {Array} expenses - Expenses data
 * @returns {Object} Worksheet
 */
const createExpensesSheet = (expenses) => {
    const data = [
        ['💸 XARAJATLAR HISOBOTI'],
        [''],
        ['Sana', 'Turi', 'Miqdor (so\'m)', 'Ekin nomi', 'Izoh']
    ];

    expenses.forEach(expense => {
        data.push([
            formatDate(expense.date),
            expense.type || '',
            formatCurrency(expense.amount),
            expense.cropName || '-',
            expense.notes || ''
        ]);
    });

    // Add total
    const total = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
    data.push(['']);
    data.push(['JAMI XARAJAT:', '', formatCurrency(total), '', '']);

    const ws = XLSX.utils.aoa_to_sheet(data);
    setColumnWidths(ws, data);
    return ws;
};

/**
 * Create income worksheet
 * @param {Array} income - Income data
 * @returns {Object} Worksheet
 */
const createIncomeSheet = (income) => {
    const data = [
        ['💰 DAROMADLAR HISOBOTI'],
        [''],
        ['Sana', 'Manba', 'Miqdor (so\'m)', 'Izoh']
    ];

    income.forEach(inc => {
        data.push([
            formatDate(inc.date),
            inc.source || '',
            formatCurrency(inc.amount),
            inc.notes || ''
        ]);
    });

    // Add total
    const total = income.reduce((sum, inc) => sum + parseFloat(inc.amount || 0), 0);
    data.push(['']);
    data.push(['JAMI DAROMAD:', '', formatCurrency(total), '']);

    const ws = XLSX.utils.aoa_to_sheet(data);
    setColumnWidths(ws, data);
    return ws;
};

/**
 * Create warehouse worksheet
 * @param {Array} warehouseHistory - Warehouse history data
 * @returns {Object} Worksheet
 */
const createWarehouseSheet = (warehouseHistory) => {
    const data = [
        ['📦 OMBOR HISOBOTI'],
        [''],
        ['Sana', 'Mahsulot', 'Kategoriya', 'Turi', 'Miqdor', 'Narx', 'Jami', 'Izoh']
    ];

    warehouseHistory.forEach(history => {
        const typeText = history.type === 'sale' ? 'Sotildi' :
            history.type === 'use' ? 'Ishlatildi' :
                history.type === 'add' ? 'Qo\'shildi' : 'Boshqa';

        data.push([
            formatDate(history.date),
            history.itemName || '',
            history.itemCategory || '',
            typeText,
            history.quantity || 0,
            history.price ? formatCurrency(history.price) : '-',
            history.totalPrice ? formatCurrency(history.totalPrice) : '-',
            history.notes || ''
        ]);
    });

    // Add totals
    const totalSales = warehouseHistory
        .filter(h => h.type === 'sale')
        .reduce((sum, h) => sum + parseFloat(h.totalPrice || 0), 0);

    data.push(['']);
    data.push(['JAMI SOTUVLAR:', '', '', '', '', '', formatCurrency(totalSales), '']);

    const ws = XLSX.utils.aoa_to_sheet(data);
    setColumnWidths(ws, data);
    return ws;
};

/**
 * Create land worksheet
 * @param {Array} land - Land data
 * @returns {Object} Worksheet
 */
const createLandSheet = (land) => {
    const data = [
        ['🏞️ YER MAYDONI HISOBOTI'],
        [''],
        ['Yer nomi', 'Jami maydon (ga)', 'Tuproq turi']
    ];

    land.forEach(l => {
        data.push([
            l.name || '',
            parseFloat(l.totalArea || 0).toFixed(2),
            l.soilType || ''
        ]);
    });

    // Add total
    const totalArea = land.reduce((sum, l) => sum + parseFloat(l.totalArea || 0), 0);
    data.push(['']);
    data.push(['JAMI MAYDON:', totalArea.toFixed(2), '']);

    const ws = XLSX.utils.aoa_to_sheet(data);
    setColumnWidths(ws, data);
    return ws;
};

/**
 * Export report data to Excel file using Blob
 * @param {Object} reportData - Complete report data
 * @param {string} filename - Optional custom filename
 */
export const exportToExcel = (reportData, filename) => {
    try {
        // Create a new workbook
        const wb = XLSX.utils.book_new();

        // Create worksheets
        const summarySheet = createSummarySheet(reportData.summary, reportData.period);
        const cropsSheet = createCropsSheet(reportData.crops);
        const expensesSheet = createExpensesSheet(reportData.expenses);
        const incomeSheet = createIncomeSheet(reportData.income);
        const warehouseSheet = createWarehouseSheet(reportData.warehouseHistory);
        const landSheet = createLandSheet(reportData.land);

        // Add worksheets to workbook
        XLSX.utils.book_append_sheet(wb, summarySheet, 'Umumiy');
        XLSX.utils.book_append_sheet(wb, cropsSheet, 'Ekinlar');
        XLSX.utils.book_append_sheet(wb, expensesSheet, 'Xarajatlar');
        XLSX.utils.book_append_sheet(wb, incomeSheet, 'Daromadlar');
        XLSX.utils.book_append_sheet(wb, warehouseSheet, 'Ombor');
        XLSX.utils.book_append_sheet(wb, landSheet, 'Yer maydoni');

        // Generate filename if not provided
        if (!filename) {
            const periodType = reportData.period.type === 'monthly' ? '1oy' : '1yil';
            const date = new Date().toISOString().split('T')[0];
            filename = `FermerX_Hisobot_${periodType}_${date}.xlsx`;
        }

        // Convert workbook to array buffer
        const wbout = XLSX.write(wb, {
            bookType: 'xlsx',
            type: 'array',
            bookSST: false,
            cellStyles: true
        });

        // Create blob from array buffer
        const blob = new Blob([wbout], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        // Create download link
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';

        // Add to DOM, trigger download, and cleanup
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Cleanup blob URL after a short delay
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 100);

        return { success: true, filename };
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Generate preview data for display (first few rows)
 * @param {Object} reportData 
 * @returns {Object} Preview data
 */
export const generatePreviewData = (reportData) => {
    return {
        recentExpenses: reportData.expenses.slice(0, 5),
        recentIncome: reportData.income.slice(0, 5),
        topCrops: reportData.crops
            .sort((a, b) => b.expectedYield - a.expectedYield)
            .slice(0, 5),
        summary: reportData.summary
    };
};
