import { db, auth } from './firebase';
import * as localDB from './operations';

let firestoreModule = null;

// Only load Firestore if Firebase is configured
const getFirestoreModule = async () => {
    if (!db) return null;
    if (!firestoreModule) {
        try {
            firestoreModule = await import('firebase/firestore');
        } catch (e) {
            console.warn("Firestore module not available");
            return null;
        }
    }
    return firestoreModule;
};

const STORES_TO_SYNC = ['crops', 'land', 'expenses', 'income', 'warehouse', 'warehouseHistory', 'notifications', 'trash'];

/**
 * Sync local data to Cloud (Firestore)
 */
export const syncLocalToCloud = async () => {
    if (!auth?.currentUser || !db) return { success: false, error: 'Firebase not configured or user not logged in' };

    const fs = await getFirestoreModule();
    if (!fs) return { success: false, error: 'Firestore not available' };

    const user = auth.currentUser;

    try {
        const batch = fs.writeBatch(db);
        let syncCount = 0;

        for (const storeName of STORES_TO_SYNC) {
            const localData = await localDB.getAllByUserId(storeName, user.uid);

            for (const item of localData) {
                const docId = `${storeName}_${item.id}`;
                const docRef = fs.doc(db, 'userData', user.uid, 'data', docId);

                batch.set(docRef, {
                    ...item,
                    _storeName: storeName,
                    _updatedAt: fs.serverTimestamp(),
                    userId: user.uid
                });
                syncCount++;
            }
        }

        if (syncCount > 0) {
            await batch.commit();
        }

        return { success: true, count: syncCount };
    } catch (error) {
        console.error("Cloud Sync Error (Local -> Cloud):", error);
        return { success: false, error: error.message };
    }
};

/**
 * Sync Cloud data to Local (IndexedDB)
 */
export const syncCloudToLocal = async () => {
    if (!auth?.currentUser || !db) return { success: false, error: 'Firebase not configured or user not logged in' };

    const fs = await getFirestoreModule();
    if (!fs) return { success: false, error: 'Firestore not available' };

    const user = auth.currentUser;

    try {
        const q = fs.query(fs.collection(db, 'userData', user.uid, 'data'));
        const querySnapshot = await fs.getDocs(q);

        for (const docSnap of querySnapshot.docs) {
            const cloudData = docSnap.data();
            const { _storeName, _updatedAt, ...localData } = cloudData;

            await localDB.update(_storeName, localData);
        }

        return { success: true, count: querySnapshot.size };
    } catch (error) {
        console.error("Cloud Sync Error (Cloud -> Local):", error);
        return { success: false, error: error.message };
    }
};

/**
 * Sync a single item to Cloud
 */
export const syncSingleToCloud = async (storeName, item) => {
    if (!auth?.currentUser || !db) return { success: false, error: 'Firebase not configured' };

    const fs = await getFirestoreModule();
    if (!fs) return { success: false, error: 'Firestore not available' };

    const user = auth.currentUser;

    try {
        const docId = `${storeName}_${item.id}`;
        const docRef = fs.doc(db, 'userData', user.uid, 'data', docId);

        await fs.setDoc(docRef, {
            ...item,
            _storeName: storeName,
            _updatedAt: fs.serverTimestamp(),
            userId: user.uid
        });

        return { success: true };
    } catch (error) {
        console.error(`Sync Single to Cloud Error (${storeName}):`, error);
        return { success: false, error: error.message };
    }
};

/**
 * Remove a single item from Cloud
 */
export const removeSingleFromCloud = async (storeName, id) => {
    if (!auth?.currentUser || !db) return { success: false, error: 'Firebase not configured' };

    const fs = await getFirestoreModule();
    if (!fs) return { success: false, error: 'Firestore not available' };

    const user = auth.currentUser;

    try {
        const docId = `${storeName}_${id}`;
        const docRef = fs.doc(db, 'userData', user.uid, 'data', docId);
        await fs.deleteDoc(docRef);
        return { success: true };
    } catch (error) {
        console.error(`Remove Single from Cloud Error (${storeName}):`, error);
        return { success: false, error: error.message };
    }
};

/**
 * Full bi-directional sync
 */
export const fullSync = async () => {
    if (!auth?.currentUser || !db) {
        console.log("Sync skipped - Firebase not configured or user not authenticated");
        return { success: false, error: 'Firebase not available' };
    }

    console.log("Starting full sync...");
    const toLocal = await syncCloudToLocal();
    const toCloud = await syncLocalToCloud();

    console.log("Sync finished.", { toCloud, toLocal });
    return { toCloud, toLocal };
};
