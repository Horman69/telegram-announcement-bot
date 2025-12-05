/**
 * Admin Configuration
 * Список Telegram ID администраторов, которые могут использовать команду /announce
 */

// ВАЖНО: Добавьте сюда свой Telegram ID после выполнения команды /myid
export const ADMIN_IDS = [
    221615370, // Руслан (@norman_p3)
    260638695 // Razmoik
];

/**
 * Проверяет, является ли пользователь администратором
 */
export function isAdmin(userId) {
    return ADMIN_IDS.includes(userId);
}
