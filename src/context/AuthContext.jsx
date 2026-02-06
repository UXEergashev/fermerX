import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUserByPhone, createUser } from '../db/operations';
import { initDB } from '../db/database';
// Firebase importlari (keyinchalik to'liq o'tish uchun)
// import { auth } from '../db/firebase';
// import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Ma'lumotlar bazasini ishga tushirish
        const init = async () => {
            try {
                await initDB();
                const savedUser = localStorage.getItem('fermerx_user');
                if (savedUser) {
                    setUser(JSON.parse(savedUser));
                }
            } catch (err) {
                console.error("DB Init Error:", err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const login = async (phone, password) => {
        try {
            // Hozirda local bazadan qidiramiz
            const userData = await getUserByPhone(phone);

            if (!userData) {
                throw new Error('Foydalanuvchi topilmadi');
            }

            if (userData.password !== password) {
                throw new Error('Parol noto\'g\'ri');
            }

            const userSession = {
                id: userData.id,
                name: userData.name,
                phone: userData.phone
            };

            setUser(userSession);
            localStorage.setItem('fermerx_user', JSON.stringify(userSession));

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const register = async (userData) => {
        try {
            const existingUser = await getUserByPhone(userData.phone);
            if (existingUser) {
                throw new Error("Bu telefon raqami allaqachon ro'yxatdan o'tgan");
            }

            const id = await createUser(userData);
            const userSession = {
                id,
                name: userData.name,
                phone: userData.phone
            };

            setUser(userSession);
            localStorage.setItem('fermerx_user', JSON.stringify(userSession));

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('fermerx_user');
    };

    const value = {
        user,
        login,
        register,
        logout,
        loading,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

