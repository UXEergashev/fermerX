import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUserByPhone, createUser } from '../db/operations';
import { initDB } from '../db/database';
import { auth } from '../db/firebase';
import { fullSync } from '../db/sync';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

// Dynamic import of Firebase auth module
let firebaseAuthModule = null;
const getFirebaseAuth = async () => {
    if (!auth) return null;
    if (!firebaseAuthModule) {
        try {
            firebaseAuthModule = await import('firebase/auth');
        } catch (e) {
            console.warn("Firebase auth module not available");
            return null;
        }
    }
    return firebaseAuthModule;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        let unsubscribe = null;

        const init = async () => {
            try {
                await initDB();
            } catch (err) {
                console.error("DB Init Error:", err);
            }

            // If Firebase auth is available, listen for state changes
            const fbAuth = await getFirebaseAuth();
            if (auth && fbAuth) {
                unsubscribe = fbAuth.onAuthStateChanged(auth, async (firebaseUser) => {
                    if (firebaseUser) {
                        const userSession = {
                            id: firebaseUser.uid,
                            name: firebaseUser.displayName || 'Fermer',
                            phone: firebaseUser.phoneNumber || firebaseUser.email,
                            email: firebaseUser.email
                        };
                        setUser(userSession);

                        // Perform initial sync from cloud
                        setIsSyncing(true);
                        try {
                            await fullSync();
                        } catch (e) {
                            console.error("Initial sync failed:", e);
                        } finally {
                            setIsSyncing(false);
                        }
                    } else {
                        setUser(null);
                    }
                    setLoading(false);
                });
            } else {
                // No Firebase - check localStorage for local session
                const savedUser = localStorage.getItem('fermerx_user');
                if (savedUser) {
                    try {
                        setUser(JSON.parse(savedUser));
                    } catch (e) {
                        localStorage.removeItem('fermerx_user');
                    }
                }
                setLoading(false);
            }
        };

        init();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const login = async (phoneOrEmail, password) => {
        // Try Firebase first
        const fbAuth = await getFirebaseAuth();
        if (auth && fbAuth) {
            try {
                const email = phoneOrEmail.includes('@') ? phoneOrEmail : `${phoneOrEmail}@fermerx.com`;
                await fbAuth.signInWithEmailAndPassword(auth, email, password);
                return { success: true };
            } catch (error) {
                console.error("Firebase Login Error:", error);
                // Fall through to local login
            }
        }

        // Local/offline login
        try {
            const localUser = await getUserByPhone(phoneOrEmail);
            if (localUser && localUser.password === password) {
                const userSession = {
                    id: localUser.id || 'local_user',
                    name: localUser.name,
                    phone: localUser.phone
                };
                setUser(userSession);
                localStorage.setItem('fermerx_user', JSON.stringify(userSession));
                return { success: true };
            }
        } catch (e) {
            console.error("Local login error:", e);
        }

        return { success: false, error: 'Login xatoligi. Telefon raqam yoki parol noto\'g\'ri.' };
    };

    const register = async (userData) => {
        // Try Firebase first
        const fbAuth = await getFirebaseAuth();
        if (auth && fbAuth) {
            try {
                const email = `${userData.phone}@fermerx.com`;
                const userCredential = await fbAuth.createUserWithEmailAndPassword(auth, email, userData.password);

                await fbAuth.updateProfile(userCredential.user, {
                    displayName: userData.name
                });

                // Also save locally for offline use
                await createUser({
                    ...userData,
                    id: userCredential.user.uid
                });

                return { success: true };
            } catch (error) {
                console.error("Firebase Register Error:", error);
                let message = 'Ro\'yxatdan o\'tishda xatolik';
                if (error.code === 'auth/email-already-in-use') message = 'Bu raqam allaqachon mavjud';
                if (error.code === 'auth/weak-password') message = 'Parol juda kuchsiz';
                return { success: false, error: message };
            }
        }

        // Local registration (offline mode)
        try {
            const existingUser = await getUserByPhone(userData.phone);
            if (existingUser) {
                return { success: false, error: 'Bu raqam allaqachon mavjud' };
            }

            const id = await createUser(userData);
            const userSession = {
                id: id || `local_${Date.now()}`,
                name: userData.name,
                phone: userData.phone
            };
            setUser(userSession);
            localStorage.setItem('fermerx_user', JSON.stringify(userSession));
            return { success: true };
        } catch (error) {
            console.error("Local Register Error:", error);
            return { success: false, error: 'Ro\'yxatdan o\'tishda xatolik' };
        }
    };

    const logout = async () => {
        try {
            const fbAuth = await getFirebaseAuth();
            if (auth && fbAuth) {
                try {
                    await fullSync();
                    await fbAuth.signOut(auth);
                } catch (e) {
                    console.error("Firebase signout error:", e);
                }
            }
            setUser(null);
            localStorage.removeItem('fermerx_user');
        } catch (error) {
            console.error("Logout error:", error);
            setUser(null);
            localStorage.removeItem('fermerx_user');
        }
    };

    const value = {
        user,
        login,
        register,
        logout,
        loading,
        isSyncing,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
