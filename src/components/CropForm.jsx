import React, { useState, useEffect } from 'react';
import { calculateAvailableLand } from '../db/calculations';
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
        irrigationDate: crop?.irrigationDate || '',
        fertilizerDate: crop?.fertilizerDate || '',
        irrigationInterval: crop?.irrigationInterval || '7',  // Default 7 days
        fertilizerInterval: crop?.fertilizerInterval || '14',  // Default 14 days
        notes: crop?.notes || '',
        // Alohida xarajatlar
        seedsExpense: crop?.seedsExpense || '',
        fertilizerExpense: crop?.fertilizerExpense || '',
        machineryExpense: crop?.machineryExpense || '',
        laborExpense: crop?.laborExpense || ''
    });
    const [error, setError] = useState('');
    const [availableLand, setAvailableLand] = useState(0);

    useEffect(() => {
        loadAvailableLand();
    }, []);

    const loadAvailableLand = async () => {
        const available = await calculateAvailableLand(user.id);
        setAvailableLand(available);
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
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
        const currentArea = crop?.area || 0;
        const maxAllowed = availableLand + currentArea;

        if (requestedArea > maxAllowed) {
            setError(`${t('land.empty')}: ${maxAllowed.toFixed(2)} ${t('common.ha')}`);
            return;
        }

        onSave(formData);
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
