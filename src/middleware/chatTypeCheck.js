/**
 * Middleware для проверки типа чата
 * Блокирует команды в группах, разрешает только в личных сообщениях
 */

import logger from '../services/logger.js';

/**
 * Проверяет тип чата и блокирует команды в группах
 * @param {Object} ctx - Контекст Telegraf
 * @param {Function} next - Следующий middleware
 */
export async function chatTypeCheck(ctx, next) {
    // Получаем тип чата
    const chatType = ctx.chat?.type;
    const updateType = ctx.updateType;

    // Разрешаем системные события (добавление/удаление бота из группы)
    if (updateType === 'my_chat_member') {
        return next();
    }

    // Если это группа или супергруппа
    if (chatType === 'group' || chatType === 'supergroup') {
        // Проверяем только текстовые сообщения с командами
        if (updateType === 'message' && ctx.message?.text) {
            const userId = ctx.from?.id;
            const userName = ctx.from?.username || ctx.from?.first_name || 'Unknown';
            const messageText = ctx.message.text;

            // Проверяем, является ли это командой (начинается с /)
            if (messageText.startsWith('/')) {
                // Разрешаем команды /myid и /groupid в группах
                // Эти команды помогают узнать ID для настройки бота
                const allowedCommands = ['/myid', '/groupid'];
                const isAllowedCommand = allowedCommands.some(cmd => messageText.startsWith(cmd));

                if (isAllowedCommand) {
                    logger.info(
                        `Allowed command in group chat. User: ${userName} (${userId}), ` +
                        `Chat: ${ctx.chat.title} (${ctx.chat.id}), Command: ${messageText}`
                    );
                    return next();
                }

                // Блокируем все остальные команды
                logger.warn(
                    `Blocked command in group chat. User: ${userName} (${userId}), ` +
                    `Chat: ${ctx.chat.title} (${ctx.chat.id}), Command: ${messageText}`
                );

                // Игнорируем команду (не отвечаем в группе)
                return;
            }
        }

        // Для всех остальных типов обновлений в группах (не команды) - пропускаем
        return next();
    }

    // Если это личное сообщение - пропускаем дальше
    if (chatType === 'private') {
        // Логируем команды в личных сообщениях для отладки
        if (ctx.message?.text?.startsWith('/')) {
            logger.info(`[CHAT_TYPE_CHECK] Private chat command: ${ctx.message.text} from user ${ctx.from?.id}`);
        }
        return next();
    }

    // Для всех остальных случаев - игнорируем
    logger.warn(`Unknown chat type: ${chatType}`);
}

export default chatTypeCheck;
