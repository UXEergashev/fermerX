import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const LanguageSelector = () => {
    const { language, setLanguage, languages } = useLanguage();

    return (
        <div style={styles.container}>
            {languages.map((lang) => (
                <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    style={{
                        ...styles.button,
                        ...(language === lang.code ? styles.activeButton : {})
                    }}
                    title={lang.name}
                >
                    <span style={styles.flag}>{lang.flag}</span>
                    <span style={styles.code}>{lang.code.toUpperCase()}</span>
                </button>
            ))}
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        gap: '0.25rem',
        background: 'rgba(255, 255, 255, 0.15)',
        borderRadius: '0.5rem',
        padding: '0.25rem'
    },
    button: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.35rem 0.5rem',
        border: 'none',
        borderRadius: '0.375rem',
        background: 'transparent',
        color: 'rgba(255, 255, 255, 0.8)',
        cursor: 'pointer',
        fontSize: '0.75rem',
        fontWeight: '500',
        transition: 'all 0.2s ease'
    },
    activeButton: {
        background: 'rgba(255, 255, 255, 0.25)',
        color: 'white'
    },
    flag: {
        fontSize: '1rem'
    },
    code: {
        fontSize: '0.7rem',
        fontWeight: '600'
    }
};

export default LanguageSelector;
