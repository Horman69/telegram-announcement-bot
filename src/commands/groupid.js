import { Markup } from 'telegraf';
import { isAdmin } from '../config/admins.js';
import logger from '../services/logger.js';

/**
 * Команда /groupid
 * Получить ID текущей группы (работает только в группах)
 */
export function setupGroupIdCommand(bot) {
    bot.command('groupid', (ctx) => {
        const userId = ctx.from.id;

        // Проверка прав администратора
        logger.info(`User ${userId} trying to use /groupid. Admin check: ${isAdmin(userId)}`);

        if (!isAdmin(userId)) {
            logger.warn(`User ${userId} tried to use /groupid without admin rights`);
            return ctx.reply('❌ У вас нет прав для использования этой команды.');
        }

        // Проверяем, что команда вызвана в группе
        const chatType = ctx.chat.type;
        if (chatType !== 'group' && chatType !== 'supergroup') {
            return ctx.reply(
                '⚠️ Эта команда работает только в группах.\n\n' +
                'Отправьте её в группе, ID которой хотите узнать.'
            );
        }

        const chatId = ctx.chat.id;
        const chatTitle = ctx.chat.title || 'Без названия';

        logger.info(`Admin ${userId} requested group ID for ${chatTitle} (${chatId})`);

        const backKeyboard = Markup.inlineKeyboard([
            [Markup.button.callback('◀️ Назад в меню', 'menu:group_management')]
        ]);

        ctx.reply(
            `🆔 Информация о группе\n\n` +
            `📝 Название: ${chatTitle}\n` +
            `🔢 ID: <code>${chatId}</code>\n\n` +
            `💡 Скопируйте ID для использования в командах управления группами.`,
            { parse_mode: 'HTML', ...backKeyboard }
        );
    });
}
