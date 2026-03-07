import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllByUserId } from '../db/operations';
import { getDB } from '../db/database';
import {
    Archive,
    Sprout,
    ChevronDown,
    ChevronUp,
    TrendingUp,
    TrendingDown,
    Calendar,
    Droplets,
    Beaker,
    Package,
    BarChart3,
    Trash2
} from 'lucide-react';

const HarvestedCrops = () => {
    const { user } = useAuth();
    const [harvested, setHarvested] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        loadHarvested();
    }, []);

    const loadHarvested = async () => {
        setLoading(true);
        try {
            const db = await getDB();
            const all = await db.getAllFromIndex('harvestedCrops', 'userId', user.id);
            // Eng yangilari birinchi
            const sorted = all.sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt));
            setHarvested(sorted);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Bu yozuvni butunlay o'chirilsinmi?")) return;
        const db = await getDB();
        await db.delete('harvestedCrops', id);
        loadHarvested();
    };

    // Statistika
    const totalHarvests = harvested.length;
    const totalActual = harvested.reduce((s, h) => s + (parseFloat(h.actualYield) || 0), 0);
    const totalPredicted = harvested.reduce((s, h) => s + (parseFloat(h.predictedYield) || 0), 0);
    const accuracy = totalPredicted > 0 ? ((totalActual / totalPredicted) * 100).toFixed(1) : 0;

    const uniqueCrops = [...new Set(harvested.map(h => h.name))];
    const filtered = filter === 'all' ? harvested : harvested.filter(h => h.name === filter);

    if (loading) {
        return <div className="spinner-container"><div className="spinner"></div></div>;
    }

    return (
        <div>
            {/* Sahifa sarlavhasi */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div className="icon-container icon-primary">
                    <Archive size={24} />
                </div>
                <div>
                    <h1 style={{ margin: 0 }}>Yig'ilgan ekinlar</h1>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Barcha hosil tarixi va tahlil
                    </div>
                </div>
            </div>

            {/* Umumiy statistika */}
            {totalHarvests > 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '0.75rem',
                    marginBottom: '1.5rem'
                }}>
                    <StatCard icon="📦" label="Jami yig'imlar" value={`${totalHarvests} ta`} color="#3b82f6" />
                    <StatCard icon="🌾" label="Jami hosil" value={`${totalActual.toFixed(1)} t`} color="#10b981" />
                    <StatCard icon="📊" label="Pragnoz aniqligi" value={`${accuracy}%`}
                        color={parseFloat(accuracy) >= 85 ? '#10b981' : parseFloat(accuracy) >= 70 ? '#f59e0b' : '#ef4444'} />
                    <StatCard icon="🌱" label="Ekin turlari" value={`${uniqueCrops.length} xil`} color="#8b5cf6" />
                </div>
            )}

            {/* Filter */}
            {uniqueCrops.length > 1 && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    <button
                        onClick={() => setFilter('all')}
                        className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline'}`}
                    >
                        Barchasi ({harvested.length})
                    </button>
                    {uniqueCrops.map(name => (
                        <button
                            key={name}
                            onClick={() => setFilter(name)}
                            className={`btn btn-sm ${filter === name ? 'btn-primary' : 'btn-outline'}`}
                        >
                            {name} ({harvested.filter(h => h.name === name).length})
                        </button>
                    ))}
                </div>
            )}

            {filtered.length === 0 ? (
                <div className="empty-state">
                    <div className="icon-container icon-primary" style={{ padding: '2rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
                        <Archive size={48} />
                    </div>
                    <div className="empty-state-text">Hali hosil yig'ib olinmagan</div>
                    <p className="text-muted">Ekinlar bo'limida "Hosilni yig'ib olish" tugmasini bosing</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {filtered.map(item => (
                        <HarvestCard
                            key={item.id}
                            item={item}
                            isExpanded={expandedId === item.id}
                            onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                            onDelete={() => handleDelete(item.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// ==========================================
// HOSIL KARTASI KOMPONENTI
// ==========================================
const HarvestCard = ({ item, isExpanded, onToggle, onDelete }) => {
    const diff = (parseFloat(item.actualYield) || 0) - (parseFloat(item.predictedYield) || 0);
    const diffPct = item.predictedYield > 0
        ? ((diff / item.predictedYield) * 100).toFixed(1)
        : 0;
    const isAbove = diff >= 0;
    const healthColor = item.yieldHealthPct >= 80 ? '#10b981' : item.yieldHealthPct >= 60 ? '#f59e0b' : '#ef4444';

    const totalExpenses = (
        (parseFloat(item.seedsExpense) || 0) +
        (parseFloat(item.fertilizerExpense) || 0) +
        (parseFloat(item.machineryExpense) || 0) +
        (parseFloat(item.laborExpense) || 0)
    );

    const growthDays = item.plantDate && item.harvestDate
        ? Math.floor((new Date(item.harvestDate) - new Date(item.plantDate)) / (1000 * 60 * 60 * 24))
        : null;

    return (
        <div className="card" style={{ borderLeft: `4px solid ${isAbove ? '#10b981' : '#f59e0b'}` }}>
            {/* Sarlavha qatori */}
            <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '0.25rem 0' }}
                onClick={onToggle}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="icon-container icon-primary" style={{ padding: '6px' }}>
                        <Sprout size={18} />
                    </div>
                    <div>
                        <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-main)' }}>
                            🌾 {item.name}
                            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '400' }}>
                                {item.area} ga
                            </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            <Calendar size={12} style={{ display: 'inline', marginRight: '3px' }} />
                            {item.harvestDate ? new Date(item.harvestDate).toLocaleDateString('uz-UZ') : '—'}
                            {growthDays && <span> • {growthDays} kun o'sdi</span>}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Hosil taqqosi */}
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#10b981' }}>
                            {parseFloat(item.actualYield).toFixed(1)} t
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            color: isAbove ? '#10b981' : '#f59e0b',
                            fontWeight: '600'
                        }}>
                            {isAbove ? '📈 +' : '📉 '}{diff.toFixed(1)} t ({diffPct}%)
                        </div>
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                </div>
            </div>

            {/* Kengaytirilgan tafsilot */}
            {isExpanded && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                    {/* Asosiy ko'rsatkichlar bloki */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                        <MiniStat label="Haqiqiy hosil" value={`${parseFloat(item.actualYield).toFixed(1)} t`} sub={`${item.actualYieldPerHa || '—'} t/ga`} color="#10b981" />
                        <MiniStat label="Pragnoz hosil" value={`${parseFloat(item.predictedYield).toFixed(1)} t`} sub={`${item.predictedYieldPerHa || '—'} t/ga`} color="#3b82f6" />
                        <MiniStat label="Pragnoz farqi" value={`${isAbove ? '+' : ''}${diff.toFixed(1)} t`} sub={`${diffPct}%`} color={isAbove ? '#10b981' : '#ef4444'} />
                        <MiniStat label="Hosil salomatligi" value={`${item.yieldHealthPct || '—'}%`} sub="pragnoz vaqtida" color={healthColor} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        {/* Sana ma'lumotlari */}
                        <div style={styles.section}>
                            <div style={styles.sectionTitle}>📅 Sanalar</div>
                            <InfoRow icon={<Sprout size={13} />} label="Ekilgan" value={item.plantDate ? new Date(item.plantDate).toLocaleDateString('uz-UZ') : '—'} />
                            <InfoRow icon={<Archive size={13} />} label="Yig'ib olindi" value={item.harvestDate ? new Date(item.harvestDate).toLocaleDateString('uz-UZ') : '—'} />
                            {growthDays && <InfoRow icon={<Calendar size={13} />} label="O'sish davri" value={`${growthDays} kun`} />}
                        </div>

                        {/* Parvarish tarixi */}
                        <div style={styles.section}>
                            <div style={styles.sectionTitle}>🚿 Parvarish tarixi</div>
                            <InfoRow icon={<Droplets size={13} />} label="Sug'orildi"
                                value={`${item.irrigationCount || 0} marta (har ${item.irrigationInterval || '?'} kunda)`} />
                            <InfoRow icon={<Beaker size={13} />} label="O'g'itlandi"
                                value={`${item.fertilizerCount || 0} marta (har ${item.fertilizerInterval || '?'} kunda)`} />
                        </div>

                        {/* Xarajatlar */}
                        {totalExpenses > 0 && (
                            <div style={styles.section}>
                                <div style={styles.sectionTitle}>💰 Xarajatlar</div>
                                {item.seedsExpense > 0 && <InfoRow label="🌱 Urug'" value={`${Number(item.seedsExpense).toLocaleString()} so'm`} />}
                                {item.fertilizerExpense > 0 && <InfoRow label="🧪 O'g'it" value={`${Number(item.fertilizerExpense).toLocaleString()} so'm`} />}
                                {item.machineryExpense > 0 && <InfoRow label="🚜 Texnika" value={`${Number(item.machineryExpense).toLocaleString()} so'm`} />}
                                {item.laborExpense > 0 && <InfoRow label="👷 Ish haqi" value={`${Number(item.laborExpense).toLocaleString()} so'm`} />}
                                <InfoRow label="📊 Jami" value={`${totalExpenses.toLocaleString()} so'm`} bold />
                            </div>
                        )}

                        {/* Pragnoz vs haqiqiy tahlili */}
                        <div style={styles.section}>
                            <div style={styles.sectionTitle}>📊 Pragnoz aniqligi</div>
                            <div style={{ marginTop: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                    <span>Pragnoz</span><span>Haqiqiy</span>
                                </div>
                                <div style={{ display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', background: '#e5e7eb' }}>
                                    <div style={{
                                        width: `${Math.min((parseFloat(item.actualYield) / Math.max(parseFloat(item.predictedYield), parseFloat(item.actualYield))) * 100, 100)}%`,
                                        background: isAbove ? '#10b981' : '#f59e0b',
                                        transition: 'width 0.5s'
                                    }} />
                                </div>
                                <div style={{ fontSize: '0.8rem', marginTop: '4px', color: isAbove ? '#10b981' : '#ef4444', fontWeight: '600', textAlign: 'center' }}>
                                    {isAbove ? '✅ Pragnozdan yuqori' : '⚠️ Pragnozdan past'}: {Math.abs(diffPct)}%
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Izoh */}
                    {item.notes && (
                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-page)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            📝 <strong>Izoh:</strong> {item.notes}
                        </div>
                    )}

                    {/* O'chirish */}
                    <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                        <button
                            onClick={onDelete}
                            className="btn btn-sm btn-danger"
                            style={{ opacity: 0.7 }}
                        >
                            <Trash2 size={14} /> Arxivdan o'chirish
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Mini komponentlar
const StatCard = ({ icon, label, value, color }) => (
    <div className="card" style={{ textAlign: 'center', borderTop: `3px solid ${color}`, padding: '1rem' }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{icon}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{label}</div>
        <div style={{ fontSize: '1.2rem', fontWeight: '700', color }}>{value}</div>
    </div>
);

const MiniStat = ({ label, value, sub, color }) => (
    <div style={{ textAlign: 'center', padding: '0.6rem', background: 'var(--bg-page)', borderRadius: '8px' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '1.1rem', fontWeight: '700', color }}>{value}</div>
        {sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
);

const InfoRow = ({ icon, label, value, bold }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.82rem' }}>
        <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {icon} {label}
        </span>
        <span style={{ fontWeight: bold ? '700' : '500', color: 'var(--text-main)' }}>{value}</span>
    </div>
);

const styles = {
    section: {
        background: 'var(--bg-page)',
        borderRadius: '8px',
        padding: '0.75rem'
    },
    sectionTitle: {
        fontWeight: '600',
        fontSize: '0.82rem',
        color: 'var(--text-main)',
        marginBottom: '0.5rem'
    }
};

export default HarvestedCrops;
