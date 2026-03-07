import React, { useState, useEffect } from 'react';
import { calculateAvailableLand } from '../db/calculations';
import { getAllByUserId } from '../db/operations';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
    Leaf,
    Beaker,
    Truck,
    Users,
    CircleDollarSign
} from 'lucide-react';

const CropForm = ({ crop, onSave, onCancel }) => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [formData, setFormData] = useState({
        name: crop?.name || '',
        type: crop?.type || 'Don',
        plantDate: crop?.plantDate || new Date().toISOString().split('T')[0],
        area: crop?.area || '',
        landId: crop?.landId || '',
        irrigationDate: crop?.irrigationDate || '',
        fertilizerDate: crop?.fertilizerDate || '',
        irrigationInterval: crop?.irrigationInterval || '7',
        fertilizerInterval: crop?.fertilizerInterval || '14',
        notes: crop?.notes || '',
        // Alohida xarajatlar
        seedsExpense: crop?.seedsExpense || '',
        fertilizerExpense: crop?.fertilizerExpense || '',
        machineryExpense: crop?.machineryExpense || '',
        laborExpense: crop?.laborExpense || ''
    });
    const [error, setError] = useState('');
    const [availableLand, setAvailableLand] = useState(0);
    const [lands, setLands] = useState([]);
    const [selectedLandArea, setSelectedLandArea] = useState(0);

    useEffect(() => {
        loadAvailableLand();
        loadLands();
    }, []);

    const loadAvailableLand = async () => {
        const available = await calculateAvailableLand(user.id);
        setAvailableLand(available);
    };

    const loadLands = async () => {
        const allLands = await getAllByUserId('land', user.id);
        const allCrops = await getAllByUserId('crops', user.id);
        // Har bir yer uchun bo'sh maydonni hisoblang
        const landsWithAvailable = allLands.map(land => {
            const used = allCrops
                .filter(c => c.landId === land.id && (!crop || c.id !== crop.id))
                .reduce((sum, c) => sum + (parseFloat(c.area) || 0), 0);
            return {
                ...land,
                availableArea: parseFloat(land.totalArea) - used
            };
        });
        setLands(landsWithAvailable);
        // Agar tahrirlash bo'lsa, eski landId ni tanla
        if (crop?.landId) {
            const found = landsWithAvailable.find(l => l.id === crop.landId);
            if (found) setSelectedLandArea(found.availableArea + (parseFloat(crop.area) || 0));
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Yer tanlanganda bo'sh maydonni yangilash
        if (name === 'landId') {
            const found = lands.find(l => l.id === parseInt(value));
            if (found) setSelectedLandArea(found.availableArea);
            else setSelectedLandArea(0);
        }
        setError('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            setError(t('auth.fillAllFields'));
            return;
        }

        if (!formData.area || parseFloat(formData.area) <= 0) {
            setError(t('auth.fillAllFields'));
            return;
        }

        const requestedArea = parseFloat(formData.area);

        // Agar yer tanlangan bo'lsa — shu yerning bo'sh maydonini tekshir
        if (formData.landId) {
            const land = lands.find(l => l.id === parseInt(formData.landId));
            if (land) {
                const maxForThisLand = land.availableArea + (crop?.landId === land.id ? parseFloat(crop.area || 0) : 0);
                if (requestedArea > maxForThisLand) {
                    setError(`"${land.name}" da bo'sh yer: ${maxForThisLand.toFixed(2)} ga`);
                    return;
                }
            }
        } else {
            // Yer tanlanmagan — umumiy bo'sh maydonni tekshir
            const currentArea = crop?.area || 0;
            const maxAllowed = availableLand + parseFloat(currentArea);
            if (requestedArea > maxAllowed) {
                setError(`${t('land.empty')}: ${maxAllowed.toFixed(2)} ${t('common.ha')}`);
                return;
            }
        }

        onSave({
            ...formData,
            landId: formData.landId ? parseInt(formData.landId) : null
        });
    };

    return (
        <form onSubmit={handleSubmit}>
            {error && (
                <div className="alert alert-danger mb-md">
                    {error}
                </div>
            )}

            {!crop && (
                <div className="alert alert-info mb-md">
                    {t('dashboard.emptyLand')}: {availableLand.toFixed(2)} {t('common.ha')}
                </div>
            )}

            {/* Yer tanlash */}
            {lands.length > 0 && (
                <div className="form-group">
                    <label className="form-label">🗺️ Qaysi yerga ekiladi?</label>
                    <select
                        name="landId"
                        className="form-select"
                        value={formData.landId}
                        onChange={handleChange}
                    >
                        <option value="">— Tanlang (ixtiyoriy) —</option>
                        {lands.map(land => (
                            <option
                                key={land.id}
                                value={land.id}
                                disabled={land.availableArea <= 0 && land.id !== crop?.landId}
                            >
                                {land.name} — bo'sh: {land.availableArea.toFixed(2)} ga / jami: {land.totalArea} ga
                                {land.availableArea <= 0 && land.id !== crop?.landId ? " (to'liq)" : ''}
                            </option>
                        ))}
                    </select>
                    {formData.landId && (
                        <small className="text-muted">
                            Tanlangan yerda bo'sh: <strong style={{ color: '#10b981' }}>
                                {selectedLandArea.toFixed(2)} ga
                            </strong>
                        </small>
                    )}
                </div>
            )}

            <div className="form-group">
                <label className="form-label">{t('crops.cropName')} *</label>
                <input
                    type="text"
                    name="name"
                    className="form-input"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={t('crops.cropName')}
                />
            </div>

            <div className="form-group">
                <label className="form-label">Ekin turi *</label>
                <select
                    name="type"
                    className="form-select"
                    value={formData.type}
                    onChange={handleChange}
                >
                    <option value="Don">Don</option>
                    <option value="Sabzavot">Sabzavot</option>
                    <option value="Meva">Meva</option>
                    <option value="Poliz ekinlari">Poliz ekinlari</option>
                    <option value="Boshqa">Boshqa</option>
                </select>
            </div>

            <div className="form-group">
                <label className="form-label">Ekilgan sana *</label>
                <input
                    type="date"
                    name="plantDate"
                    className="form-input"
                    value={formData.plantDate}
                    onChange={handleChange}
                />
            </div>

            <div className="form-group">
                <label className="form-label">Maydon (ga) *</label>
                <input
                    type="number"
                    name="area"
                    className="form-input"
                    value={formData.area}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                />
            </div>

            <div className="form-group">
                <label className="form-label">Sug'orish sanasi</label>
                <input
                    type="date"
                    name="irrigationDate"
                    className="form-input"
                    value={formData.irrigationDate}
                    onChange={handleChange}
                />
            </div>

            <div className="form-group">
                <label className="form-label">O'g'itlash sanasi</label>
                <input
                    type="date"
                    name="fertilizerDate"
                    className="form-input"
                    value={formData.fertilizerDate}
                    onChange={handleChange}
                />
            </div>

            <div className="grid grid-2">
                <div className="form-group">
                    <label className="form-label">Sug'orish oralig'i (kun)</label>
                    <input
                        type="number"
                        name="irrigationInterval"
                        className="form-input"
                        value={formData.irrigationInterval}
                        onChange={handleChange}
                        min="1"
                        placeholder="7"
                    />
                    <small className="text-muted">Necha kunda bir marta sug'orish kerak</small>
                </div>

                <div className="form-group">
                    <label className="form-label">O'g'itlash oralig'i (kun)</label>
                    <input
                        type="number"
                        name="fertilizerInterval"
                        className="form-input"
                        value={formData.fertilizerInterval}
                        onChange={handleChange}
                        min="1"
                        placeholder="14"
                    />
                    <small className="text-muted">Necha kunda bir marta o'g'itlash kerak</small>
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Izoh</label>
                <textarea
                    name="notes"
                    className="form-textarea"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Qo'shimcha ma'lumot..."
                />
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '2px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div className="icon-container icon-primary" style={{ padding: '6px' }}>
                        <CircleDollarSign size={18} />
                    </div>
                    <h4 style={{ margin: 0, color: '#1f2937' }}>Ekish xarajatlari</h4>
                </div>
                <p className="text-muted text-small mb-md">
                    Har bir xarajat turini alohida kiriting. Xarajatlar avtomatik Moliya bo'limiga qo'shiladi.
                </p>

                <div className="grid grid-2">
                    <div className="form-group">
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Leaf size={14} /> {t('finance.categories.seeds') || "Urug'"} (so'm)
                        </label>
                        <input
                            type="number"
                            name="seedsExpense"
                            className="form-input"
                            value={formData.seedsExpense}
                            onChange={handleChange}
                            min="0"
                            step="1000"
                            placeholder="0"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Beaker size={14} /> {t('finance.categories.fertilizer') || "O'g'it"} (so'm)
                        </label>
                        <input
                            type="number"
                            name="fertilizerExpense"
                            className="form-input"
                            value={formData.fertilizerExpense}
                            onChange={handleChange}
                            min="0"
                            step="1000"
                            placeholder="0"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Truck size={14} /> {t('finance.categories.equipment') || "Texnika"} (so'm)
                        </label>
                        <input
                            type="number"
                            name="machineryExpense"
                            className="form-input"
                            value={formData.machineryExpense}
                            onChange={handleChange}
                            min="0"
                            step="1000"
                            placeholder="0"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Users size={14} /> {t('finance.categories.labor') || "Ish haqi"} (so'm)
                        </label>
                        <input
                            type="number"
                            name="laborExpense"
                            className="form-input"
                            value={formData.laborExpense}
                            onChange={handleChange}
                            min="0"
                            step="1000"
                            placeholder="0"
                        />
                    </div>
                </div>
            </div>

            <div className="modal-footer">
                <button type="button" onClick={onCancel} className="btn btn-outline">
                    Bekor qilish
                </button>
                <button type="submit" className="btn btn-primary">
                    Saqlash
                </button>
            </div>
        </form>
    );
};

export default CropForm;
