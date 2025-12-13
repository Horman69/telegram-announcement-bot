import { Markup } from 'telegraf';
import { isAdmin } from '../config/admins.js';
import groupManager from '../services/groupManager.js';
import conversationState from '../services/conversationState.js';
import logger from '../services/logger.js';

/**
 * Команда /addgroup
 * Добавить группу вручную по ID
 */
export function setupAddGroupCommand(bot) {
    // Команда для запуска процесса добавления группы
    bot.command('addgroup', (ctx) => {
        const userId = ctx.from.id;

        // Проверка прав администратора
        if (!isAdmin(userId)) {
            logger.warn(`User ${userId} tried to use /addgroup without admin rights`);
            return ctx.reply('❌ У вас нет прав для использования этой команды.');
        }

        // Запускаем процесс добавления группы
        startAddGroupProcess(userId);

        const backKeyboard = Markup.inlineKeyboard([
            [Markup.button.callback('◀️ Назад', 'menu:group_management')]
        ]);

        ctx.reply(
            '➕ Добавление группы вручную\n\n' +
            'Отправьте ID группы, которую хотите добавить в список рассылки.\n\n' +
            '💡 Используйте команду /groupid в группе, чтобы узнать её ID\n\n' +
            'Пример: <code>-1001234567890</code>\n\n' +
            'Для отмены отправьте /cancel',
            { parse_mode: 'HTML', ...backKeyboard }
        );

        logger.info(`Admin ${userId} started add group process`);
    });

    // Обработчик текстовых сообщений для процесса добавления группы
    bot.on('text', async (ctx, next) => {
        const userId = ctx.from.id;
        const state = conversationState.getState(userId);

        // Проверяем, что это наш процесс
        if (!state || (state.action !== 'waiting_group_id' && state.action !== 'waiting_group_title' && state.action !== 'confirm_add_group')) {
            return next(); // Передаем управление следующему обработчику
        }

        const text = ctx.message.text;

        // Отмена процесса
        if (text === '/cancel') {
            conversationState.clearState(userId);
            const backKeyboard = Markup.inlineKeyboard([
                [Markup.button.callback('◀️ Назад', 'menu:group_management')]
            ]);
            return ctx.reply('❌ Добавление группы отменено.', backKeyboard);
        }

        // Этап 1: Ожидание ID группы
        if (state.action === 'waiting_group_id') {
            // Валидация ID группы
            const groupId = parseInt(text);

            if (isNaN(groupId)) {
                return ctx.reply(
                    '❌ Неверный формат ID группы.\n\n' +
                    'ID группы должен быть числом (например: -1001234567890)\n\n' +
                    'Попробуйте ещё раз или отправьте /cancel для отмены.'
                );
            }

            // Проверяем, не добавлена ли уже эта группа
            const existingGroup = groupManager.getGroupById(groupId);
            if (existingGroup) {
                conversationState.clearState(userId);
                const backKeyboard = Markup.inlineKeyboard([
                    [Markup.button.callback('◀️ Назад', 'menu:group_management')]
                ]);
                return ctx.reply(
                    `⚠️ Группа уже добавлена!\n\n` +
                    `📝 Название: ${existingGroup.title}\n` +
                    `🔢 ID: <code>${existingGroup.id}</code>`,
                    { parse_mode: 'HTML', ...backKeyboard }
                );
            }

            // Сохраняем ID и переходим к следующему этапу
            conversationState.setState(userId, {
                action: 'waiting_group_title',
                groupId: groupId
            });

            return ctx.reply(
                '✅ ID группы принят!\n\n' +
                'Теперь отправьте название группы.\n\n' +
                'Пример: Моя группа\n\n' +
                'Для отмены отправьте /cancel'
            );
        }

        // Этап 2: Ожидание названия группы
        if (state.action === 'waiting_group_title') {
            const groupTitle = text.trim();

            if (groupTitle.length === 0) {
                return ctx.reply(
                    '❌ Название группы не может быть пустым.\n\n' +
                    'Попробуйте ещё раз или отправьте /cancel для отмены.'
                );
            }

            if (groupTitle.length > 100) {
                return ctx.reply(
                    '❌ Название группы слишком длинное (максимум 100 символов).\n\n' +
                    'Попробуйте ещё раз или отправьте /cancel для отмены.'
                );
            }

            // Сохраняем название и показываем подтверждение
            conversationState.setState(userId, {
                action: 'confirm_add_group',
                groupId: state.groupId,
                groupTitle: groupTitle
            });

            const confirmKeyboard = Markup.inlineKeyboard([
                [
                    Markup.button.callback('✅ Да, добавить', 'confirm_add_group'),
                    Markup.button.callback('❌ Отмена', 'cancel_add_group')
                ]
            ]);

            return ctx.reply(
                '📋 Подтверждение добавления группы\n\n' +
                `📝 Название: ${groupTitle}\n` +
                `🔢 ID: <code>${state.groupId}</code>\n\n` +
                'Добавить эту группу в список рассылки?',
                { parse_mode: 'HTML', ...confirmKeyboard }
            );
        }
    });

    // Обработчик подтверждения добавления группы
    bot.action('confirm_add_group', async (ctx) => {
        const userId = ctx.from.id;
        const state = conversationState.getState(userId);

        if (!state || state.action !== 'confirm_add_group') {
            return ctx.answerCbQuery('❌ Ошибка: состояние не найдено');
        }

        const { groupId, groupTitle } = state;

        // Добавляем группу
        const success = groupManager.addGroupManually(groupId, groupTitle);

        conversationState.clearState(userId);

        const backKeyboard = Markup.inlineKeyboard([
            [Markup.button.callback('◀️ Назад', 'menu:group_management')]
        ]);

        if (success) {
            await ctx.editMessageText(
                '✅ Группа успешно добавлена!\n\n' +
                `📝 Название: ${groupTitle}\n` +
                `🔢 ID: <code>${groupId}</code>\n\n` +
                'Теперь эта группа будет получать рассылки.',
                { parse_mode: 'HTML', ...backKeyboard }
            );
            await ctx.answerCbQuery('✅ Группа добавлена!');
            logger.success(`Admin ${userId} manually added group: ${groupTitle} (${groupId})`);
        } else {
            await ctx.editMessageText(
                '❌ Ошибка при добавлении группы.\n\n' +
                'Возможно, группа уже добавлена или произошла ошибка сохранения.',
                backKeyboard
            );
            await ctx.answerCbQuery('❌ Ошибка добавления');
        }
    });

    // Обработчик отмены добавления группы
    bot.action('cancel_add_group', async (ctx) => {
        const userId = ctx.from.id;
        conversationState.clearState(userId);

        const backKeyboard = Markup.inlineKeyboard([
            [Markup.button.callback('◀️ Назад', 'menu:group_management')]
        ]);

        await ctx.editMessageText(
            '❌ Добавление группы отменено.',
            backKeyboard
        );
        await ctx.answerCbQuery('Отменено');
        logger.info(`Admin ${userId} cancelled add group process`);
    });
}

/**
 * Запускает процесс добавления группы
 * @param {number} userId - ID пользователя
 * @returns {boolean} Успешность запуска
 */
export function startAddGroupProcess(userId) {
    try {
        conversationState.setState(userId, { action: 'waiting_group_id' });
        return true;
    } catch (error) {
        logger.error('Error starting add group process:', error);
        return false;
    }
}
