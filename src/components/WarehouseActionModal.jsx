import React, { useState } from 'react';
import { update, add } from '../db/operations';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Modal from './Modal';

const WarehouseActionModal = ({ item, actionType, onClose, onComplete }) => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [formData, setFormData] = useState({
        quantity: '',
        price: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const qty = parseFloat(formData.quantity);

        if (!qty || qty <= 0) {
            setError(t('auth.fillAllFields'));
            return;
        }

        if (actionType === 'sell') {
            if (qty > item.quantity) {
                setError(`Omborda faqat ${item.quantity} ${item.unit} mavjud`);
                return;
            }

            const price = parseFloat(formData.price);
            if (!price || price <= 0) {
                setError(t('auth.fillAllFields'));
                return;
            }
        }

        setLoading(true);

        try {
            if (actionType === 'add') {
                // Add to warehouse
                const newQuantity = item.quantity + qty;
                await update('warehouse', { ...item, quantity: newQuantity });

                // Save to history
                await add('warehouseHistory', {
                    userId: user.id,
                    itemId: item.id,
                    action: 'add',
                    quantity: qty,
                    date: formData.date,
                    notes: formData.notes
                });

            } else {
                // Sell from warehouse
                const newQuantity = item.quantity - qty;
                await update('warehouse', { ...item, quantity: newQuantity });

                // Calculate total income
                const totalIncome = qty * parseFloat(formData.price);

                // Create income record
                await add('income', {
                    userId: user.id,
                    date: formData.date,
                    source: `${item.name} sotuvi`,
                    amount: totalIncome,
                    notes: `${qty} ${item.unit} × ${formData.price} so'm${formData.notes ? ' - ' + formData.notes : ''}`,
                    autoCreated: true
                });

                // Save to history
                await add('warehouseHistory', {
                    userId: user.id,
                    itemId: item.id,
                    action: 'sell',
                    quantity: qty,
                    price: formData.price,
                    date: formData.date,
                    notes: formData.notes
                });
            }

            onComplete();
            onClose();
        } catch (err) {
            setError('Xatolik yuz berdi');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={actionType === 'add' ? t('warehouse.addStock') : t('warehouse.sell')}
            onClose={onClose}
        >
            <form onSubmit={handleSubmit}>
                {error && <div className="alert alert-danger mb-md">{error}</div>}

                <div className="alert alert-info mb-md">
                    <strong>{item.name}</strong><br />
                    {t('warehouse.currentStock')}: {item.quantity} {item.unit}
                </div>

                <div className="form-group">
                    <label className="form-label">Miqdor ({item.unit}) *</label>
                    <input
                        type="number"
                        name="quantity"
                        className="form-input"
                        value={formData.quantity}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        placeholder="0"
                        autoFocus
                    />
                </div>

                {actionType === 'sell' && (
                    <div className="form-group">
                        <label className="form-label">Narx (1 {item.unit} uchun, so'm) *</label>
                        <input
                            type="number"
                            name="price"
                            className="form-input"
                            value={formData.price}
                            onChange={handleChange}
                            min="0"
                            step="100"
                            placeholder="0"
                        />
                    </div>
                )}

                {actionType === 'sell' && formData.quantity && formData.price && (
                    <div className="alert alert-info mb-md">
                        Jami: {(parseFloat(formData.quantity) * parseFloat(formData.price)).toLocaleString()} so'm
                    </div>
                )}

                <div className="form-group">
                    <label className="form-label">Sana *</label>
                    <input
                        type="date"
                        name="date"
                        className="form-input"
                        value={formData.date}
                        onChange={handleChange}
                    />
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

                <div className="modal-footer">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-outline"
                        disabled={loading}
                    >
                        Bekor qilish
                    </button>
                    <button
                        type="submit"
                        className={`btn ${actionType === 'sell' ? 'btn-secondary' : 'btn-primary'}`}
                        disabled={loading}
                    >
                        {loading ? 'Saqlanmoqda...' : 'Saqlash'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default WarehouseActionModal;
