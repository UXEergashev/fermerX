import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUser, getUserByPhone } from '../db/operations';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

const Register = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const { t } = useLanguage();
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    const validateForm = () => {
        if (!formData.name.trim()) {
            setError(t('auth.fillAllFields'));
            return false;
        }

        if (!formData.phone.trim()) {
            setError(t('auth.fillAllFields'));
            return false;
        }

        // Basic phone validation (Uzbekistan format)
        const phoneRegex = /^\+?998?[0-9]{9}$/;
        if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
            setError(t('auth.fillAllFields'));
            return false;
        }

        if (formData.password.length < 6) {
            setError(t('auth.fillAllFields'));
            return false;
        }

        if (formData.password !== formData.confirmPassword) {
            setError(t('auth.passwordMismatch'));
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            // Check if user already exists
            const existingUser = await getUserByPhone(formData.phone);
            if (existingUser) {
                setError(t('auth.phoneExists'));
                setLoading(false);
                return;
            }

            // Create new user
            await createUser({
                name: formData.name,
                phone: formData.phone,
                password: formData.password
            });

            // Auto-login after registration
            await login(formData.phone, formData.password);
            navigate('/');
        } catch (err) {
            setError(t('auth.fillAllFields'));
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.langSelector}>
                <LanguageSelector />
            </div>
            <div style={styles.card}>
                <div style={styles.header}>
                    <img src="/favicon.png" alt="Logo" style={{ width: '64px', height: '64px', borderRadius: '16px', marginBottom: '1rem' }} />
                    <h1 style={styles.title}>FermerX</h1>
                    <p style={styles.subtitle}>{t('auth.register')}</p>
                </div>

                <form onSubmit={handleSubmit}>
                    {error && (
                        <div className="alert alert-danger">
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">{t('auth.name')}</label>
                        <input
                            type="text"
                            name="name"
                            className="form-input"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder={t('auth.namePlaceholder')}
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('auth.phone')}</label>
                        <input
                            type="tel"
                            name="phone"
                            className="form-input"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder={t('auth.phonePlaceholder')}
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('auth.password')}</label>
                        <input
                            type="password"
                            name="password"
                            className="form-input"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder={t('auth.passwordPlaceholder')}
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('auth.confirmPassword')}</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            className="form-input"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder={t('auth.passwordPlaceholder')}
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary w-full"
                        disabled={loading}
                    >
                        {loading ? t('auth.waiting') : t('auth.register')}
                    </button>

                    <p style={styles.footer}>
                        {t('auth.hasAccount')}{' '}
                        <Link to="/login" style={styles.link}>{t('auth.login')}</Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        position: 'relative'
    },
    langSelector: {
        position: 'absolute',
        top: '1rem',
        right: '1rem'
    },
    card: {
        background: 'var(--bg-card)',
        borderRadius: '1.5rem',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '450px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        margin: '2rem 0'
    },
    header: {
        textAlign: 'center',
        marginBottom: '2rem'
    },
    title: {
        fontSize: '2.5rem',
        fontWeight: '800',
        color: 'var(--primary)',
        marginBottom: '0.5rem',
        letterSpacing: '-1px'
    },
    subtitle: {
        color: 'var(--text-muted)',
        fontSize: '1rem',
        fontWeight: '500'
    },
    footer: {
        textAlign: 'center',
        marginTop: '2rem',
        color: 'var(--text-muted)',
        fontSize: '0.875rem'
    },
    link: {
        color: 'var(--primary)',
        fontWeight: '700',
        textDecoration: 'none'
    }
};

export default Register;

