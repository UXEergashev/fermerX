import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

const LandForm = ({ land, onSave, onCancel }) => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState({
        name: land?.name || '',
        totalArea: land?.totalArea || '',
        soilType: land?.soilType || 'Qora tuproq'
    });
    const [error, setError] = useState('');

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

        if (!formData.totalArea || parseFloat(formData.totalArea) <= 0) {
            setError(t('auth.fillAllFields'));
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

            <div className="form-group">
                <label className="form-label">{t('land.landName')} *</label>
                <input
                    type="text"
                    name="name"
                    className="form-input"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Masalan: Shimoliy maydon"
                />
            </div>

            <div className="form-group">
                <label className="form-label">Jami yer maydoni (ga) *</label>
                <input
                    type="number"
                    name="totalArea"
                    className="form-input"
                    value={formData.totalArea}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    disabled={!!land}
                />
                {land && (
                    <small className="text-muted">Maydonni tahrirlash imkoni yo'q</small>
                )}
            </div>

            <div className="form-group">
                <label className="form-label">Tuproq turi *</label>
                <select
                    name="soilType"
                    className="form-select"
                    value={formData.soilType}
                    onChange={handleChange}
                >
                    <option value="Qora tuproq">Qora tuproq</option>
                    <option value="Qumli">Qumli</option>
                    <option value="Gillitosh">Gillitosh</option>
                    <option value="Loyli">Loyli</option>
                    <option value="Sho'r">Sho'r</option>
                    <option value="Boshqa">Boshqa</option>
                </select>
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

export default LandForm;
