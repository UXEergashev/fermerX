import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getAllByUserId, add, update, remove } from '../db/operations';
import Modal from '../components/Modal';
import WarehouseForm from '../components/WarehouseForm';
import WarehouseActionModal from '../components/WarehouseActionModal';
import {
    Package,
    Sprout,
    Beaker,
    Leaf,
    PlusCircle,
    CircleDollarSign,
    Edit,
    Trash2,
    AlertTriangle,
    Plus,
    Box
} from 'lucide-react';

const Warehouse = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [items, setItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('Barchasi');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showActionModal, setShowActionModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [actionItem, setActionItem] = useState(null);
    const [actionType, setActionType] = useState('add');

    const categories = [t('common.all'), 'Hosil', "O'g'it", "Urug'", 'Boshqa'];

    useEffect(() => {
        loadItems();
    }, []);

    useEffect(() => {
        if (selectedCategory === 'Barchasi') {
            setFilteredItems(items);
        } else {
            setFilteredItems(items.filter(item => item.category === selectedCategory));
        }
    }, [selectedCategory, items]);

    const loadItems = async () => {
        setLoading(true);
        const data = await getAllByUserId('warehouse', user.id);
        setItems(data);
        setFilteredItems(data);
        setLoading(false);
    };

    const handleAdd = () => {
        setEditingItem(null);
        setShowModal(true);
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (confirm(t('common.confirm') + '?')) {
            await remove('warehouse', id);
            loadItems();
        }
    };

    const handleSave = async (itemData) => {
        if (editingItem) {
            await update('warehouse', { ...itemData, id: editingItem.id });
        } else {
            await add('warehouse', { ...itemData, userId: user.id });
        }
        setShowModal(false);
        loadItems();
    };

    const handleAction = (item, type) => {
        setActionItem(item);
        setActionType(type);
        setShowActionModal(true);
    };

    if (loading) {
        return <div className="spinner-container"><div className="spinner"></div></div>;
    }

    return (
        <div>
            <div style={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="icon-container icon-primary">
                        <Package size={24} />
                    </div>
                    <h1>{t('warehouse.title')}</h1>
                </div>
                <button onClick={handleAdd} className="btn btn-primary">
                    <Plus size={18} /> {t('warehouse.addItem')}
                </button>
            </div>

            <div style={styles.categories}>
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        style={{
                            ...styles.categoryBtn,
                            ...(selectedCategory === cat ? styles.activeCategoryBtn : {})
                        }}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {filteredItems.length === 0 ? (
                <div className="empty-state">
                    <div className="icon-container icon-primary" style={{ padding: '2rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
                        <Package size={48} />
                    </div>
                    <div className="empty-state-text">{t('common.noData')}</div>
                    <button onClick={handleAdd} className="btn btn-primary mt-md">
                        <Plus size={18} /> {t('warehouse.addItem')}
                    </button>
                </div>
            ) : (
                <div className="grid grid-2">
                    {filteredItems.map((item) => (
                        <WarehouseCard
                            key={item.id}
                            item={item}
                            onEdit={() => handleEdit(item)}
                            onDelete={() => handleDelete(item.id)}
                            onAction={handleAction}
                        />
                    ))}
                </div>
            )}

            {showModal && (
                <Modal
                    title={editingItem ? t('warehouse.editItem') : t('warehouse.addItem')}
                    onClose={() => setShowModal(false)}
                >
                    <WarehouseForm
                        item={editingItem}
                        onSave={handleSave}
                        onCancel={() => setShowModal(false)}
                    />
                </Modal>
            )}

            {showActionModal && (
                <WarehouseActionModal
                    item={actionItem}
                    actionType={actionType}
                    onClose={() => setShowActionModal(false)}
                    onComplete={loadItems}
                />
            )}
        </div>
    );
};

const WarehouseCard = ({ item, onEdit, onDelete, onAction }) => {
    const getIcon = (category) => {
        switch (category) {
            case 'Hosil': return <Sprout size={18} />;
            case 'O\'g\'it': return <Beaker size={18} />;
            case 'Urug\'': return <Leaf size={18} />;
            default: return <Package size={18} />;
        }
    };

    const isLowStock = item.quantity < 10;

    return (
        <div className="card">
            <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="icon-container icon-primary" style={{ padding: '6px' }}>
                        {getIcon(item.category)}
                    </div>
                    <div>
                        <h3 className="card-title" style={{ margin: 0 }}>{item.name}</h3>
                        <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{item.category}</span>
                    </div>
                </div>
            </div>
            <div className="card-body">
                <div style={{
                    fontSize: '2rem',
                    fontWeight: '700',
                    color: isLowStock ? '#ef4444' : '#10b981',
                    marginBottom: '1rem'
                }}>
                    {item.quantity} {item.unit}
                </div>

                {isLowStock && (
                    <div className="alert alert-warning mb-md" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }}>
                        <AlertTriangle size={16} />
                        <span style={{ fontSize: '0.75rem' }}>Mahsulot qoldig'i kam!</span>
                    </div>
                )}

                <div style={styles.actions}>
                    <button
                        onClick={() => onAction(item, 'add')}
                        className="btn btn-sm btn-primary"
                        style={{ flex: 1, gap: '0.25rem' }}
                    >
                        <PlusCircle size={14} /> QO'SHILDI
                    </button>
                    <button
                        onClick={() => onAction(item, 'sell')}
                        className="btn btn-sm btn-secondary"
                        disabled={item.quantity === 0}
                        style={{ flex: 1, gap: '0.25rem' }}
                    >
                        <CircleDollarSign size={14} /> SOTILDI
                    </button>
                </div>

                <div style={styles.cardActions}>
                    <button onClick={onEdit} className="btn btn-sm btn-outline" style={{ flex: 1 }}>
                        <Edit size={14} />
                    </button>
                    <button onClick={onDelete} className="btn btn-sm btn-danger" style={{ flex: 1 }}>
                        <Trash2 size={14} />
                    </button>
                </div>
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
    categories: {
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap'
    },
    categoryBtn: {
        padding: '0.5rem 1rem',
        border: '2px solid var(--border)',
        background: 'var(--bg-card)',
        borderRadius: '0.5rem',
        cursor: 'pointer',
        fontSize: '0.875rem',
        fontWeight: '500',
        color: 'var(--text-muted)',
        transition: 'all 0.2s'
    },
    activeCategoryBtn: {
        borderColor: 'var(--primary)',
        background: 'var(--primary)',
        color: 'white'
    },
    actions: {
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1rem'
    },
    cardActions: {
        display: 'flex',
        gap: '0.5rem',
        paddingTop: '1rem',
        borderTop: '1px solid var(--border)'
    }
};

export default Warehouse;
