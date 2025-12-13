import { Markup } from 'telegraf';
import { isAdmin } from '../config/admins.js';
import groupManager from '../services/groupManager.js';
import logger from '../services/logger.js';

/**
 * Команда /groups
 * Показывает список всех зарегистрированных групп (только для админов)
 */
export function setupGroupsCommand(bot) {
    bot.command('groups', (ctx) => {
        const userId = ctx.from.id;

        // Проверка прав администратора
        if (!isAdmin(userId)) {
            logger.warn(`User ${userId} tried to access /groups without admin rights`);
            return ctx.reply('❌ У вас нет прав для использования этой команды.');
        }

        const groups = groupManager.getGroups();

        if (groups.length === 0) {
            const backKeyboard = Markup.inlineKeyboard([
                [Markup.button.callback('◀️ Назад', 'menu:group_management')]
            ]);
            return ctx.reply(
                '📋 Список групп пуст.\n\n' +
                'Добавьте бота в группу, и она автоматически появится в списке.\n' +
                'Или добавьте группу вручную через меню управления группами.',
                backKeyboard
            );
        }

        let message = `📋 Зарегистрированные группы (${groups.length}):\n\n`;

        groups.forEach((group, index) => {
            const addedDate = new Date(group.addedAt).toLocaleDateString('ru-RU');
            message += `${index + 1}. ${group.title}\n`;
            message += `   ID: <code>${group.id}</code>\n`;

            // Показываем теги, если они есть
            if (group.tags && group.tags.length > 0) {
                const tagsStr = group.tags.map(tag => `#${tag}`).join(', ');
                message += `   Теги: ${tagsStr}\n`;
            }

            // Показываем способ добавления
            if (group.addedManually) {
                message += `   📝 Добавлена вручную\n`;
            }

            message += `   Добавлена: ${addedDate}\n\n`;
        });

        // Создаем кнопки для удаления каждой группы
        const buttons = [];
        groups.forEach((group) => {
            buttons.push([
                Markup.button.callback(`🗑️ Удалить "${group.title}"`, `delete_group:${group.id}`)
            ]);
        });

        // Добавляем кнопку "Назад"
        buttons.push([Markup.button.callback('◀️ Назад', 'menu:group_management')]);

        const keyboard = Markup.inlineKeyboard(buttons);

        logger.info(`Admin ${userId} viewed groups list`);
        ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
    });
}
