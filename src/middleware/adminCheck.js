/**
 * Middleware для проверки прав администратора
 * Блокирует доступ к командам для не-администраторов
 */

import { isAdmin } from '../config/admins.js';
import logger from '../services/logger.js';

/**
 * Проверяет, является ли пользователь администратором
 * @param {Object} ctx - Контекст Telegraf
 * @param {Function} next - Следующий middleware
 */
export async function adminCheck(ctx, next) {
    const userId = ctx.from?.id;
    const userName = ctx.from?.username || ctx.from?.first_name || 'Unknown';

    if (!userId) {
        logger.warn('Admin check: User ID not found');
        return ctx.reply('❌ Ошибка: не удалось определить пользователя');
    }

    // Проверяем, является ли это командой
    const messageText = ctx.message?.text || ctx.callbackQuery?.data || '';
    const isCommand = messageText.startsWith('/') || ctx.updateType === 'callback_query';

    // Если это не команда и не callback - пропускаем проверку прав
    if (!isCommand) {
        return next();
    }

    // Логируем команду для отладки
    if (messageText.startsWith('/')) {
        logger.info(`[ADMIN_CHECK] Processing command: ${messageText} from user ${userId}`);
    }

    // Команды, доступные всем пользователям (не требуют прав администратора)
    const ALLOWED_NON_ADMIN_COMMANDS = [
        '/start',
        '/help',
        '/menu',
        '/myid',
        '/cancel',
        '/register'  // Регистрация для получения рассылок
    ];

    // Callback-действия, доступные всем пользователям
    const ALLOWED_NON_ADMIN_CALLBACKS = [
        'confirm_registration',
        'cancel_registration',
        'menu:user',
        'menu:main',
        'menu:action:register'
    ];

    // Проверяем, является ли команда разрешённой для всех
    const isAllowedCommand = ALLOWED_NON_ADMIN_COMMANDS.some(cmd => messageText.startsWith(cmd));
    const isAllowedCallback = ALLOWED_NON_ADMIN_CALLBACKS.some(cb => messageText.startsWith(cb));

    if (isAllowedCommand || isAllowedCallback) {
        logger.info(`[ADMIN_CHECK] Allowing command for all users: ${messageText}`);
        return next();
    }

    if (!isAdmin(userId)) {
        logger.warn(
            `Access denied for non-admin user: ${userName} (${userId})`
        );

        return ctx.reply(
            '🚫 <b>Доступ запрещён</b>\n\n' +
            'Этот бот доступен только для администраторов.\n\n' +
            'Если вы хотите стать администратором:\n' +
            '1. Используйте команду /myid\n' +
            '2. Отправьте ваш ID текущему администратору\n' +
            '3. Администратор добавит вас через команду /addadmin',
            { parse_mode: 'HTML' }
        );
    }

    // Пользователь - администратор, пропускаем дальше
    logger.info(`Admin access granted: ${userName} (${userId})`);
    return next();
}

export default adminCheck;
