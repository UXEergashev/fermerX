import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { generateMonthlyReport, generateYearlyReport } from '../db/reports';
import { exportToExcel, generatePreviewData } from '../utils/excelExport';
import { exportToCSV } from '../utils/csvExport';
import {
    BarChart3,
    Calendar,
    CalendarDays,
    Download,
    FileSpreadsheet,
    PieChart,
    Wallet,
    Receipt,
    CircleDollarSign,
    Box,
    Sprout,
    Map as MapIcon,
    LayoutDashboard,
    ArrowUpCircle,
    ArrowDownCircle,
    Store,
    Lightbulb
} from 'lucide-react';

const Reports = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState('monthly');
    const [reportData, setReportData] = useState(null);
    const [previewData, setPreviewData] = useState(null);

    const generateReport = async (type) => {
        setLoading(true);
        setSelectedPeriod(type);

        try {
            const data = type === 'monthly'
                ? await generateMonthlyReport(user.id)
                : await generateYearlyReport(user.id);

            setReportData(data);
            setPreviewData(generatePreviewData(data));
        } catch (error) {
            console.error('Error generating report:', error);
            alert(t('reports.preparingError') || 'Hisobot yaratishda xatolik yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadExcel = () => {
        if (!reportData) {
            alert(t('reports.startHint'));
            return;
        }

        const result = exportToExcel(reportData);

        if (result.success) {
            alert(`✅ Excel fayl yuklab olindi: ${result.filename}`);
        } else {
            alert(`❌ ${t('common.error') || 'Error'}: ${result.error}`);
        }
    };

    const handleDownloadCSV = () => {
        if (!reportData) {
            alert('Avval hisobot yarating');
            return;
        }

        const result = exportToCSV(reportData);

        if (result.success) {
            alert(`✅ CSV fayl yuklab olindi: ${result.filename}\n\n📊 Google Sheets:\n1. Google Drive\n2. Upload\n3. ${t('reports.googleSheetsHint')}`);
        } else {
            alert(`❌ ${t('common.error') || 'Error'}: ${result.error}`);
        }
    };

    return (
        <div>
            <div style={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="icon-container icon-primary">
                        <BarChart3 size={24} />
                    </div>
                    <h1 style={{ margin: 0 }}>{t('reports.title')}</h1>
                </div>
            </div>

            {/* Period Selection */}
            <div style={styles.periodSelector}>
                <button
                    onClick={() => generateReport('monthly')}
                    className={`btn ${selectedPeriod === 'monthly' ? 'btn-primary' : 'btn-outline'}`}
                    disabled={loading}
                    style={{ flex: 1, gap: '0.5rem' }}
                >
                    <CalendarDays size={18} /> {t('reports.monthlyReport')}
                </button>
                <button
                    onClick={() => generateReport('yearly')}
                    className={`btn ${selectedPeriod === 'yearly' ? 'btn-primary' : 'btn-outline'}`}
                    disabled={loading}
                    style={{ flex: 1, gap: '0.5rem' }}
                >
                    <Calendar size={18} /> {t('reports.yearlyReport')}
                </button>
            </div>

            {loading && (
                <div className="spinner-container">
                    <div className="spinner"></div>
                    <p>{t('reports.preparing')}</p>
                </div>
            )}

            {previewData && !loading && (
                <>
                    {/* Summary Cards */}
                    <div style={styles.summarySection}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <div className="icon-container icon-secondary" style={{ padding: '8px' }}>
                                <LayoutDashboard size={20} />
                            </div>
                            <h2 style={{ ...styles.sectionTitle, margin: 0 }}>{t('reports.generalInfo')}</h2>
                        </div>
                        <div className="grid grid-2">
                            <SummaryCard
                                icon={<CircleDollarSign size={24} />}
                                variant="primary"
                                title={t('common.totalIncome')}
                                value={formatCurrency(previewData.summary.totalIncome)}
                                color="#10b981"
                            />
                            <SummaryCard
                                icon={<Receipt size={24} />}
                                variant="danger"
                                title={t('common.totalExpenses')}
                                value={formatCurrency(previewData.summary.totalExpenses)}
                                color="#ef4444"
                            />
                            <SummaryCard
                                icon={<Wallet size={24} />}
                                variant={previewData.summary.balance >= 0 ? "primary" : "danger"}
                                title={t('dashboard.balance')}
                                value={formatCurrency(previewData.summary.balance)}
                                color={previewData.summary.balance >= 0 ? '#10b981' : '#ef4444'}
                            />
                            <SummaryCard
                                icon={<Store size={24} />}
                                variant="secondary"
                                title={t('reports.warehouseSales')}
                                value={formatCurrency(previewData.summary.warehouseRevenue)}
                                color="#3b82f6"
                            />
                            <SummaryCard
                                icon={<Sprout size={24} />}
                                variant="purple"
                                title={t('dashboard.activeCrops')}
                                value={previewData.summary.activeCrops}
                                color="#8b5cf6"
                            />
                            <SummaryCard
                                icon={<MapIcon size={24} />}
                                variant="warning"
                                title={t('dashboard.totalLand')}
                                value={`${previewData.summary.totalLand.toFixed(2)} ga`}
                                color="#f59e0b"
                            />
                            <SummaryCard
                                icon={<BarChart3 size={24} />}
                                variant="teal"
                                title={t('common.expectedYield')}
                                value={`${previewData.summary.totalExpectedYield.toFixed(2)} t`}
                                color="#14b8a6"
                            />
                            <SummaryCard
                                icon={<Box size={24} />}
                                variant="pink"
                                title={t('dashboard.warehouseItems')}
                                value={previewData.summary.warehouseItemCount}
                                color="#ec4899"
                            />
                        </div>
                    </div>

                    {/* Top Crops */}
                    {previewData.topCrops.length > 0 && (
                        <div style={styles.section}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <div className="icon-container icon-primary" style={{ padding: '6px' }}>
                                    <Sprout size={18} />
                                </div>
                                <h2 style={{ ...styles.sectionTitle, margin: 0 }}>{t('reports.topCrops')}</h2>
                            </div>
                            <div className="card">
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>{t('crops.cropName')}</th>
                                            <th>{t('crops.area')}</th>
                                            <th>{t('common.expectedYield')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.topCrops.map((crop, index) => (
                                            <tr key={index}>
                                                <td>{crop.name}</td>
                                                <td>{parseFloat(crop.area).toFixed(2)} ga</td>
                                                <td style={{ fontWeight: '600', color: '#10b981' }}>
                                                    {crop.expectedYield.toFixed(2)} t
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Recent Expenses */}
                    {previewData.recentExpenses.length > 0 && (
                        <div style={styles.section}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <div className="icon-container icon-danger" style={{ padding: '6px' }}>
                                    <ArrowDownCircle size={18} />
                                </div>
                                <h2 style={{ ...styles.sectionTitle, margin: 0 }}>{t('reports.recentExpenses')}</h2>
                            </div>
                            <div className="card">
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>{t('common.date')}</th>
                                            <th>{t('finance.category')}</th>
                                            <th>{t('common.amount')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.recentExpenses.map((expense, index) => (
                                            <tr key={index}>
                                                <td>{formatDate(expense.date)}</td>
                                                <td>{expense.type}</td>
                                                <td style={{ fontWeight: '600', color: '#ef4444' }}>
                                                    {formatCurrency(expense.amount)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Recent Income */}
                    {previewData.recentIncome.length > 0 && (
                        <div style={styles.section}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <div className="icon-container icon-primary" style={{ padding: '6px' }}>
                                    <ArrowUpCircle size={18} />
                                </div>
                                <h2 style={{ ...styles.sectionTitle, margin: 0 }}>{t('reports.recentIncome')}</h2>
                            </div>
                            <div className="card">
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>{t('common.date')}</th>
                                            <th>{t('finance.category')}</th>
                                            <th>{t('common.amount')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.recentIncome.map((income, index) => (
                                            <tr key={index}>
                                                <td>{formatDate(income.date)}</td>
                                                <td>{income.source}</td>
                                                <td style={{ fontWeight: '600', color: '#10b981' }}>
                                                    {formatCurrency(income.amount)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Download Section */}
                    <div style={styles.downloadSection}>
                        <div className="card" style={styles.downloadCard}>
                            <div style={styles.downloadContent}>
                                <div className="icon-container" style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '1.5rem', borderRadius: '1rem' }}>
                                    <Download size={48} />
                                </div>
                                <div>
                                    <h3 style={styles.downloadTitle}>{t('reports.downloadFullReport')}</h3>
                                    <p style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                                        {t('reports.fullReportDesc')}
                                    </p>
                                    <p className="text-small" style={{ marginTop: '0.5rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                                        <BarChart3 size={12} /> {t('reports.reportSections')}
                                    </p>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1rem' }}>
                                <button
                                    onClick={handleDownloadExcel}
                                    className="btn"
                                    style={styles.downloadButton}
                                >
                                    <FileSpreadsheet size={18} /> {t('reports.exportExcel')}
                                </button>
                                <button
                                    onClick={handleDownloadCSV}
                                    className="btn"
                                    style={{ ...styles.downloadButton, background: '#22c55e', color: 'white' }}
                                >
                                    <BarChart3 size={18} /> Google Sheets (CSV)
                                </button>
                            </div>
                            <p className="text-small" style={{ marginTop: '1rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                                <Lightbulb size={12} /> {t('reports.googleSheetsHint')}
                            </p>
                        </div>
                    </div>

                    {/* Report Info */}
                    <div style={styles.reportInfo}>
                        <p className="text-muted text-small">
                            📅 {t('reports.reportPeriod')}: {formatDate(reportData.period.start)} - {formatDate(reportData.period.end)}
                        </p>
                        <p className="text-muted text-small">
                            🕐 {t('reports.created')}: {formatDate(reportData.generatedAt)}
                        </p>
                    </div>
                </>
            )}

            {!reportData && !loading && (
                <div className="empty-state">
                    <div className="icon-container icon-primary" style={{ padding: '2rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
                        <BarChart3 size={48} />
                    </div>
                    <div className="empty-state-text">
                        {t('reports.startHint')}
                    </div>
                    <p className="text-muted text-small" style={{ marginTop: '1rem', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
                        {t('reports.startDesc')}
                    </p>
                </div>
            )}
        </div>
    );
};

// Summary Card Component
const SummaryCard = ({ icon, title, value, color, variant }) => (
    <div className="card" style={{ ...styles.summaryCard, borderLeft: `4px solid ${color}` }}>
        <div className={`icon-container icon-${variant}`} style={{ padding: '10px' }}>
            {icon}
        </div>
        <div>
            <div className="text-muted text-small" style={{ fontWeight: '500' }}>{title}</div>
            <div style={{ ...styles.cardValue, color }}>{value}</div>
        </div>
    </div>
);

// Helper functions
const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('uz-UZ');
};

const formatCurrency = (value) => {
    if (!value) return '0 so\'m';
    return parseFloat(value).toLocaleString('uz-UZ') + ' so\'m';
};

// Styles
const styles = {
    header: {
        marginBottom: '1.5rem'
    },
    periodSelector: {
        display: 'flex',
        gap: '1rem',
        marginBottom: '2rem'
    },
    summarySection: {
        marginBottom: '2rem'
    },
    sectionTitle: {
        fontSize: '1.25rem',
        fontWeight: '600',
        marginBottom: '1rem',
        color: 'var(--text-main)'
    },
    summaryCard: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1.25rem'
    },
    cardIcon: {
        fontSize: '2rem'
    },
    cardValue: {
        fontSize: '1.5rem',
        fontWeight: '700',
        marginTop: '0.25rem'
    },
    section: {
        marginBottom: '2rem'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse'
    },
    downloadSection: {
        marginTop: '2rem',
        marginBottom: '2rem'
    },
    downloadCard: {
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
        color: 'white',
        padding: '2rem',
        borderRadius: 'var(--radius-lg)'
    },
    downloadContent: {
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        marginBottom: '1.5rem'
    },
    downloadIcon: {
        fontSize: '3rem'
    },
    downloadTitle: {
        fontSize: '1.5rem',
        fontWeight: '700',
        marginBottom: '0.5rem',
        color: 'white'
    },
    downloadButton: {
        width: '100%',
        padding: '1rem',
        fontSize: '1.125rem',
        fontWeight: '600',
        background: 'white',
        color: 'var(--primary)',
        border: 'none'
    },
    reportInfo: {
        textAlign: 'center',
        padding: '1rem',
        borderTop: '1px solid var(--border)',
        marginTop: '2rem'
    }
};

export default Reports;
