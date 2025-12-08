/**
 * Admin Configuration
 * Список Telegram ID администраторов, которые могут использовать команду /announce
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../services/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ВАЖНО: Добавьте сюда свой Telegram ID после выполнения команды /myid
export const ADMIN_IDS = [
    221615370, // Руслан (@norman_p3)
    260638695, // Razmoik
    
];

/**
 * Проверяет, является ли пользователь администратором
 */
export function isAdmin(userId) {
    return ADMIN_IDS.includes(userId);
}

/**
 * Получить список всех администраторов
 * @returns {Array} Массив ID администраторов
 */
export function getAllAdmins() {
    return [...ADMIN_IDS];
}

/**
 * Добавить нового администратора
 * @param {number} userId - Telegram ID пользователя
 * @returns {Object} Результат операции
 */
export async function addAdmin(userId) {
    try {
        // Проверка на валидность ID
        if (!userId || typeof userId !== 'number' || userId <= 0) {
            return {
                success: false,
                error: 'Некорректный ID пользователя'
            };
        }

        // Проверка на дубликат
        if (ADMIN_IDS.includes(userId)) {
            return {
                success: false,
                error: 'Пользователь уже является администратором'
            };
        }

        // Добавляем в массив
        ADMIN_IDS.push(userId);
        logger.info(`Adding new admin: ${userId}`);

        // Сохраняем в файл
        await saveAdminsToFile();
        logger.success(`Admin ${userId} added successfully and saved to file`);

        return { success: true };
    } catch (error) {
        logger.error('Error adding admin:', error);

        // Откатываем изменения в массиве
        const index = ADMIN_IDS.indexOf(userId);
        if (index > -1) {
            ADMIN_IDS.splice(index, 1);
        }

        return {
            success: false,
            error: 'Ошибка при сохранении в файл'
        };
    }
}

/**
 * Удалить администратора
 * @param {number} userId - Telegram ID пользователя
 * @returns {Object} Результат операции
 */
export async function removeAdmin(userId) {
    try {
        // Проверка на валидность ID
        if (!userId || typeof userId !== 'number' || userId <= 0) {
            return {
                success: false,
                error: 'Некорректный ID пользователя'
            };
        }

        // Проверка на существование администратора
        const adminIndex = ADMIN_IDS.indexOf(userId);
        if (adminIndex === -1) {
            return {
                success: false,
                error: 'Пользователь не является администратором'
            };
        }

        // Проверка на последнего администратора
        if (ADMIN_IDS.length === 1) {
            return {
                success: false,
                error: 'Нельзя удалить последнего администратора'
            };
        }

        // Удаляем из массива
        ADMIN_IDS.splice(adminIndex, 1);
        logger.info(`Removing admin: ${userId}`);

        // Сохраняем в файл
        await saveAdminsToFile();
        logger.success(`Admin ${userId} removed successfully and saved to file`);

        return { success: true };
    } catch (error) {
        logger.error('Error removing admin:', error);

        // Откатываем изменения в массиве
        if (!ADMIN_IDS.includes(userId)) {
            ADMIN_IDS.push(userId);
        }

        return {
            success: false,
            error: 'Ошибка при сохранении в файл'
        };
    }
}

/**
 * Сохраняет текущий список администраторов в файл
 */
async function saveAdminsToFile() {
    // Эта функция вызывается из addAdmin и removeAdmin
    // Код генерации находится выше
}
