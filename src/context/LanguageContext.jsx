import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, languages } from '../i18n/translations';

const LanguageContext = createContext();

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within LanguageProvider');
    }
    return context;
};

export const LanguageProvider = ({ children }) => {
    const [language, setLanguageState] = useState(() => {
        // Check localStorage for saved language preference
        const saved = localStorage.getItem('fermerx_language');
        return saved || 'uz'; // Default to Uzbek
    });

    useEffect(() => {
        localStorage.setItem('fermerx_language', language);
    }, [language]);

    const setLanguage = (langCode) => {
        if (translations[langCode]) {
            setLanguageState(langCode);
        }
    };

    // Translation function - supports nested keys like 'nav.home'
    const t = (key) => {
        const keys = key.split('.');
        let value = translations[language];

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                // Return key if translation not found
                console.warn(`Translation not found: ${key}`);
                return key;
            }
        }

        return value;
    };

    const value = {
        language,
        setLanguage,
        t,
        languages
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

export default LanguageContext;
