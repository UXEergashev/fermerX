// CSV Export Utility for Google Sheets compatibility
// Creates CSV files that can be directly opened in Google Sheets

/**
 * Convert array of objects to CSV string
 * @param {Array} data - Array of objects
 * @param {Array} headers - Array of header labels
 * @returns {string} CSV string
 */
const arrayToCSV = (data, headers) => {
    const csvRows = [];

    // Add headers
    csvRows.push(headers.join(','));

    // Add data rows
    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header] || '';
            // Escape values that contain commas or quotes
            const escaped = String(value).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
};

/**
 * Format date for CSV
 */
const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('uz-UZ');
};

/**
 * Format currency for CSV
 */
const formatCurrency = (value) => {
    if (!value) return '0';
    return parseFloat(value).toLocaleString('uz-UZ');
};

/**
 * Export report to CSV (Google Sheets compatible)
 * @param {Object} reportData - Complete report data
 * @param {string} filename - Optional custom filename
 */
export const exportToCSV = (reportData) => {
    try {
        const period = reportData.period.type === 'monthly' ? '1oy' : '1yil';
        const date = new Date().toISOString().split('T')[0];

        // Create a comprehensive CSV with all data in one sheet
        const csvLines = [];

        // Title
        csvLines.push('FERMERX HISOBOT - UMUMIY MALUMOT');
        csvLines.push('');

        // Period info
        csvLines.push(`Davr:,${formatDate(reportData.period.start)} - ${formatDate(reportData.period.end)}`);
        csvLines.push(`Yaratilgan:,${formatDate(new Date())}`);
        csvLines.push('');

        // Financial Summary
        csvLines.push('MOLIYAVIY XULOSE');
        csvLines.push(`Jami xarajatlar:,${formatCurrency(reportData.summary.totalExpenses)} so'm`);
        csvLines.push(`Jami daromadlar:,${formatCurrency(reportData.summary.totalIncome)} so'm`);
        csvLines.push(`Ombor sotuvlari:,${formatCurrency(reportData.summary.warehouseRevenue)} so'm`);
        csvLines.push(`Balans:,${formatCurrency(reportData.summary.balance)} so'm`);
        csvLines.push('');

        // Crops Summary
        csvLines.push('EKINLAR MALUMOTLARI');
        csvLines.push(`Faol ekinlar soni:,${reportData.summary.activeCrops}`);
        csvLines.push(`Jami yer:,${reportData.summary.totalLand.toFixed(2)} ga`);
        csvLines.push(`Ishlatilgan yer:,${reportData.summary.usedLand.toFixed(2)} ga`);
        csvLines.push(`Bosh yer:,${reportData.summary.availableLand.toFixed(2)} ga`);
        csvLines.push(`Taxminiy hosil:,${reportData.summary.totalExpectedYield.toFixed(2)} t`);
        csvLines.push('');

        // Crops Details
        csvLines.push('EKINLAR ROYXATI');
        csvLines.push('Ekin nomi,Turi,Maydon (ga),Ekilgan sana,Taxminiy hosil (t),Hosildorlik (t/ga),Xarajat (som)');
        reportData.crops.forEach(crop => {
            csvLines.push([
                crop.name || '',
                crop.type || '',
                parseFloat(crop.area || 0).toFixed(2),
                formatDate(crop.plantDate),
                (crop.expectedYield || 0).toFixed(2),
                (crop.yieldPerHectare || 0).toFixed(2),
                formatCurrency(crop.cropExpenses || 0)
            ].join(','));
        });
        csvLines.push('');

        // Expenses
        csvLines.push('XARAJATLAR ROYXATI');
        csvLines.push('Sana,Turi,Miqdor (som),Ekin nomi,Izoh');
        reportData.expenses.forEach(expense => {
            csvLines.push([
                formatDate(expense.date),
                expense.type || '',
                formatCurrency(expense.amount),
                expense.cropName || '-',
                expense.notes || ''
            ].map(val => `"${val}"`).join(','));
        });
        csvLines.push('');

        // Income
        csvLines.push('DAROMADLAR ROYXATI');
        csvLines.push('Sana,Manba,Miqdor (som),Izoh');
        reportData.income.forEach(inc => {
            csvLines.push([
                formatDate(inc.date),
                inc.source || '',
                formatCurrency(inc.amount),
                inc.notes || ''
            ].map(val => `"${val}"`).join(','));
        });
        csvLines.push('');

        // Warehouse
        csvLines.push('OMBOR OPERATSIYALARI');
        csvLines.push('Sana,Mahsulot,Kategoriya,Turi,Miqdor,Narx,Jami,Izoh');
        reportData.warehouseHistory.forEach(history => {
            const typeText = history.type === 'sale' ? 'Sotildi' :
                history.type === 'use' ? 'Ishlatildi' :
                    history.type === 'add' ? 'Qoshildi' : 'Boshqa';

            csvLines.push([
                formatDate(history.date),
                history.itemName || '',
                history.itemCategory || '',
                typeText,
                history.quantity || 0,
                history.price ? formatCurrency(history.price) : '-',
                history.totalPrice ? formatCurrency(history.totalPrice) : '-',
                history.notes || ''
            ].map(val => `"${val}"`).join(','));
        });

        const csvContent = csvLines.join('\n');

        // Create blob with UTF-8 BOM for proper encoding
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

        // Create download link
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `FermerX_Hisobot_${period}_${date}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return { success: true, filename: `FermerX_Hisobot_${period}_${date}.csv` };
    } catch (error) {
        console.error('Error exporting to CSV:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Generate Google Sheets import instructions
 */
export const getGoogleSheetsInstructions = () => {
    return `
CSV faylni Google Sheets-ga import qilish:
1. Google Drive-ga kiring (drive.google.com)
2. "Yangi" > "Fayl yuklash" ni bosing
3. Yuklab olingan CSV faylni tanlang
4. Fayl yuklangandan keyin ustiga ikki marta bosing
5. Google Sheets avtomatik ochiladi
6. "File" > "Save as Google Sheets" ni tanlang

Yoki:
1. Google Sheets ochilsin (sheets.google.com)
2. "File" > "Import" ni bosing
3. "Upload" tab-ni tanlang
4. CSV faylni tanlang
5. Import qiling
    `.trim();
};
