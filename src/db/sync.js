import { db } from './firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import * as localDB from './operations';

// Ma'lumotlarni Firebase-ga sinxronizatsiya qilish (Demo)
// Bu funksiya keyinchalik to'liq ishlatiladi
export const syncToCloud = async (userId) => {
    try {
        console.log("Sinxronizatsiya boshlandi...");
        // Misol: Cropsni sinxronlash
        const localCrops = await localDB.getAllByUserId('crops', userId);

        for (const crop of localCrops) {
            // Firestore-ga qo'shish
            await addDoc(collection(db, "crops"), {
                ...crop,
                syncedAt: new Date().toISOString()
            });
        }

        console.log("Sinxronizatsiya muvaffaqiyatli yakunlandi!");
    } catch (error) {
        console.error("Sync error:", error);
    }
};
