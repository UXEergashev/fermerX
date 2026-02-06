import { getDB } from './database';

// Generic CRUD operations
export const add = async (storeName, data) => {
    const db = await getDB();
    return await db.add(storeName, data);
};

export const getAll = async (storeName, indexName = null, query = null) => {
    const db = await getDB();
    if (indexName && query) {
        return await db.getAllFromIndex(storeName, indexName, query);
    }
    return await db.getAll(storeName);
};

export const getById = async (storeName, id) => {
    const db = await getDB();
    return await db.get(storeName, id);
};

export const update = async (storeName, data) => {
    const db = await getDB();
    return await db.put(storeName, data);
};

export const remove = async (storeName, id) => {
    const db = await getDB();
    return await db.delete(storeName, id);
};

// User operations
export const createUser = async (userData) => {
    return await add('users', {
        ...userData,
        createdAt: new Date().toISOString()
    });
};

export const getUserByPhone = async (phone) => {
    const db = await getDB();
    return await db.getFromIndex('users', 'phone', phone);
};

// Get all data for a specific user
export const getAllByUserId = async (storeName, userId) => {
    return await getAll(storeName, 'userId', userId);
};
