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
        message += `💡 <b>Подсказка:</b> Для отправки в конкретную тему форума:\n`;
        message += `   1. Откройте нужную тему в группе\n`;
        message += `   2. Отправьте команду /settopic\n\n`;
        message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

        groups.forEach((group, index) => {
            const addedDate = new Date(group.addedAt).toLocaleDateString('ru-RU');

            // Добавляем иконку форума, если установлена тема
            const forumIcon = group.threadId ? ' 💬' : '';
            message += `${index + 1}. ${group.title}${forumIcon}\n`;
            message += `   ID: <code>${group.id}</code>\n`;

            // Показываем теги, если они есть
            if (group.tags && group.tags.length > 0) {
                const tagsStr = group.tags.map(tag => `#${tag}`).join(', ');
                message += `   Теги: ${tagsStr}\n`;
            }

            // Показываем тему форума, если установлена
            if (group.threadId) {
                message += `   📍 Тема форума: ID ${group.threadId}\n`;
            }

            // Показываем способ добавления
            if (group.addedManually) {
                message += `   📝 Добавлена вручную\n`;
            }

            message += `   Добавлена: ${addedDate}\n\n`;
        });

        // Создаем кнопки для каждой группы
        const buttons = [];
        groups.forEach((group) => {
            const groupButtons = [
                Markup.button.callback(`🗑️ Удалить "${group.title}"`, `delete_group:${group.id}`)
            ];

            // Добавляем кнопку сброса темы, если тема установлена
            if (group.threadId) {
                groupButtons.push(
                    Markup.button.callback(`🔄 Сбросить тему`, `reset_topic:${group.id}`)
                );
            }

            buttons.push(groupButtons);
        });

        // Добавляем кнопки помощи и "Назад"
        buttons.push([Markup.button.callback('ℹ️ О форумах', 'forum_help')]);
        buttons.push([Markup.button.callback('◀️ Назад', 'menu:group_management')]);

        const keyboard = Markup.inlineKeyboard(buttons);

        logger.info(`Admin ${userId} viewed groups list`);
        ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
    });

    // Обработчик кнопки "Сбросить тему"
    bot.action(/reset_topic:(.+)/, async (ctx) => {
        const userId = ctx.from.id;

        if (!isAdmin(userId)) {
            return ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
        }

        const groupId = parseInt(ctx.match[1]);
        const group = groupManager.getGroupById(groupId);

        if (!group) {
            await ctx.answerCbQuery('❌ Группа не найдена', { show_alert: true });
            return;
        }

        // Сбрасываем тему
        groupManager.setThreadId(groupId, null);

        await ctx.answerCbQuery('✅ Тема сброшена! Рассылка будет идти в General');

        // Обновляем сообщение со списком групп
        const groups = groupManager.getGroups();
        let message = `📋 Зарегистрированные группы (${groups.length}):\n\n`;

        groups.forEach((group, index) => {
            const addedDate = new Date(group.addedAt).toLocaleDateString('ru-RU');
            message += `${index + 1}. ${group.title}\n`;
            message += `   ID: <code>${group.id}</code>\n`;

            if (group.tags && group.tags.length > 0) {
                const tagsStr = group.tags.map(tag => `#${tag}`).join(', ');
                message += `   Теги: ${tagsStr}\n`;
            }

            if (group.threadId) {
                message += `   📍 Тема: ID ${group.threadId}\n`;
            } else {
                message += `   📍 Тема: General (по умолчанию)\n`;
            }

            if (group.addedManually) {
                message += `   📝 Добавлена вручную\n`;
            }

            message += `   Добавлена: ${addedDate}\n\n`;
        });

        const buttons = [];
        groups.forEach((group) => {
            const groupButtons = [
                Markup.button.callback(`🗑️ Удалить "${group.title}"`, `delete_group:${group.id}`)
            ];

            if (group.threadId) {
                groupButtons.push(
                    Markup.button.callback(`🔄 Сбросить тему`, `reset_topic:${group.id}`)
                );
            }

            buttons.push(groupButtons);
        });

        buttons.push([Markup.button.callback('◀️ Назад', 'menu:group_management')]);

        const keyboard = Markup.inlineKeyboard(buttons);

        await ctx.editMessageText(message, { parse_mode: 'HTML', ...keyboard });
        logger.info(`Admin ${userId} reset topic for group ${groupId}`);
    });

    // Обработчик кнопки "О форумах"
    bot.action('forum_help', async (ctx) => {
        await ctx.answerCbQuery();
        
        const helpMessage = 
            `💬 <b>Работа с форумами Telegram</b>\n\n` +
            `<b>Что это?</b>\n` +
            `Если ваша группа - форум, вы можете отправлять рассылки в конкретные темы.\n\n` +
            `<b>Как установить тему:</b>\n` +
            `1. Откройте нужную тему в Telegram\n` +
            `2. Найдите ID темы (обычно это число 1, 2, 3...)\n` +
            `3. В группе отправьте: <code>/settopic &lt;ID&gt;</code>\n` +
            `   Пример: <code>/settopic 1</code>\n\n` +
            `<b>Как сбросить:</b>\n` +
            `В группе отправьте: <code>/settopic reset</code>\n\n` +
            `<b>Как отправить рассылку:</b>\n` +
            `Просто используйте обычные команды рассылки - бот автоматически отправит в установленную тему!\n\n` +
            `💡 Группы с установленной темой отмечены иконкой 💬`;
        
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('◀️ К списку групп', 'action:group_list')]
        ]);
        
        await ctx.editMessageText(helpMessage, { parse_mode: 'HTML', ...keyboard });
        logger.info(`Admin ${ctx.from.id} viewed forum help`);
    });
}
