import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
    calculateCropProfitAnalysis,
    calculateLandProfitAnalysis,
    getSeasonalTrends,
    getAnalyticsSummary
} from '../db/analytics';
import { getAllByUserId } from '../db/operations';
import { getYieldAnalysisForAllCrops } from '../db/yieldPrediction';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, Cell, PieChart as RechartsPieChart, Pie,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
    PieChart,
    LayoutDashboard,
    Sprout,
    Map as MapIcon,
    TrendingUp,
    CircleDollarSign,
    Receipt,
    Wallet,
    Trophy,
    AlertTriangle,
    BarChart3,
    ArrowUpCircle,
    ArrowDownCircle,
    Leaf,
    FlaskConical,
    Droplets,
    Sun,
    Bug,
    Tractor,
    Wheat,
    Info
} from 'lucide-react';

const Analytics = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [summary, setSummary] = useState(null);
    const [cropData, setCropData] = useState([]);
    const [landData, setLandData] = useState([]);
    const [trendData, setTrendData] = useState([]);
    const [yieldData, setYieldData] = useState([]);
    const [selectedCropYield, setSelectedCropYield] = useState(null);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        setLoading(true);
        try {
            const [summaryData, crops, lands, trends, allCrops, allLands] = await Promise.all([
                getAnalyticsSummary(user.id),
                calculateCropProfitAnalysis(user.id),
                calculateLandProfitAnalysis(user.id),
                getSeasonalTrends(user.id, 12),
                getAllByUserId('crops', user.id),
                getAllByUserId('land', user.id)
            ]);

            setSummary(summaryData);
            setCropData(crops);
            setLandData(lands);
            setTrendData(trends);

            // Hosildorlik tahlili
            const yieldAnalysis = getYieldAnalysisForAllCrops(allCrops, allLands);
            setYieldData(yieldAnalysis);
            if (yieldAnalysis.length > 0) setSelectedCropYield(yieldAnalysis[0]);
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="spinner-container">
                <div className="spinner"></div>
                <p>{t('common.loading')}</p>
            </div>
        );
    }

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('uz-UZ').format(value);
    };

    const tabs = [
        { id: 'overview', label: t('analytics.overview'), icon: <LayoutDashboard size={18} /> },
        { id: 'crops', label: t('nav.crops'), icon: <Sprout size={18} /> },
        { id: 'lands', label: t('nav.land'), icon: <MapIcon size={18} /> },
        { id: 'trends', label: t('analytics.trends'), icon: <TrendingUp size={18} /> },
        { id: 'yield', label: 'Hosil Pragnozi', icon: <Wheat size={18} /> }
    ];

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div className="icon-container icon-primary">
                    <PieChart size={24} />
                </div>
                <h1 style={{ margin: 0 }}>{t('analytics.title')}</h1>
            </div>

            {/* Tab Navigation */}
            <div style={styles.tabs}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            ...styles.tab,
                            ...(activeTab === tab.id ? styles.activeTab : {}),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div>
                    <div className="grid grid-2 mb-lg">
                        <SummaryCard
                            icon={<Wallet size={24} />}
                            variant="primary"
                            title={t('analytics.profit')}
                            value={formatCurrency(summary?.totalProfit || 0)}
                            unit={t('common.sum')}
                            color={summary?.totalProfit >= 0 ? '#10b981' : '#ef4444'}
                        />
                        <SummaryCard
                            icon={<CircleDollarSign size={24} />}
                            variant="primary"
                            title={t('common.totalIncome')}
                            value={formatCurrency(summary?.totalIncome || 0)}
                            unit={t('common.sum')}
                            color="#3b82f6"
                        />
                        <SummaryCard
                            icon={<Receipt size={24} />}
                            variant="warning"
                            title={t('common.totalExpenses')}
                            value={formatCurrency(summary?.totalExpenses || 0)}
                            unit={t('common.sum')}
                            color="#f59e0b"
                        />
                        <SummaryCard
                            icon={<Sprout size={24} />}
                            variant="secondary"
                            title={t('common.profitableCrops')}
                            value={summary?.profitableCropsCount || 0}
                            unit="ta"
                            color="#10b981"
                        />
                    </div>

                    {/* Top Performer & Worst */}
                    <div className="grid grid-2 mb-lg">
                        {summary?.topCrop && (
                            <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                    <div className="icon-container icon-primary" style={{ padding: '6px' }}>
                                        <Trophy size={18} />
                                    </div>
                                    <h3 style={{ ...styles.cardTitle, margin: 0 }}>{t('analytics.mostProfitable')}</h3>
                                </div>
                                <div style={styles.highlightName}>{summary.topCrop.name}</div>
                                <div style={{ color: '#10b981', fontSize: '1.5rem', fontWeight: '700' }}>
                                    +{formatCurrency(summary.topCrop.profit)} {t('common.sum')}
                                </div>
                            </div>
                        )}
                        {summary?.worstLand && (
                            <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                    <div className="icon-container icon-danger" style={{ padding: '6px' }}>
                                        <AlertTriangle size={18} />
                                    </div>
                                    <h3 style={{ ...styles.cardTitle, margin: 0 }}>{t('analytics.leastProfitable')}</h3>
                                </div>
                                <div style={styles.highlightName}>{summary.worstLand.name}</div>
                                <div style={{ color: '#ef4444', fontSize: '1.5rem', fontWeight: '700' }}>
                                    -{formatCurrency(summary.worstLand.loss)} {t('common.sum')}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Mini Trend Chart */}
                    {trendData.length > 0 && (
                        <div className="card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <div className="icon-container icon-secondary" style={{ padding: '6px' }}>
                                    <TrendingUp size={18} />
                                </div>
                                <h3 style={{ ...styles.cardTitle, margin: 0 }}>{t('analytics.last12MonthsDynamics')}</h3>
                            </div>
                            <div style={{ height: '300px', marginTop: '1rem' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis dataKey="shortMonth" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip
                                            formatter={(value) => [formatCurrency(value) + " so'm", '']}
                                            labelFormatter={(label) => `Oy: ${label}`}
                                        />
                                        <Legend />
                                        <Line type="monotone" dataKey="income" name={t('finance.income')} stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                                        <Line type="monotone" dataKey="expenses" name={t('finance.expenses')} stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                                        <Line type="monotone" dataKey="profit" name={t('analytics.profit')} stroke="#3b82f6" strokeWidth={3} dot={{ r: 5 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Crops Tab */}
            {activeTab === 'crops' && (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div className="icon-container icon-primary" style={{ padding: '8px' }}>
                            <Sprout size={20} />
                        </div>
                        <h2 style={{ ...styles.sectionTitle, margin: 0 }}>{t('analytics.profitAnalysisByCrops')}</h2>
                    </div>

                    {cropData.length > 0 ? (
                        <>
                            <div className="card mb-lg">
                                <h3 style={styles.cardTitle}>{t('analytics.cropProfitability')}</h3>
                                <div style={{ height: '350px', marginTop: '1rem' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={cropData} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis type="number" tick={{ fontSize: 12 }} />
                                            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                            <Tooltip formatter={(value) => [formatCurrency(value) + " " + t('common.sum'), t('analytics.profit')]} />
                                            <Bar dataKey="profit" name={t('analytics.profit')}>
                                                {cropData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="card">
                                <h3 style={styles.cardTitle}>{t('analytics.detailedData')}</h3>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>{t('crops.cropName')}</th>
                                                <th>{t('crops.area')}</th>
                                                <th>{t('finance.income')}</th>
                                                <th>{t('finance.expenses')}</th>
                                                <th>{t('analytics.profit')}</th>
                                                <th>{t('analytics.profitPerHa')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cropData.map(crop => (
                                                <tr key={crop.id}>
                                                    <td style={{ fontWeight: '600' }}>
                                                        {crop.isProfitable ? '✅' : '❌'} {crop.name}
                                                    </td>
                                                    <td>{crop.area.toFixed(2)} ga</td>
                                                    <td style={{ color: '#10b981' }}>{formatCurrency(crop.totalIncome)}</td>
                                                    <td style={{ color: '#ef4444' }}>{formatCurrency(crop.totalExpenses)}</td>
                                                    <td style={{ color: crop.profit >= 0 ? '#10b981' : '#ef4444', fontWeight: '700' }}>
                                                        {crop.profit >= 0 ? '+' : ''}{formatCurrency(crop.profit)}
                                                    </td>
                                                    <td>{formatCurrency(crop.profitPerHectare)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="empty-state">
                            <div className="icon-container icon-primary" style={{ padding: '2rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
                                <Sprout size={48} />
                            </div>
                            <div className="empty-state-text">{t('analytics.noDataYet')}</div>
                        </div>
                    )}
                </div>
            )}

            {/* Lands Tab */}
            {activeTab === 'lands' && (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div className="icon-container icon-primary" style={{ padding: '8px' }}>
                            <MapIcon size={20} />
                        </div>
                        <h2 style={{ ...styles.sectionTitle, margin: 0 }}>{t('analytics.landsAnalysis')}</h2>
                    </div>

                    {landData.length > 0 ? (
                        <>
                            <div className="card mb-lg">
                                <h3 style={styles.cardTitle}>{t('analytics.landProfitability')}</h3>
                                <div style={{ height: '350px', marginTop: '1rem' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={landData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                            <YAxis tick={{ fontSize: 12 }} />
                                            <Tooltip formatter={(value) => [formatCurrency(value) + " " + t('common.sum'), t('analytics.profit')]} />
                                            <Bar dataKey="profit" name={t('analytics.profit')}>
                                                {landData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="grid grid-2 mb-lg">
                                <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div className="icon-container icon-primary" style={{ padding: '6px' }}><ArrowUpCircle size={16} /></div>
                                        <div style={styles.statLabel}>{t('common.profitableLands')}</div>
                                    </div>
                                    <div style={{ ...styles.statValue, color: '#10b981' }}>{landData.filter(l => l.isProfitable).length} ta</div>
                                </div>
                                <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div className="icon-container icon-danger" style={{ padding: '6px' }}><ArrowDownCircle size={16} /></div>
                                        <div style={styles.statLabel}>{t('common.losingLands')}</div>
                                    </div>
                                    <div style={{ ...styles.statValue, color: '#ef4444' }}>{landData.filter(l => l.isLosing).length} ta</div>
                                </div>
                            </div>

                            <div className="card">
                                <h3 style={styles.cardTitle}>{t('analytics.detailedData')}</h3>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>{t('land.landName')}</th>
                                                <th>{t('land.landArea')}</th>
                                                <th>{t('nav.crops')}</th>
                                                <th>{t('finance.income')}</th>
                                                <th>{t('finance.expenses')}</th>
                                                <th>{t('analytics.profit')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {landData.map(land => (
                                                <tr key={land.id} style={land.isLosing ? { background: '#fef2f2' } : {}}>
                                                    <td style={{ fontWeight: '600' }}>{land.isProfitable ? '✅' : '❌'} {land.name}</td>
                                                    <td>{land.totalArea.toFixed(2)} ga</td>
                                                    <td>{land.cropsCount} ta</td>
                                                    <td style={{ color: '#10b981' }}>{formatCurrency(land.totalIncome)}</td>
                                                    <td style={{ color: '#ef4444' }}>{formatCurrency(land.totalExpenses)}</td>
                                                    <td style={{ color: land.profit >= 0 ? '#10b981' : '#ef4444', fontWeight: '700' }}>
                                                        {land.profit >= 0 ? '+' : ''}{formatCurrency(land.profit)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="empty-state">
                            <div className="icon-container icon-primary" style={{ padding: '2rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
                                <MapIcon size={48} />
                            </div>
                            <div className="empty-state-text">{t('analytics.noDataYet')}</div>
                        </div>
                    )}
                </div>
            )}

            {/* Trends Tab */}
            {activeTab === 'trends' && (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div className="icon-container icon-primary" style={{ padding: '8px' }}>
                            <TrendingUp size={20} />
                        </div>
                        <h2 style={{ ...styles.sectionTitle, margin: 0 }}>{t('analytics.seasonalDynamics')}</h2>
                    </div>

                    {trendData.length > 0 ? (
                        <>
                            <div className="card mb-lg">
                                <h3 style={styles.cardTitle}>{t('analytics.last12MonthsDynamics')}</h3>
                                <div style={{ height: '400px', marginTop: '1rem' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={trendData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis dataKey="shortMonth" tick={{ fontSize: 12 }} />
                                            <YAxis tick={{ fontSize: 12 }} />
                                            <Tooltip formatter={(value) => [formatCurrency(value) + " so'm", '']} />
                                            <Legend />
                                            <Line type="monotone" dataKey="income" name={t('finance.income')} stroke="#10b981" strokeWidth={3} dot={{ r: 6, fill: '#10b981' }} activeDot={{ r: 8 }} />
                                            <Line type="monotone" dataKey="expenses" name={t('finance.expenses')} stroke="#ef4444" strokeWidth={3} dot={{ r: 6, fill: '#ef4444' }} activeDot={{ r: 8 }} />
                                            <Line type="monotone" dataKey="profit" name={t('analytics.profit')} stroke="#3b82f6" strokeWidth={4} dot={{ r: 7, fill: '#3b82f6' }} activeDot={{ r: 10 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="card">
                                <h3 style={styles.cardTitle}>{t('analytics.monthlyData')}</h3>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>{t('analytics.month')}</th>
                                                <th>{t('finance.income')}</th>
                                                <th>{t('finance.expenses')}</th>
                                                <th>{t('analytics.profit')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {trendData.map((month, index) => (
                                                <tr key={index}>
                                                    <td style={{ fontWeight: '600' }}>{month.month}</td>
                                                    <td style={{ color: '#10b981' }}>{formatCurrency(month.income)} so'm</td>
                                                    <td style={{ color: '#ef4444' }}>{formatCurrency(month.expenses)} so'm</td>
                                                    <td style={{ color: month.profit >= 0 ? '#10b981' : '#ef4444', fontWeight: '700' }}>
                                                        {month.profit >= 0 ? '+' : ''}{formatCurrency(month.profit)} so'm
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="empty-state">
                            <div className="icon-container icon-primary" style={{ padding: '2rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
                                <TrendingUp size={48} />
                            </div>
                            <div className="empty-state-text">{t('analytics.noDataAvailable')}</div>
                            <p className="text-muted">{t('analytics.analysisHint')}</p>
                        </div>
                    )}
                </div>
            )}

            {/* ============================================ */}
            {/* YANGI: HOSIL PRAGNOZI TAB                   */}
            {/* ============================================ */}
            {activeTab === 'yield' && (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <div className="icon-container icon-primary" style={{ padding: '8px' }}>
                            <Wheat size={20} />
                        </div>
                        <h2 style={{ ...styles.sectionTitle, margin: 0 }}>Hosildorlik Pragnozi</h2>
                    </div>

                    {/* Ilmiy manbalar haqida */}
                    <div className="alert alert-info mb-lg" style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                            <strong>Ilmiy asoslar:</strong> FAO AquaCrop modeli (Steduto et al., 2012), FAO-33 Yield Response to Water (Doorenbos & Kassam, 1979),
                            IPNI 4R Nutrient Stewardship (2014), O'zbekiston qishloq xo'jaligi statistikasi (2020-2024).
                            <strong> 8 ta omil</strong> hisobga olinadi.
                        </div>
                    </div>

                    {yieldData.length === 0 ? (
                        <div className="empty-state">
                            <div className="icon-container icon-primary" style={{ padding: '2rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
                                <Wheat size={48} />
                            </div>
                            <div className="empty-state-text">Ekinlar qo'shilmagan</div>
                            <p className="text-muted">Hosildorlik tahlili uchun avval ekinlarni qo'shing</p>
                        </div>
                    ) : (
                        <>
                            {/* Umumiy hosil ko'rinishi - Bar Chart */}
                            <div className="card mb-lg">
                                <h3 style={styles.cardTitle}>📊 Ekinlar bo'yicha kutilayotgan hosil (t/ga)</h3>
                                <div style={{ height: '300px', marginTop: '1rem' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={yieldData} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis type="number" tick={{ fontSize: 12 }} unit=" t/ga" />
                                            <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 12 }} />
                                            <Tooltip
                                                formatter={(value, name) => [
                                                    name === 'yieldPerHectare'
                                                        ? `${value.toFixed(2)} t/ga`
                                                        : `${value.toFixed(0)}%`,
                                                    name === 'yieldPerHectare' ? 'Hosildorlik' : 'Salomatlik'
                                                ]}
                                            />
                                            <Bar dataKey="yieldPerHectare" name="Hosildorlik" radius={[0, 4, 4, 0]}>
                                                {yieldData.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={entry.healthPct >= 80 ? '#10b981' : entry.healthPct >= 60 ? '#f59e0b' : '#ef4444'}
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Ekin tanlash + tafsilot */}
                            <div className="grid grid-2 mb-lg" style={{ alignItems: 'flex-start' }}>
                                {/* Chap: ekin ro'yxati */}
                                <div className="card" style={{ padding: '0' }}>
                                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                                        <h3 style={{ ...styles.cardTitle, marginBottom: 0 }}>Ekin tanlang</h3>
                                    </div>
                                    <div style={{ maxHeight: '450px', overflowY: 'auto' }}>
                                        {yieldData.map(crop => {
                                            const isSelected = selectedCropYield?.id === crop.id;
                                            const healthColor = crop.healthPct >= 80 ? '#10b981' : crop.healthPct >= 60 ? '#f59e0b' : '#ef4444';
                                            return (
                                                <div
                                                    key={crop.id}
                                                    onClick={() => setSelectedCropYield(crop)}
                                                    style={{
                                                        padding: '1rem',
                                                        borderBottom: '1px solid var(--border)',
                                                        cursor: 'pointer',
                                                        background: isSelected ? 'var(--primary-light, #eff6ff)' : 'transparent',
                                                        borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                        <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                                                            🌾 {crop.name}
                                                        </div>
                                                        <div style={{
                                                            fontSize: '0.75rem',
                                                            fontWeight: '700',
                                                            color: 'white',
                                                            background: healthColor,
                                                            padding: '2px 8px',
                                                            borderRadius: '12px'
                                                        }}>
                                                            {crop.healthPct.toFixed(0)}%
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                                        📐 {crop.area} ga  •  🎯 {crop.yieldPerHectare.toFixed(1)} t/ga
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                        <div style={{ flex: 1, height: '4px', background: '#e5e7eb', borderRadius: '2px', overflow: 'hidden' }}>
                                                            <div style={{ width: `${crop.healthPct}%`, height: '100%', background: healthColor, transition: 'width 0.5s ease' }} />
                                                        </div>
                                                    </div>
                                                    {crop.warnings.length > 0 && (
                                                        <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>
                                                            ⚠️ {crop.warnings.length} ta ogohlantirish
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* O'ng: tanlangan ekin tafsiloti */}
                                {selectedCropYield ? (
                                    <div>
                                        {/* Hosil sarhisobi */}
                                        <div className="card mb-lg" style={{
                                            borderLeft: `4px solid ${selectedCropYield.healthPct >= 80 ? '#10b981' : selectedCropYield.healthPct >= 60 ? '#f59e0b' : '#ef4444'}`
                                        }}>
                                            <h3 style={{ ...styles.cardTitle, marginBottom: '1rem' }}>
                                                🌾 {selectedCropYield.name} — Pragnoz
                                            </h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                                <div style={styles.yieldStatBox}>
                                                    <div style={styles.yieldStatLabel}>Jami hosil</div>
                                                    <div style={{ ...styles.yieldStatValue, color: '#3b82f6' }}>
                                                        {selectedCropYield.totalYield.toFixed(1)} t
                                                    </div>
                                                    <div style={styles.yieldStatSub}>({selectedCropYield.area} ga)</div>
                                                </div>
                                                <div style={styles.yieldStatBox}>
                                                    <div style={styles.yieldStatLabel}>Gektardan hosil</div>
                                                    <div style={{ ...styles.yieldStatValue, color: '#10b981' }}>
                                                        {selectedCropYield.yieldPerHectare.toFixed(2)} t/ga
                                                    </div>
                                                    <div style={styles.yieldStatSub}>bazaviy: {selectedCropYield.baseYield} t/ga</div>
                                                </div>
                                                <div style={styles.yieldStatBox}>
                                                    <div style={styles.yieldStatLabel}>Salomatlik</div>
                                                    <div style={{
                                                        ...styles.yieldStatValue,
                                                        color: selectedCropYield.healthPct >= 80 ? '#10b981' : selectedCropYield.healthPct >= 60 ? '#f59e0b' : '#ef4444'
                                                    }}>
                                                        {selectedCropYield.healthPct.toFixed(0)}%
                                                    </div>
                                                    <div style={styles.yieldStatSub}>optimal = 100%</div>
                                                </div>
                                                <div style={styles.yieldStatBox}>
                                                    <div style={styles.yieldStatLabel}>O'sish bosqichi</div>
                                                    <div style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-main)', marginTop: '0.25rem' }}>
                                                        {selectedCropYield.stageInfo.stageLabel}
                                                    </div>
                                                    <div style={styles.yieldStatSub}>
                                                        {selectedCropYield.stageInfo.daysLeft !== null
                                                            ? `${selectedCropYield.stageInfo.daysLeft} kun qoldi`
                                                            : ''}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Progress bar */}
                                            <div style={{ marginBottom: '0.5rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                                    <span>O'sish jarayoni</span>
                                                    <span>{selectedCropYield.stageInfo.progress?.toFixed(0) || 0}%</span>
                                                </div>
                                                <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <div style={{
                                                        width: `${selectedCropYield.stageInfo.progress || 0}%`,
                                                        height: '100%',
                                                        background: 'linear-gradient(90deg, #10b981, #3b82f6)',
                                                        transition: 'width 0.5s ease',
                                                        borderRadius: '4px'
                                                    }} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* 8 ta omil */}
                                        <div className="card mb-lg">
                                            <h3 style={styles.cardTitle}>⚗️ 8 ta omil tahlili</h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.75rem' }}>
                                                {Object.entries(selectedCropYield.factors).map(([key, factor]) => {
                                                    const factorValue = factor.factor !== undefined ? factor.factor : (factor.multiplier !== undefined ? factor.multiplier : 1);
                                                    const pct = (factorValue * 100).toFixed(0);
                                                    const isGood = factorValue >= 0.95;
                                                    const isMedium = factorValue >= 0.80;
                                                    const color = isGood ? '#10b981' : isMedium ? '#f59e0b' : '#ef4444';
                                                    const icons = {
                                                        soil: <Leaf size={14} />,
                                                        irrigation: <Droplets size={14} />,
                                                        fertilizer: <FlaskConical size={14} />,
                                                        climate: <Sun size={14} />,
                                                        seed: <Sprout size={14} />,
                                                        pest: <Bug size={14} />,
                                                        machinery: <Tractor size={14} />,
                                                        harvest: <Wheat size={14} />
                                                    };
                                                    return (
                                                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: '160px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                                <span style={{ color }}>{icons[key]}</span>
                                                                <span>{factor.label}</span>
                                                                <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>({factor.weight})</span>
                                                            </div>
                                                            <div style={{ flex: 1, height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                                                                <div style={{
                                                                    width: `${Math.min(factorValue * 100, 105)}%`,
                                                                    height: '100%',
                                                                    background: color,
                                                                    transition: 'width 0.5s',
                                                                    borderRadius: '3px'
                                                                }} />
                                                            </div>
                                                            <div style={{ minWidth: '42px', textAlign: 'right', fontWeight: '700', color, fontSize: '0.85rem' }}>
                                                                {pct}%
                                                            </div>
                                                            {/* Qo'shimcha ma'lumot */}
                                                            <div style={{ minWidth: '120px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                {key === 'irrigation' && factor.delayCount > 0 && `${factor.delayCount}x kechikish`}
                                                                {key === 'fertilizer' && factor.delayCount > 0 && `${factor.delayCount}x kechikish`}
                                                                {key === 'fertilizer' && factor.stage && ` (${translateStage(factor.stage)})`}
                                                                {key === 'seed' && factor.label}
                                                                {key === 'pest' && factor.label}
                                                                {key === 'machinery' && factor.label}
                                                                {key === 'harvest' && factor.label}
                                                                {key === 'climate' && factor.stress !== undefined && `Stres: ${factor.stress.toFixed(0)}%`}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Ogohlantirishlar */}
                                        {selectedCropYield.warnings.length > 0 && (
                                            <div className="card">
                                                <h3 style={{ ...styles.cardTitle, marginBottom: '0.75rem' }}>⚠️ Ogohlantirishlar</h3>
                                                {selectedCropYield.warnings.map((w, i) => (
                                                    <div
                                                        key={i}
                                                        className={w.severity === 'high' ? 'alert alert-danger' : 'alert alert-warning'}
                                                        style={{ marginTop: i > 0 ? '0.5rem' : 0 }}
                                                    >
                                                        {w.icon} {w.message}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {selectedCropYield.warnings.length === 0 && (
                                            <div className="alert" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac' }}>
                                                ✅ Barcha ko'rsatkichlar yaxshi! Hosil optimal darajada.
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                            </div>

                            {/* Umumiy taqqoslash jadvali */}
                            <div className="card">
                                <h3 style={styles.cardTitle}>📋 Barcha ekinlar hosildorlik jadvali</h3>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>Ekin</th>
                                                <th>Maydon</th>
                                                <th>Bazaviy (t/ga)</th>
                                                <th>Pragnoz (t/ga)</th>
                                                <th>Jami hosil</th>
                                                <th>Salomatlik</th>
                                                <th>Bosqich</th>
                                                <th>Ogohlantirishlar</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {yieldData.map(crop => {
                                                const hColor = crop.healthPct >= 80 ? '#10b981' : crop.healthPct >= 60 ? '#f59e0b' : '#ef4444';
                                                return (
                                                    <tr key={crop.id} style={{ cursor: 'pointer' }} onClick={() => { setSelectedCropYield(crop); }}>
                                                        <td style={{ fontWeight: '600' }}>🌾 {crop.name}</td>
                                                        <td>{crop.area} ga</td>
                                                        <td style={{ color: 'var(--text-muted)' }}>{crop.baseYield} t/ga</td>
                                                        <td style={{ fontWeight: '700', color: hColor }}>{crop.yieldPerHectare.toFixed(2)} t/ga</td>
                                                        <td style={{ fontWeight: '600' }}>{crop.totalYield.toFixed(1)} t</td>
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <div style={{ width: '60px', height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                                                                    <div style={{ width: `${crop.healthPct}%`, height: '100%', background: hColor }} />
                                                                </div>
                                                                <span style={{ color: hColor, fontWeight: '700', fontSize: '0.85rem' }}>{crop.healthPct.toFixed(0)}%</span>
                                                            </div>
                                                        </td>
                                                        <td style={{ fontSize: '0.85rem' }}>{crop.stageInfo.stageLabel}</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            {crop.warnings.length > 0
                                                                ? <span style={{ color: '#ef4444', fontWeight: '600' }}>⚠️ {crop.warnings.length}</span>
                                                                : <span style={{ color: '#10b981' }}>✅</span>}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

// O'sish bosqichi nomlarini tarjima qilish
const translateStage = (stage) => {
    const stages = {
        'GERMINATION': 'Unib chiqish',
        'EARLY_GROWTH': 'Erta o\'sish',
        'MID_GROWTH': 'O\'rta o\'sish',
        'FLOWERING': 'Gullash',
        'FRUIT_SET': 'Meva hosil',
        'MATURATION': 'Pishoqlash',
        'DEFAULT': 'O\'rta o\'sish'
    };
    return stages[stage] || stage;
};

// Summary Card Component
const SummaryCard = ({ icon, title, value, unit, color, variant }) => (
    <div className="card" style={{ borderLeft: `4px solid ${color}`, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className={`icon-container icon-${variant}`} style={{ padding: '8px' }}>
                {icon}
            </div>
            <div className="text-muted text-small" style={{ fontWeight: '500' }}>{title}</div>
        </div>
        <div style={{ color, fontSize: '1.75rem', fontWeight: '700', marginLeft: '0.25rem' }}>
            {value} <span style={{ fontSize: '0.875rem' }}>{unit}</span>
        </div>
    </div>
);

const styles = {
    tabs: {
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        background: 'var(--bg-card)',
        padding: '0.5rem',
        borderRadius: '0.75rem',
        flexWrap: 'wrap',
        border: '1px solid var(--border)'
    },
    tab: {
        flex: 1,
        minWidth: '80px',
        padding: '0.75rem 1rem',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        borderRadius: '0.5rem',
        fontWeight: '500',
        fontSize: '0.875rem',
        transition: 'all 0.2s',
        color: 'var(--text-muted)'
    },
    activeTab: {
        background: 'var(--primary)',
        color: 'white'
    },
    sectionTitle: {
        fontSize: '1.25rem',
        fontWeight: '600',
        marginBottom: '1rem',
        color: 'var(--text-main)'
    },
    cardTitle: {
        fontSize: '1rem',
        fontWeight: '600',
        color: 'var(--text-main)',
        marginBottom: '0.5rem'
    },
    highlightName: {
        fontSize: '1.25rem',
        fontWeight: '600',
        marginBottom: '0.5rem',
        color: 'var(--text-main)'
    },
    statLabel: {
        color: 'var(--text-muted)',
        fontSize: '0.875rem'
    },
    statValue: {
        fontSize: '1.75rem',
        fontWeight: '700'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.875rem'
    },
    yieldStatBox: {
        background: 'var(--bg-page)',
        padding: '0.75rem',
        borderRadius: '8px',
        textAlign: 'center'
    },
    yieldStatLabel: {
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        marginBottom: '0.25rem'
    },
    yieldStatValue: {
        fontSize: '1.4rem',
        fontWeight: '700'
    },
    yieldStatSub: {
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
        marginTop: '0.15rem'
    }
};

export default Analytics;
