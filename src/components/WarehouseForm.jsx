import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

const WarehouseForm = ({ item, onSave, onCancel }) => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState({
        name: item?.name || '',
        category: item?.category || 'Hosil',
        quantity: item?.quantity || '',
        unit: item?.unit || 'kg'
    });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            setError(t('auth.fillAllFields'));
            return;
        }

        if (!formData.quantity || parseFloat(formData.quantity) < 0) {
            setError(t('auth.fillAllFields'));
            return;
        }

        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit}>
            {error && <div className="alert alert-danger mb-md">{error}</div>}

            <div className="form-group">
                <label className="form-label">{t('warehouse.itemName')} *</label>
                <input
                    type="text"
                    name="name"
                    className="form-input"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={t('warehouse.namePlaceholder') || "Masalan: Bug'doy"}
                />
            </div>

            <div className="form-group">
                <label className="form-label">{t('finance.category')} *</label>
                <select
                    name="category"
                    className="form-select"
                    value={formData.category}
                    onChange={handleChange}
                >
                    <option value="Hosil">{t('warehouse.categories.harvest')}</option>
                    <option value="O'g'it">{t('warehouse.categories.fertilizer')}</option>
                    <option value="Urug'">{t('warehouse.categories.seeds')}</option>
                    <option value="Boshqa">{t('warehouse.categories.other')}</option>
                </select>
            </div>

            <div className="form-group">
                <label className="form-label">{t('warehouse.quantity')} *</label>
                <input
                    type="number"
                    name="quantity"
                    className="form-input"
                    value={formData.quantity}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    placeholder="0"
                />
            </div>

            <div className="form-group">
                <label className="form-label">{t('warehouse.unit')} *</label>
                <select
                    name="unit"
                    className="form-select"
                    value={formData.unit}
                    onChange={handleChange}
                >
                    <option value="kg">{t('common.units.kg')}</option>
                    <option value="tonna">{t('common.units.ton')}</option>
                    <option value="dona">{t('common.units.piece')}</option>
                    <option value="qop">{t('common.units.bag')}</option>
                    <option value="litr">{t('common.units.liter')}</option>
                </select>
            </div>

            <div className="modal-footer">
                <button type="button" onClick={onCancel} className="btn btn-outline">
                    {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary">
                    {t('common.save')}
                </button>
            </div>
        </form>
    );
};

export default WarehouseForm;
