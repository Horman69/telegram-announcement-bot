import { Markup } from 'telegraf';
import { isAdmin } from '../config/admins.js';
import groupManager from '../services/groupManager.js';
import conversationState from '../services/conversationState.js';
import logger from '../services/logger.js';

/**
 * Команда /removegroup
 * Удалить группу из списка рассылки
 */
export function setupRemoveGroupCommand(bot) {
    // Команда для запуска процесса удаления группы
    bot.command('removegroup', (ctx) => {
        const userId = ctx.from.id;

        // Проверка прав администратора
        if (!isAdmin(userId)) {
            logger.warn(`User ${userId} tried to use /removegroup without admin rights`);
            return ctx.reply('❌ У вас нет прав для использования этой команды.');
        }

        const groups = groupManager.getGroups();

        if (groups.length === 0) {
            const backKeyboard = Markup.inlineKeyboard([
                [Markup.button.callback('◀️ Назад', 'menu:group_management')]
            ]);
            return ctx.reply(
                '📋 Список групп пуст.\n\n' +
                'Нет групп для удаления.',
                backKeyboard
            );
        }

        // Запускаем процесс удаления группы
        startRemoveGroupProcess(userId);

        const backKeyboard = Markup.inlineKeyboard([
            [Markup.button.callback('◀️ Назад', 'menu:group_management')]
        ]);

        let message = '🗑️ Удаление группы из списка рассылки\n\n';
        message += 'Отправьте ID группы, которую хотите удалить:\n\n';

        groups.forEach((group, index) => {
            message += `${index + 1}. ${group.title}\n`;
            message += `   ID: <code>${group.id}</code>\n\n`;
        });

        message += 'Для отмены отправьте /cancel';

        ctx.reply(message, { parse_mode: 'HTML', ...backKeyboard });

        logger.info(`Admin ${userId} started remove group process`);
    });

    // Обработчик текстовых сообщений для процесса удаления группы
    bot.on('text', async (ctx, next) => {
        const userId = ctx.from.id;
        const state = conversationState.getState(userId);

        logger.info(`[REMOVEGROUP] Text received from user ${userId}. State: ${state ? state.action : 'NO STATE'}`);

        // Проверяем, что это именно процесс удаления группы
        if (!state || (state.action !== 'waiting_remove_group_id' && state.action !== 'confirm_remove_group')) {
            logger.info(`[REMOVEGROUP] Skipping - not our process. State action: ${state ? state.action : 'null'}`);
            return next(); // Передаем управление следующему обработчику
        }

        const text = ctx.message.text;
        logger.info(`[REMOVEGROUP] Processing text: "${text}"`);

        // Отмена процесса
        if (text === '/cancel') {
            conversationState.clearState(userId);
            const backKeyboard = Markup.inlineKeyboard([
                [Markup.button.callback('◀️ Назад', 'menu:group_management')]
            ]);
            return ctx.reply('❌ Удаление группы отменено.', backKeyboard);
        }

        // Обрабатываем только если ждем ID группы
        if (state.action !== 'waiting_remove_group_id') {
            return;
        }

        // Валидация ID группы
        const groupId = parseInt(text);

        if (isNaN(groupId)) {
            return ctx.reply(
                '❌ Неверный формат ID группы.\n\n' +
                'ID группы должен быть числом (например: -1001234567890)\n\n' +
                'Попробуйте ещё раз или отправьте /cancel для отмены.'
            );
        }

        // Проверяем, существует ли группа
        const group = groupManager.getGroupById(groupId);
        if (!group) {
            return ctx.reply(
                '❌ Группа с таким ID не найдена в списке рассылки.\n\n' +
                'Проверьте ID и попробуйте ещё раз или отправьте /cancel для отмены.'
            );
        }

        // Сохраняем данные и показываем подтверждение
        conversationState.setState(userId, {
            action: 'confirm_remove_group',
            groupId: groupId,
            groupTitle: group.title
        });

        const confirmKeyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Да, удалить', 'confirm_remove_group'),
                Markup.button.callback('❌ Отмена', 'cancel_remove_group')
            ]
        ]);

        ctx.reply(
            '⚠️ Подтверждение удаления группы\n\n' +
            `📝 Название: ${group.title}\n` +
            `🔢 ID: <code>${groupId}</code>\n\n` +
            'Удалить эту группу из списка рассылки?\n\n' +
            '💡 Бот останется в группе, но рассылки туда приходить не будут.',
            { parse_mode: 'HTML', ...confirmKeyboard }
        );
    });

    // Обработчик подтверждения удаления группы
    bot.action('confirm_remove_group', async (ctx) => {
        const userId = ctx.from.id;
        const state = conversationState.getState(userId);

        if (!state || state.action !== 'confirm_remove_group') {
            return ctx.answerCbQuery('❌ Ошибка: состояние не найдено');
        }

        const { groupId, groupTitle } = state;

        // Удаляем группу
        const success = groupManager.removeGroup(groupId);

        conversationState.clearState(userId);

        const backKeyboard = Markup.inlineKeyboard([
            [Markup.button.callback('◀️ Назад', 'menu:group_management')]
        ]);

        if (success) {
            await ctx.editMessageText(
                '✅ Группа успешно удалена из списка рассылки!\n\n' +
                `📝 Название: ${groupTitle}\n` +
                `🔢 ID: <code>${groupId}</code>\n\n` +
                'Бот остался в группе, но рассылки туда приходить не будут.',
                { parse_mode: 'HTML', ...backKeyboard }
            );
            await ctx.answerCbQuery('✅ Группа удалена!');
            logger.success(`Admin ${userId} removed group from list: ${groupTitle} (${groupId})`);
        } else {
            await ctx.editMessageText(
                '❌ Ошибка при удалении группы.\n\n' +
                'Возможно, группа уже была удалена.',
                backKeyboard
            );
            await ctx.answerCbQuery('❌ Ошибка удаления');
        }
    });

    // Обработчик отмены удаления группы
    bot.action('cancel_remove_group', async (ctx) => {
        const userId = ctx.from.id;
        conversationState.clearState(userId);

        const backKeyboard = Markup.inlineKeyboard([
            [Markup.button.callback('◀️ Назад', 'menu:group_management')]
        ]);

        await ctx.editMessageText(
            '❌ Удаление группы отменено.',
            backKeyboard
        );
        await ctx.answerCbQuery('Отменено');
        logger.info(`Admin ${userId} cancelled remove group process`);
    });

    // Обработчик удаления группы из списка (через кнопку в /groups)
    bot.action(/^delete_group:(.+)$/, async (ctx) => {
        const userId = ctx.from.id;

        // Проверка прав администратора
        if (!isAdmin(userId)) {
            return ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
        }

        const groupId = parseInt(ctx.match[1]);
        const group = groupManager.getGroupById(groupId);

        if (!group) {
            return ctx.answerCbQuery('❌ Группа не найдена', { show_alert: true });
        }

        // Показываем подтверждение
        const confirmKeyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Да, удалить', `confirm_delete_group:${groupId}`),
                Markup.button.callback('❌ Отмена', 'cancel_delete_group')
            ]
        ]);

        await ctx.editMessageText(
            '⚠️ Подтверждение удаления группы\n\n' +
            `📝 Название: ${group.title}\n` +
            `🔢 ID: <code>${groupId}</code>\n\n` +
            'Удалить эту группу из списка рассылки?\n\n' +
            '💡 Бот останется в группе, но рассылки туда приходить не будут.',
            { parse_mode: 'HTML', ...confirmKeyboard }
        );
        await ctx.answerCbQuery('Подтверждение удаления');
    });

    // Подтверждение удаления через кнопку
    bot.action(/^confirm_delete_group:(.+)$/, async (ctx) => {
        const userId = ctx.from.id;
        const groupId = parseInt(ctx.match[1]);
        const group = groupManager.getGroupById(groupId);

        if (!group) {
            return ctx.answerCbQuery('❌ Группа не найдена', { show_alert: true });
        }

        const groupTitle = group.title;
        const success = groupManager.removeGroup(groupId);

        const backKeyboard = Markup.inlineKeyboard([
            [Markup.button.callback('◀️ К списку групп', 'menu:action:group_list')]
        ]);

        if (success) {
            await ctx.editMessageText(
                '✅ Группа успешно удалена из списка рассылки!\n\n' +
                `📝 Название: ${groupTitle}\n` +
                `🔢 ID: <code>${groupId}</code>`,
                { parse_mode: 'HTML', ...backKeyboard }
            );
            await ctx.answerCbQuery('✅ Группа удалена!');
            logger.success(`Admin ${userId} deleted group via button: ${groupTitle} (${groupId})`);
        } else {
            await ctx.editMessageText(
                '❌ Ошибка при удалении группы.',
                backKeyboard
            );
            await ctx.answerCbQuery('❌ Ошибка удаления');
        }
    });

    // Отмена удаления через кнопку
    bot.action('cancel_delete_group', async (ctx) => {
        const backKeyboard = Markup.inlineKeyboard([
            [Markup.button.callback('◀️ К списку групп', 'menu:action:group_list')]
        ]);

        await ctx.editMessageText(
            '❌ Удаление группы отменено.',
            backKeyboard
        );
        await ctx.answerCbQuery('Отменено');
    });
}

/**
 * Запускает процесс удаления группы
 * @param {number} userId - ID пользователя
 * @returns {boolean} Успешность запуска
 */
export function startRemoveGroupProcess(userId) {
    try {
        conversationState.setState(userId, { action: 'waiting_remove_group_id' });
        return true;
    } catch (error) {
        logger.error('Error starting remove group process:', error);
        return false;
    }
}
