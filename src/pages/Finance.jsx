import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getAllByUserId, add, update, remove } from '../db/operations';
import Modal from '../components/Modal';
import {
    Wallet,
    TrendingUp,
    TrendingDown,
    Receipt,
    CircleDollarSign,
    Trash2,
    Edit,
    Calendar,
    ArrowUpCircle,
    ArrowDownCircle
} from 'lucide-react';

const Finance = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('expenses');
    const [expenses, setExpenses] = useState([]);
    const [income, setIncome] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [expensesData, incomeData] = await Promise.all([
            getAllByUserId('expenses', user.id),
            getAllByUserId('income', user.id)
        ]);
        setExpenses(expensesData.sort((a, b) => new Date(b.date) - new Date(a.date)));
        setIncome(incomeData.sort((a, b) => new Date(b.date) - new Date(a.date)));
        setLoading(false);
    };

    const handleAdd = () => {
        setEditing(null);
        setShowModal(true);
    };

    const handleEdit = (item) => {
        setEditing(item);
        setShowModal(true);
    };

    const handleDelete = async (id, type) => {
        if (confirm(t('common.confirm') + '?')) {
            await remove(type === 'expense' ? 'expenses' : 'income', id);
            loadData();
        }
    };

    const handleSave = async (data) => {
        const storeName = activeTab === 'expenses' ? 'expenses' : 'income';

        if (editing) {
            await update(storeName, { ...data, id: editing.id });
        } else {
            await add(storeName, { ...data, userId: user.id });
        }

        setShowModal(false);
        loadData();
    };

    const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
    const totalIncome = income.reduce((sum, inc) => sum + parseFloat(inc.amount || 0), 0);
    const balance = totalIncome - totalExpenses;

    if (loading) {
        return <div className="spinner-container"><div className="spinner"></div></div>;
    }

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div className="icon-container icon-primary">
                    <Wallet size={24} />
                </div>
                <h1 style={{ margin: 0 }}>{t('finance.title')}</h1>
            </div>

            <div className="grid grid-3 mb-lg">
                <div className="card" style={{ borderLeft: '4px solid #ef4444', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="icon-container icon-danger" style={{ padding: '6px' }}>
                            <ArrowDownCircle size={16} />
                        </div>
                        <div className="text-muted text-small" style={{ fontWeight: '500' }}>{t('dashboard.totalExpenses')}</div>
                    </div>
                    <div style={styles.amount}>
                        {totalExpenses.toLocaleString()} <span style={{ fontSize: '0.875rem' }}>{t('common.sum')}</span>
                    </div>
                </div>
                <div className="card" style={{ borderLeft: '4px solid #10b981', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="icon-container icon-primary" style={{ padding: '6px' }}>
                            <ArrowUpCircle size={16} />
                        </div>
                        <div className="text-muted text-small" style={{ fontWeight: '500' }}>{t('dashboard.totalIncome')}</div>
                    </div>
                    <div style={styles.amount}>
                        {totalIncome.toLocaleString()} <span style={{ fontSize: '0.875rem' }}>{t('common.sum')}</span>
                    </div>
                </div>
                <div className="card" style={{ borderLeft: `4px solid ${balance >= 0 ? '#3b82f6' : '#ef4444'}`, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className={`icon-container icon-${balance >= 0 ? 'secondary' : 'danger'}`} style={{ padding: '6px' }}>
                            {balance >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        </div>
                        <div className="text-muted text-small" style={{ fontWeight: '500' }}>{t('dashboard.balance')}</div>
                    </div>
                    <div style={{ ...styles.amount, color: balance >= 0 ? '#10b981' : '#ef4444' }}>
                        {balance.toLocaleString()} <span style={{ fontSize: '0.875rem' }}>{t('common.sum')}</span>
                    </div>
                </div>
            </div>

            <div style={styles.tabs}>
                <button
                    onClick={() => setActiveTab('expenses')}
                    style={{
                        ...styles.tab,
                        ...(activeTab === 'expenses' ? styles.activeTab : {})
                    }}
                >
                    {t('finance.expenses')} ({expenses.length})
                </button>
                <button
                    onClick={() => setActiveTab('income')}
                    style={{
                        ...styles.tab,
                        ...(activeTab === 'income' ? styles.activeTab : {})
                    }}
                >
                    {t('finance.income')} ({income.length})
                </button>
            </div>

            <div style={styles.actions}>
                <button onClick={handleAdd} className="btn btn-primary">
                    + {t('finance.addTransaction')}
                </button>
            </div>

            {activeTab === 'expenses' ? (
                expenses.length === 0 ? (
                    <div className="empty-state">
                        <div className="icon-container icon-danger" style={{ padding: '2rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
                            <Receipt size={48} />
                        </div>
                        <div className="empty-state-text">{t('common.noData')}</div>
                    </div>
                ) : (
                    <div className="grid">
                        {expenses.map((exp) => (
                            <FinanceCard
                                key={exp.id}
                                item={exp}
                                type="expense"
                                onEdit={() => handleEdit(exp)}
                                onDelete={() => handleDelete(exp.id, 'expense')}
                            />
                        ))}
                    </div>
                )
            ) : (
                income.length === 0 ? (
                    <div className="empty-state">
                        <div className="icon-container icon-primary" style={{ padding: '2rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
                            <CircleDollarSign size={48} />
                        </div>
                        <div className="empty-state-text">{t('common.noData')}</div>
                    </div>
                ) : (
                    <div className="grid">
                        {income.map((inc) => (
                            <FinanceCard
                                key={inc.id}
                                item={inc}
                                type="income"
                                onEdit={() => handleEdit(inc)}
                                onDelete={() => handleDelete(inc.id, 'income')}
                            />
                        ))}
                    </div>
                )
            )}

            {showModal && (
                <Modal
                    title={editing ?
                        (activeTab === 'expenses' ? t('crops.editCrop') : t('finance.incomeType')) :
                        (activeTab === 'expenses' ? t('crops.addExpense') : t('finance.addTransaction'))
                    }
                    onClose={() => setShowModal(false)}
                >
                    <FinanceForm
                        item={editing}
                        type={activeTab === 'expenses' ? 'expense' : 'income'}
                        onSave={handleSave}
                        onCancel={() => setShowModal(false)}
                    />
                </Modal>
            )}
        </div>
    );
};

const FinanceCard = ({ item, type, onEdit, onDelete }) => {
    const { t } = useLanguage();

    return (
        <div className="card">
            <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className={`icon-container icon-${type === 'expense' ? 'danger' : 'primary'}`} style={{ padding: '10px' }}>
                        {type === 'expense' ? <Receipt size={22} /> : <CircleDollarSign size={22} />}
                    </div>
                    <div>
                        <h3 className="card-title" style={{ margin: 0 }}>
                            {type === 'expense' ? item.type : item.source}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} className="text-muted text-small">
                            <Calendar size={12} />
                            <span>{new Date(item.date).toLocaleDateString('uz-UZ')}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-sm">
                    {!item.autoCreated && (
                        <>
                            <button onClick={onEdit} className="btn btn-sm btn-outline">
                                <Edit size={14} />
                            </button>
                            <button onClick={onDelete} className="btn btn-sm btn-danger">
                                <Trash2 size={14} />
                            </button>
                        </>
                    )}
                </div>
            </div>
            <div className="card-body">
                <div style={{
                    fontSize: '1.75rem',
                    fontWeight: '700',
                    color: type === 'expense' ? '#ef4444' : '#10b981',
                    marginBottom: '0.5rem'
                }}>
                    {parseFloat(item.amount).toLocaleString()} so'm
                </div>
                {item.notes && (
                    <p className="text-muted text-small">{item.notes}</p>
                )}
                {item.autoCreated && (
                    <span className="badge badge-primary mt-sm">{t('finance.autoCreated') || 'Avtomatik yaratilgan'}</span>
                )}
            </div>
        </div>
    );
};

const FinanceForm = ({ item, type, onSave, onCancel }) => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState({
        date: item?.date || new Date().toISOString().split('T')[0],
        type: item?.type || 'O\'g\'it',
        source: item?.source || '',
        amount: item?.amount || '',
        notes: item?.notes || ''
    });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            setError(t('auth.fillAllFields'));
            return;
        }

        if (type === 'expense' && !formData.type) {
            setError(t('auth.fillAllFields'));
            return;
        }

        if (type === 'income' && !formData.source.trim()) {
            setError(t('auth.fillAllFields'));
            return;
        }

        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit}>
            {error && <div className="alert alert-danger mb-md">{error}</div>}

            <div className="form-group">
                <label className="form-label">{t('common.date')} *</label>
                <input
                    type="date"
                    name="date"
                    className="form-input"
                    value={formData.date}
                    onChange={handleChange}
                />
            </div>

            {type === 'expense' ? (
                <div className="form-group">
                    <label className="form-label">{t('crops.expenseType')} *</label>
                    <select
                        name="type"
                        className="form-select"
                        value={formData.type}
                        onChange={handleChange}
                    >
                        <option value="O'g'it">{t('finance.categories.fertilizer')}</option>
                        <option value="Urug'">{t('finance.categories.seeds')}</option>
                        <option value="Yoqilg'i">{t('finance.categories.fuel')}</option>
                        <option value="Ish haqi">{t('finance.categories.labor')}</option>
                        <option value="Texnika">{t('finance.categories.equipment')}</option>
                        <option value="Suv">{t('finance.categories.water')}</option>
                        <option value="Transport">{t('finance.categories.transport')}</option>
                        <option value="Boshqa">{t('finance.categories.other')}</option>
                    </select>
                </div>
            ) : (
                <div className="form-group">
                    <label className="form-label">{t('finance.category') || 'Manba'} *</label>
                    <input
                        type="text"
                        name="source"
                        className="form-input"
                        value={formData.source}
                        onChange={handleChange}
                        placeholder={t('finance.sourcePlaceholder') || "Masalan: Bug'doy sotuvi"}
                    />
                </div>
            )}

            <div className="form-group">
                <label className="form-label">{t('common.amount')} ({t('common.sum')}) *</label>
                <input
                    type="number"
                    name="amount"
                    className="form-input"
                    value={formData.amount}
                    onChange={handleChange}
                    min="0"
                    step="1000"
                    placeholder="0"
                />
            </div>

            <div className="form-group">
                <label className="form-label">{t('crops.expenseNote')}</label>
                <textarea
                    name="notes"
                    className="form-textarea"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder={t('common.notes') || "Qo'shimcha ma'lumot..."}
                />
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

const styles = {
    tabs: {
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1rem',
        background: 'var(--bg-card)',
        padding: '0.5rem',
        borderRadius: '0.5rem',
        border: '1px solid var(--border)'
    },
    tab: {
        flex: 1,
        padding: '0.75rem',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        borderRadius: '0.375rem',
        fontWeight: '500',
        transition: 'all 0.2s',
        color: 'var(--text-muted)'
    },
    activeTab: {
        background: 'var(--primary)',
        color: 'white'
    },
    actions: {
        marginBottom: '1rem'
    },
    amount: {
        fontSize: '1.5rem',
        fontWeight: '700',
        marginTop: '0.5rem'
    }
};

export default Finance;
