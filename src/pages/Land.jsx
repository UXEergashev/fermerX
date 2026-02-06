import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getAllByUserId, add, update, remove } from '../db/operations';
import { getLandUsage } from '../db/calculations';
import Modal from '../components/Modal';
import LandForm from '../components/LandForm';
import {
    Map as MapIcon,
    Edit,
    Trash2,
    Info
} from 'lucide-react';

const Land = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [lands, setLands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingLand, setEditingLand] = useState(null);
    const [totalStats, setTotalStats] = useState({ total: 0, used: 0, empty: 0 });

    useEffect(() => {
        loadLands();
    }, []);

    const loadLands = async () => {
        setLoading(true);
        const data = await getLandUsage(user.id);
        setLands(data);

        // Calculate totals
        const total = data.reduce((sum, land) => sum + parseFloat(land.totalArea), 0);
        const used = data.reduce((sum, land) => sum + parseFloat(land.usedArea || 0), 0);
        const empty = total - used;

        setTotalStats({ total, used, empty });
        setLoading(false);
    };

    const handleAdd = () => {
        setEditingLand(null);
        setShowModal(true);
    };

    const handleEdit = (land) => {
        setEditingLand(land);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (confirm(t('common.confirm') + '?')) {
            await remove('land', id);
            loadLands();
        }
    };

    const handleSave = async (landData) => {
        if (editingLand) {
            await update('land', { ...landData, id: editingLand.id });
        } else {
            await add('land', { ...landData, userId: user.id });
        }
        setShowModal(false);
        loadLands();
    };

    if (loading) {
        return <div className="spinner-container"><div className="spinner"></div></div>;
    }

    return (
        <div>
            <div style={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="icon-container icon-primary">
                        <MapIcon size={24} />
                    </div>
                    <h1>{t('land.title')}</h1>
                </div>
                <button onClick={handleAdd} className="btn btn-primary">
                    + {t('land.addLand')}
                </button>
            </div>

            <div className="card mb-lg" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}>
                <h3 style={{ marginBottom: '1rem' }}>{t('common.total')}</h3>
                <div className="grid grid-3">
                    <div>
                        <div style={styles.statLabel}>{t('dashboard.totalLand')}</div>
                        <div style={styles.statValue}>{totalStats.total.toFixed(2)} {t('common.ha')}</div>
                    </div>
                    <div>
                        <div style={styles.statLabel}>{t('land.planted')}</div>
                        <div style={styles.statValue}>{totalStats.used.toFixed(2)} {t('common.ha')}</div>
                    </div>
                    <div>
                        <div style={styles.statLabel}>{t('dashboard.emptyLand')}</div>
                        <div style={styles.statValue}>{totalStats.empty.toFixed(2)} {t('common.ha')}</div>
                    </div>
                </div>
            </div>

            {lands.length === 0 ? (
                <div className="empty-state">
                    <div className="icon-container icon-primary" style={{ padding: '2rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
                        <MapIcon size={48} />
                    </div>
                    <div className="empty-state-text">{t('common.noData')}</div>
                    <button onClick={handleAdd} className="btn btn-primary mt-md">
                        + {t('land.addLand')}
                    </button>
                </div>
            ) : (
                <div className="grid">
                    {lands.map((land) => (
                        <LandCard
                            key={land.id}
                            land={land}
                            onEdit={() => handleEdit(land)}
                            onDelete={() => handleDelete(land.id)}
                        />
                    ))}
                </div>
            )}

            {showModal && (
                <Modal
                    title={editingLand ? t('land.editLand') : t('land.addLand')}
                    onClose={() => setShowModal(false)}
                >
                    <LandForm
                        land={editingLand}
                        onSave={handleSave}
                        onCancel={() => setShowModal(false)}
                    />
                </Modal>
            )}
        </div>
    );
};

const LandCard = ({ land, onEdit, onDelete }) => {
    const usagePercent = (parseFloat(land.usedArea) / parseFloat(land.totalArea)) * 100;

    return (
        <div className="card">
            <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="icon-container icon-primary" style={{ padding: '6px' }}>
                        <MapIcon size={18} />
                    </div>
                    <h3 className="card-title">{land.name}</h3>
                </div>
                <div className="flex gap-sm">
                    <button onClick={onEdit} className="btn btn-sm btn-outline">
                        <Edit size={14} />
                    </button>
                    <button onClick={onDelete} className="btn btn-sm btn-danger">
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
            <div className="card-body">
                <div style={styles.info}>
                    <span className="text-muted">Tuproq turi:</span>
                    <span>{land.soilType}</span>
                </div>
                <div style={styles.info}>
                    <span className="text-muted">Jami maydon:</span>
                    <span className="text-primary">{land.totalArea} ga</span>
                </div>
                <div style={styles.info}>
                    <span className="text-muted">Ekilgan:</span>
                    <span>{land.usedArea} ga</span>
                </div>
                <div style={styles.info}>
                    <span className="text-muted">Bo'sh:</span>
                    <span className="text-primary" style={{ fontWeight: '600' }}>{land.emptyArea} ga</span>
                </div>

                <div style={styles.progressContainer}>
                    <div style={styles.progressLabel}>
                        <span>Foydalanish: {usagePercent.toFixed(1)}%</span>
                    </div>
                    <div style={styles.progressBar}>
                        <div
                            style={{
                                ...styles.progressFill,
                                width: `${Math.min(usagePercent, 100)}%`,
                                background: usagePercent > 90 ? '#ef4444' : usagePercent > 70 ? '#f59e0b' : '#10b981'
                            }}
                        />
                    </div>
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
    statLabel: {
        fontSize: '0.875rem',
        opacity: 0.9,
        marginBottom: '0.25rem'
    },
    statValue: {
        fontSize: '1.5rem',
        fontWeight: '700'
    },
    info: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '0.5rem 0',
        borderBottom: '1px solid var(--border)'
    },
    progressContainer: {
        marginTop: '1rem'
    },
    progressLabel: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.875rem',
        marginBottom: '0.5rem',
        color: 'var(--text-muted)'
    },
    progressBar: {
        height: '8px',
        background: 'var(--border)',
        borderRadius: '9999px',
        overflow: 'hidden'
    },
    progressFill: {
        height: '100%',
        transition: 'width 0.3s ease'
    }
};

export default Land;
