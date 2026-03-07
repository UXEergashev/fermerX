import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getAllByUserId, add, update, remove } from '../db/operations';
import Modal from '../components/Modal';
import CropForm from '../components/CropForm';
import { calculateAdvancedYield, getYieldWarnings, getGrowthStageInfo } from '../db/yieldPrediction';
import {
    Sprout,
    Droplets,
    Beaker,
    Trash2,
    Edit,
    BarChart3,
    AlertTriangle,
    Info,
    CheckCircle,
    Package
} from 'lucide-react';

const Crops = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [crops, setCrops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCrop, setEditingCrop] = useState(null);
    const [harvestModal, setHarvestModal] = useState(null); // { crop }

    useEffect(() => {
        loadCrops();
    }, []);

    const loadCrops = async () => {
        setLoading(true);
        const data = await getAllByUserId('crops', user.id);
        setCrops(data);
        setLoading(false);
    };

    const handleAdd = () => {
        setEditingCrop(null);
        setShowModal(true);
    };

    const handleEdit = (crop) => {
        setEditingCrop(crop);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (confirm(t('common.confirm') + '?')) {
            await remove('crops', id);
            loadCrops();
        }
    };

    const handleSave = async (cropData) => {
        try {
            if (editingCrop) {
                await update('crops', { ...cropData, id: editingCrop.id });
            } else {
                await add('crops', { ...cropData, userId: user.id });
            }

            const expenseTypes = [
                { field: 'seedsExpense', type: "Urug'", icon: '🌱' },
                { field: 'fertilizerExpense', type: "O'g'it", icon: '🧪' },
                { field: 'machineryExpense', type: 'Texnika', icon: '🚜' },
                { field: 'laborExpense', type: 'Ish haqi', icon: '👷' }
            ];

            for (const expenseType of expenseTypes) {
                const amount = cropData[expenseType.field];
                if (amount && parseFloat(amount) > 0) {
                    await add('expenses', {
                        userId: user.id,
                        date: cropData.plantDate,
                        type: expenseType.type,
                        amount: parseFloat(amount),
                        notes: `${expenseType.icon} ${cropData.name} - ${expenseType.type}`,
                        cropName: cropData.name,
                        autoCreated: true
                    });
                }
            }

            setShowModal(false);
            loadCrops();
        } catch (error) {
            console.error('Error saving crop:', error);
        }
    };

    const handleUpdateCrop = async (updatedCrop) => {
        try {
            await update('crops', updatedCrop);
            loadCrops();
        } catch (error) {
            console.error('Error updating crop:', error);
        }
    };

    // ---- HOSIL YIG'IB OLISH ----
    const handleHarvestConfirm = async (crop, actualYield, notes) => {
        try {
            const yieldAnalysis = calculateAdvancedYield(crop);
            const today = new Date().toISOString().split('T')[0];

            // 1. Yig'ilgan ekinlar arxiviga saqlash
            const harvestRecord = {
                userId: user.id,
                // Asosiy ma'lumotlar
                cropId: crop.id,
                name: crop.name,
                type: crop.type,
                area: crop.area,
                landId: crop.landId,
                // Sanalar
                plantDate: crop.plantDate,
                harvestDate: today,
                // Sug'orish tarixi
                irrigationDate: crop.irrigationDate,
                irrigationInterval: crop.irrigationInterval,
                irrigationCount: crop.irrigationCount || 0,
                // O'g'itlash tarixi
                fertilizerDate: crop.fertilizerDate,
                fertilizerInterval: crop.fertilizerInterval,
                fertilizerCount: crop.fertilizerCount || 0,
                // Xarajatlar
                seedsExpense: crop.seedsExpense || 0,
                fertilizerExpense: crop.fertilizerExpense || 0,
                machineryExpense: crop.machineryExpense || 0,
                laborExpense: crop.laborExpense || 0,
                // Hosil ma'lumotlari
                predictedYield: parseFloat(yieldAnalysis.totalYield.toFixed(2)),
                predictedYieldPerHa: parseFloat(yieldAnalysis.yieldPerHectare.toFixed(2)),
                actualYield: parseFloat(actualYield),
                actualYieldPerHa: parseFloat(crop.area) > 0
                    ? parseFloat((parseFloat(actualYield) / parseFloat(crop.area)).toFixed(2))
                    : 0,
                yieldDifference: parseFloat((parseFloat(actualYield) - yieldAnalysis.totalYield).toFixed(2)),
                yieldHealthPct: parseFloat(yieldAnalysis.healthPct.toFixed(1)),
                // Boshqa
                notes: notes || crop.notes || '',
                archivedAt: new Date().toISOString()
            };

            await add('harvestedCrops', harvestRecord);

            // 2. Omborga saqlash
            await add('warehouse', {
                userId: user.id,
                name: crop.name,
                category: 'harvest',
                quantity: parseFloat(actualYield),
                unit: 'tonna',
                minStock: 0,
                notes: `🌾 ${crop.name} - ${today} yig'ilgan hosil`,
                addedAt: today
            });

            // 3. Daromad sifatida qo'shish (faqat > 0 bo'lsa)
            await add('income', {
                userId: user.id,
                date: today,
                type: "Hosil",
                amount: 0, // narx kiritilmagan, 0 qoladi
                notes: `🌾 ${crop.name} - ${actualYield} tonna hosil yig'ib olindi`,
                cropName: crop.name,
                autoCreated: true
            });

            // 4. Ekinni o'chirish
            const db = await (await import('../db/database')).getDB();
            await db.delete('crops', crop.id);

            setHarvestModal(null);
            loadCrops();
            alert(`✅ ${crop.name} hosili yig'ib olindi!\n📦 Omborga ${actualYield} tonna saqlanди.`);
        } catch (error) {
            console.error('Harvest error:', error);
            alert('Xatolik yuz berdi: ' + error.message);
        }
    };

    if (loading) {
        return <div className="spinner-container"><div className="spinner"></div></div>;
    }

    return (
        <div>
            <div style={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="icon-container icon-primary">
                        <Sprout size={24} />
                    </div>
                    <h1>{t('crops.title')}</h1>
                </div>
                <button onClick={handleAdd} className="btn btn-primary">
                    + {t('crops.addCrop')}
                </button>
            </div>

            {crops.length === 0 ? (
                <div className="empty-state">
                    <div className="icon-container icon-primary" style={{ padding: '2rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
                        <Sprout size={48} />
                    </div>
                    <div className="empty-state-text">{t('common.noData')}</div>
                    <button onClick={handleAdd} className="btn btn-primary mt-md">
                        + {t('crops.addCrop')}
                    </button>
                </div>
            ) : (
                <div className="grid">
                    {crops.map((crop) => (
                        <CropCard
                            key={crop.id}
                            crop={crop}
                            onEdit={() => handleEdit(crop)}
                            onDelete={() => handleDelete(crop.id)}
                            onUpdateCrop={handleUpdateCrop}
                            onHarvest={() => setHarvestModal(crop)}
                        />
                    ))}
                </div>
            )}

            {showModal && (
                <Modal
                    title={editingCrop ? t('crops.editCrop') : t('crops.addCrop')}
                    onClose={() => setShowModal(false)}
                >
                    <CropForm
                        crop={editingCrop}
                        onSave={handleSave}
                        onCancel={() => setShowModal(false)}
                    />
                </Modal>
            )}

            {/* Hosil yig'ib olish modali */}
            {harvestModal && (
                <HarvestModal
                    crop={harvestModal}
                    onConfirm={handleHarvestConfirm}
                    onClose={() => setHarvestModal(null)}
                />
            )}
        </div>
    );
};

// =============================================
// HOSIL YIG'IB OLISH MODALI
// =============================================
const HarvestModal = ({ crop, onConfirm, onClose }) => {
    const yieldAnalysis = calculateAdvancedYield(crop);
    const [actualYield, setActualYield] = useState(yieldAnalysis.totalYield.toFixed(1));
    const [notes, setNotes] = useState('');

    const diff = parseFloat(actualYield) - yieldAnalysis.totalYield;
    const diffPct = yieldAnalysis.totalYield > 0
        ? ((diff / yieldAnalysis.totalYield) * 100).toFixed(1)
        : 0;

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.harvestModal}>
                <div style={styles.harvestModalHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="icon-container icon-primary" style={{ padding: '8px' }}>
                            <CheckCircle size={22} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>🌾 Hosil yig'ib olish</h3>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>{crop.name} — {crop.area} ga</div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'var(--text-muted)' }}>×</button>
                </div>

                <div style={{ padding: '1.25rem' }}>
                    {/* Pragnoz vs haqiqiy */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                        <div style={styles.harvestStatBox}>
                            <div style={styles.harvestStatLabel}>📊 Pragnoz hosil</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#3b82f6' }}>
                                {yieldAnalysis.totalYield.toFixed(1)} t
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                ({yieldAnalysis.yieldPerHectare.toFixed(2)} t/ga)
                            </div>
                        </div>
                        <div style={styles.harvestStatBox}>
                            <div style={styles.harvestStatLabel}>✅ Hosil salomatligi</div>
                            <div style={{
                                fontSize: '1.4rem', fontWeight: '700',
                                color: yieldAnalysis.healthPct >= 80 ? '#10b981' : yieldAnalysis.healthPct >= 60 ? '#f59e0b' : '#ef4444'
                            }}>
                                {yieldAnalysis.healthPct.toFixed(0)}%
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                bazaviy: {yieldAnalysis.baseYield} t/ga
                            </div>
                        </div>
                    </div>

                    {/* Haqiqiy hosil kiritish */}
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label className="form-label" style={{ fontWeight: '600' }}>
                            📦 Haqiqiy yig'ilgan hosil (tonna) *
                        </label>
                        <input
                            type="number"
                            className="form-input"
                            value={actualYield}
                            onChange={e => setActualYield(e.target.value)}
                            step="0.1"
                            min="0"
                            placeholder="0.0"
                            style={{ fontSize: '1.1rem', fontWeight: '600' }}
                        />
                        {parseFloat(actualYield) > 0 && (
                            <div style={{
                                marginTop: '0.5rem',
                                padding: '0.5rem 0.75rem',
                                borderRadius: '6px',
                                background: diff >= 0 ? '#dcfce7' : '#fef2f2',
                                color: diff >= 0 ? '#166534' : '#991b1b',
                                fontSize: '0.85rem',
                                fontWeight: '600'
                            }}>
                                {diff >= 0 ? '📈 Pragnozdan' : '📉 Pragnozdan'} {diff >= 0 ? '+' : ''}{diff.toFixed(1)} t ({diffPct}%)
                                {' '}| {(parseFloat(actualYield) / parseFloat(crop.area)).toFixed(2)} t/ga
                            </div>
                        )}
                    </div>

                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                        <label className="form-label">📝 Izoh (ixtiyoriy)</label>
                        <textarea
                            className="form-textarea"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Yig'im haqida qo'shimcha ma'lumot..."
                            rows={2}
                        />
                    </div>

                    {/* Nima bo'ladi */}
                    <div style={{
                        padding: '0.75rem', borderRadius: '8px',
                        background: 'var(--bg-page)',
                        border: '1px solid var(--border)',
                        marginBottom: '1.25rem',
                        fontSize: '0.82rem',
                        color: 'var(--text-muted)'
                    }}>
                        <strong style={{ color: 'var(--text-main)' }}>Tasdiqlasangiz:</strong>
                        <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: '1.8' }}>
                            <li>📦 Omborga <strong>{actualYield} tonna {crop.name}</strong> qo'shiladi</li>
                            <li>🗂️ Ekin "Yig'ilgan ekinlar" arxiviga saqlanadi</li>
                            <li>🌾 Ekinlar ro'yxatidan o'chiriladi</li>
                        </ul>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>
                            Bekor qilish
                        </button>
                        <button
                            onClick={() => {
                                if (!actualYield || parseFloat(actualYield) < 0) {
                                    alert("Hosil miqdorini kiriting!");
                                    return;
                                }
                                onConfirm(crop, actualYield, notes);
                            }}
                            className="btn btn-primary"
                            style={{ flex: 2, background: '#10b981' }}
                        >
                            ✅ Yig'ib oldim — {actualYield} tonna
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// =============================================
// EKIN KARTASI
// =============================================
const CropCard = ({ crop, onEdit, onDelete, onUpdateCrop, onHarvest }) => {
    const { t } = useLanguage();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const irrigationDate = new Date(crop.irrigationDate);
    irrigationDate.setHours(0, 0, 0, 0);
    const fertilizerDate = new Date(crop.fertilizerDate);
    fertilizerDate.setHours(0, 0, 0, 0);

    const needsIrrigation = irrigationDate <= today;
    const needsFertilizer = fertilizerDate <= today;

    // Kengaytirilgan hosildorlik hisobi (8 ta omil)
    const yieldAnalysis = calculateAdvancedYield(crop);
    const stageInfo = getGrowthStageInfo(crop);
    const warnings = getYieldWarnings(crop);
    const yieldHealth = yieldAnalysis.healthPct;
    const expectedYield = yieldAnalysis.totalYield;
    const yieldPerHectare = yieldAnalysis.yieldPerHectare;

    const getHealthColor = () => {
        if (yieldHealth >= 80) return '#10b981';
        if (yieldHealth >= 60) return '#f59e0b';
        return '#ef4444';
    };

    const getWarningIcon = (type) => {
        switch (type) {
            case 'irrigation': return <Droplets size={16} />;
            case 'fertilizer': return <Beaker size={16} />;
            default: return <AlertTriangle size={16} />;
        }
    };

    const handleUpdateCropDate = async (field, newDate) => {
        // Hisoblagichni ham oshiramiz
        const countField = field === 'irrigationDate' ? 'irrigationCount' : 'fertilizerCount';
        const currentCount = parseInt(crop[countField] || 0);
        const updatedCrop = {
            ...crop,
            [field]: newDate.toISOString().split('T')[0],
            [countField]: currentCount + 1
        };
        await onUpdateCrop(updatedCrop);
    };

    const handleIrrigate = () => {
        const newDate = new Date();
        newDate.setDate(newDate.getDate() + parseInt(crop.irrigationInterval || 7));
        handleUpdateCropDate('irrigationDate', newDate);
    };

    const handlePostponeIrrigation = () => {
        const newDate = new Date();
        newDate.setDate(newDate.getDate() + 1);
        const updatedCrop = { ...crop, irrigationDate: newDate.toISOString().split('T')[0] };
        onUpdateCrop(updatedCrop);
    };

    const handleFertilize = () => {
        const newDate = new Date();
        newDate.setDate(newDate.getDate() + parseInt(crop.fertilizerInterval || 14));
        handleUpdateCropDate('fertilizerDate', newDate);
    };

    const handlePostponeFertilizer = () => {
        const newDate = new Date();
        newDate.setDate(newDate.getDate() + 1);
        const updatedCrop = { ...crop, fertilizerDate: newDate.toISOString().split('T')[0] };
        onUpdateCrop(updatedCrop);
    };

    return (
        <div className="card">
            <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="icon-container icon-primary" style={{ padding: '6px' }}>
                        <Sprout size={18} />
                    </div>
                    <h3 className="card-title">{crop.name}</h3>
                </div>
                <div className="flex gap-sm">
                    <button onClick={onEdit} className="btn btn-sm btn-outline" title="Tahrirlash">
                        <Edit size={14} />
                    </button>
                    <button onClick={onDelete} className="btn btn-sm btn-danger" title="O'chirish">
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
            <div className="card-body">
                <div style={styles.info}>
                    <span className="text-muted">Turi:</span>
                    <span>{crop.type}</span>
                </div>
                <div style={styles.info}>
                    <span className="text-muted">Ekilgan sana:</span>
                    <span>{new Date(crop.plantDate).toLocaleDateString('uz-UZ')}</span>
                </div>
                <div style={styles.info}>
                    <span className="text-muted">Maydon:</span>
                    <span className="text-primary" style={{ fontWeight: '600' }}>{crop.area} ga</span>
                </div>
                {(crop.irrigationCount > 0 || crop.fertilizerCount > 0) && (
                    <div style={styles.info}>
                        <span className="text-muted">💧 Sug'orildi / 🧪 O'g'itlandi:</span>
                        <span style={{ fontWeight: '600' }}>
                            {crop.irrigationCount || 0}x / {crop.fertilizerCount || 0}x
                        </span>
                    </div>
                )}

                {/* Kengaytirilgan Hosildorlik Pragnozi */}
                <div style={{ ...styles.yieldSection, borderColor: getHealthColor() }}>
                    <div style={styles.yieldHeader}>
                        <div className="icon-container" style={{ background: 'var(--bg-page)', padding: '6px' }}>
                            <BarChart3 size={18} />
                        </div>
                        <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>Hosildorlik prognozi</span>
                        <span style={{
                            marginLeft: 'auto', fontSize: '0.7rem', fontWeight: '600', color: 'white',
                            background: getHealthColor(), padding: '2px 8px', borderRadius: '10px'
                        }}>
                            {yieldHealth.toFixed(0)}%
                        </span>
                    </div>

                    <div style={styles.yieldData}>
                        <div>
                            <div className="text-muted text-small">Taxminiy hosil</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: '700', color: getHealthColor() }}>
                                {expectedYield.toFixed(1)} t
                            </div>
                            <div className="text-muted text-small">({yieldPerHectare.toFixed(2)} t/ga)</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div className="text-muted text-small">O'sish bosqichi</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)', marginTop: '2px' }}>
                                {stageInfo.stageLabel}
                            </div>
                            {stageInfo.daysLeft !== null && stageInfo.daysLeft >= 0 && (
                                <div className="text-muted text-small">{stageInfo.daysLeft} kun qoldi</div>
                            )}
                        </div>
                    </div>

                    {/* Progress barlar */}
                    <div style={{ marginTop: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
                            <span>O'sish: {stageInfo.progress?.toFixed(0) || 0}%</span>
                            <span>Hosil: {yieldHealth.toFixed(0)}%</span>
                        </div>
                        <div style={{ height: '5px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden', marginBottom: '2px' }}>
                            <div style={{ width: `${stageInfo.progress || 0}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #3b82f6)', transition: 'width 0.3s ease' }} />
                        </div>
                        <div style={{ height: '4px', background: '#e5e7eb', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${yieldHealth}%`, height: '100%', background: getHealthColor(), transition: 'width 0.3s ease' }} />
                        </div>
                    </div>

                    {/* Mini omillar */}
                    <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                        {[
                            { key: 'irrigation', icon: '💧', label: "Sug'orish" },
                            { key: 'fertilizer', icon: '🧪', label: "O'g'it" },
                            { key: 'climate', icon: '🌡️', label: 'Ob-havo' },
                            { key: 'seed', icon: '🌱', label: "Urug'" }
                        ].map(({ key, icon, label }) => {
                            const f = yieldAnalysis.factors[key];
                            const val = f?.factor !== undefined ? f.factor : (f?.multiplier || 1);
                            const c = val >= 0.95 ? '#10b981' : val >= 0.80 ? '#f59e0b' : '#ef4444';
                            return (
                                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem' }}>
                                    <span>{icon}</span>
                                    <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
                                    <span style={{ fontWeight: '700', color: c }}>{(val * 100).toFixed(0)}%</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Xarajat */}
                {crop.expenseAmount && parseFloat(crop.expenseAmount) > 0 && (
                    <div style={styles.info}>
                        <span className="text-muted">Ekish xarajati:</span>
                        <span style={{ color: '#ef4444', fontWeight: '600' }}>
                            {parseFloat(crop.expenseAmount).toLocaleString()} so'm
                        </span>
                    </div>
                )}

                {/* Ogohlantirishlar */}
                {warnings.length > 0 && (
                    <div style={{ marginTop: '0.75rem' }}>
                        {warnings.map((warning, index) => (
                            <div
                                key={index}
                                className={warning.severity === 'high' ? 'alert alert-danger' : 'alert alert-warning'}
                                style={{ marginTop: index > 0 ? '0.5rem' : 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                {getWarningIcon(warning.type)}
                                {warning.message}
                            </div>
                        ))}
                    </div>
                )}

                {/* Sug'orish/O'g'itlash tugmalari */}
                {needsIrrigation && warnings.filter(w => w.type === 'irrigation').length === 0 && (
                    <div className="alert alert-info mt-sm" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Droplets size={16} /> {t('crops.irrigationTime')}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <button onClick={handleIrrigate} className="btn btn-sm btn-primary flex-grow">{t('crops.irrigated')}</button>
                            <button onClick={handlePostponeIrrigation} className="btn btn-sm btn-outline flex-grow">{t('crops.postpone')}</button>
                        </div>
                    </div>
                )}
                {needsFertilizer && warnings.filter(w => w.type === 'fertilizer').length === 0 && (
                    <div className="alert alert-warning mt-sm" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Beaker size={16} /> {t('crops.fertilizerTime')}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <button onClick={handleFertilize} className="btn btn-sm btn-primary flex-grow">{t('crops.fertilized')}</button>
                            <button onClick={handlePostponeFertilizer} className="btn btn-sm btn-outline flex-grow">{t('crops.postpone')}</button>
                        </div>
                    </div>
                )}

                {crop.notes && (
                    <div className="text-muted text-small mt-sm" style={{ display: 'flex', gap: '0.5rem' }}>
                        <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>Izoh: {crop.notes}</span>
                    </div>
                )}

                {/* ✅ HOSIL YIG'IB OLISH TUGMASI */}
                <button
                    onClick={onHarvest}
                    style={{
                        marginTop: '1rem',
                        width: '100%',
                        padding: '0.65rem 1rem',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 8px rgba(16,185,129,0.3)'
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <CheckCircle size={18} />
                    🌾 Hosilni yig'ib olish
                </button>
            </div>
        </div>
    );
};

const styles = {
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
    },
    info: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '0.5rem 0',
        borderBottom: '1px solid var(--border)'
    },
    yieldSection: {
        marginTop: '1rem',
        padding: '1rem',
        background: 'var(--bg-page)',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        borderLeftWidth: '4px',
        borderLeftStyle: 'solid'
    },
    yieldHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.75rem'
    },
    yieldData: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem'
    },
    modalOverlay: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
    },
    harvestModal: {
        background: 'var(--bg-card)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        maxHeight: '90vh',
        overflowY: 'auto'
    },
    harvestModalHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.25rem',
        borderBottom: '1px solid var(--border)'
    },
    harvestStatBox: {
        background: 'var(--bg-page)',
        padding: '0.75rem',
        borderRadius: '8px',
        textAlign: 'center'
    },
    harvestStatLabel: {
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        marginBottom: '0.25rem'
    }
};

export default Crops;
