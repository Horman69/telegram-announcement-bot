import logger from '../services/logger.js';
import { isAdmin, removeAdmin } from '../config/admins.js';
import { Markup } from 'telegraf';
import conversationState from '../services/conversationState.js';

/**
 * Состояния процесса удаления администратора
 */
const STATES = {
    IDLE: 'idle',
    WAITING_FOR_ID: 'waiting_for_id',
    WAITING_FOR_CONFIRMATION: 'waiting_for_confirmation'
};

/**
 * Настройка команды /removeadmin
 * @param {Object} bot - Экземпляр бота Telegraf
 */
export function setupRemoveAdminCommand(bot) {
    // Команда /removeadmin - начало процесса удаления администратора
    bot.command('removeadmin', async (ctx) => {
        try {
            const userId = ctx.from?.id;

            // Проверка на наличие ID пользователя
            if (!userId) {
                logger.warn('RemoveAdmin command: User ID not found');
                return ctx.reply('❌ Ошибка: не удалось определить пользователя');
            }

            // Проверка прав администратора
            if (!isAdmin(userId)) {
                logger.warn(`User ${userId} tried to use /removeadmin without admin rights`);
                return ctx.reply('❌ У вас нет прав для выполнения этой команды');
            }

            logger.info(`Admin ${userId} started /removeadmin process`);

            // Получаем текущий список администраторов
            const { getAllAdmins } = await import('../config/admins.js');
            const adminsList = getAllAdmins();

            // Пытаемся получить информацию о каждом администраторе
            let adminsInfo = '📋 Текущие администраторы:\n\n';
            for (let i = 0; i < adminsList.length; i++) {
                const adminId = adminsList[i];
                try {
                    const chatMember = await ctx.telegram.getChat(adminId);
                    const name = chatMember.first_name || 'Неизвестно';
                    const username = chatMember.username ? `@${chatMember.username}` : '';
                    adminsInfo += `${i + 1}. ${name} ${username}\n   ID: ${adminId}\n`;
                } catch (error) {
                    adminsInfo += `${i + 1}. ID: ${adminId}\n`;
                }
            }

            // Устанавливаем состояние ожидания ID
            conversationState.setState(userId, {
                action: 'remove_admin',
                state: STATES.WAITING_FOR_ID,
                adminId: userId
            });

            await ctx.reply(
                '🗑️ Удаление администратора\n\n' +
                adminsInfo + '\n' +
                '━━━━━━━━━━━━━━━━━━━━\n\n' +
                'Отправьте Telegram ID пользователя, которого хотите удалить из администраторов.\n\n' +
                '⚠️ Вы не можете удалить самого себя\n' +
                '⚠️ Нельзя удалить последнего администратора\n\n' +
                'Для отмены отправьте /cancel'
            );
        } catch (error) {
            logger.error('Error in /removeadmin command:', error);
            ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
        }
    });

    // Обработчик текстовых сообщений для процесса удаления админа
    bot.on('text', async (ctx, next) => {
        try {
            const userId = ctx.from?.id;
            const text = ctx.message.text;

            // Проверяем, есть ли активное состояние для пользователя
            const userState = conversationState.getState(userId);
            if (!userState || userState.action !== 'remove_admin') {
                return next(); // Передаем управление следующему обработчику
            }

            // Игнорируем команды (они обрабатываются отдельно)
            if (text.startsWith('/')) {
                return next();
            }

            // Обрабатываем в зависимости от состояния
            if (userState.state === STATES.WAITING_FOR_ID) {
                await handleIdInput(ctx, userId, text);
            }
        } catch (error) {
            logger.error('Error handling text in removeadmin process:', error);
            return next();
        }
    });

    // Обработчики callback-запросов для кнопок подтверждения
    bot.action('removeadmin:confirm', async (ctx) => {
        try {
            const userId = ctx.from?.id;

            if (!conversationState.hasState(userId)) {
                await ctx.answerCbQuery('❌ Сессия истекла. Начните заново с /removeadmin');
                return;
            }

            const userState = conversationState.getState(userId);

            if (userState.state !== STATES.WAITING_FOR_CONFIRMATION) {
                await ctx.answerCbQuery('❌ Неверное состояние');
                return;
            }

            await ctx.answerCbQuery('⏳ Удаляю администратора...');

            // Удаляем администратора
            const result = await removeAdmin(userState.removeAdminId);

            // Создаем кнопку "Назад"
            const backKeyboard = Markup.inlineKeyboard([
                [Markup.button.callback('◀️ Назад в меню', 'menu:admins')]
            ]);

            if (result.success) {
                await ctx.editMessageText(
                    `✅ Администратор успешно удалён!\n\n` +
                    `ID: ${userState.removeAdminId}\n\n` +
                    `Пользователь больше не имеет доступа к административным функциям бота.`,
                    backKeyboard
                );
                logger.success(`Admin ${userId} successfully removed admin ${userState.removeAdminId}`);
            } else {
                await ctx.editMessageText(
                    `❌ Ошибка при удалении администратора\n\n` +
                    `Причина: ${result.error}`,
                    backKeyboard
                );
                logger.error(`Failed to remove admin ${userState.removeAdminId}: ${result.error}`);
            }

            // Очищаем состояние
            conversationState.clearState(userId);
        } catch (error) {
            logger.error('Error in removeadmin:confirm handler:', error);
            await ctx.answerCbQuery('❌ Произошла ошибка');
        }
    });

    bot.action('removeadmin:cancel', async (ctx) => {
        try {
            const userId = ctx.from?.id;

            if (conversationState.hasState(userId)) {
                conversationState.clearState(userId);

                // Создаем кнопку "Назад"
                const backKeyboard = Markup.inlineKeyboard([
                    [Markup.button.callback('◀️ Назад в меню', 'menu:admins')]
                ]);

                await ctx.editMessageText(
                    '❌ Удаление администратора отменено',
                    backKeyboard
                );
                logger.info(`User ${userId} cancelled admin removal via button`);
            } else {
                await ctx.answerCbQuery('❌ Сессия уже завершена');
            }
        } catch (error) {
            logger.error('Error in removeadmin:cancel handler:', error);
            await ctx.answerCbQuery('❌ Произошла ошибка');
        }
    });

    logger.success('RemoveAdmin command registered');
}

/**
 * Обработка ввода ID администратора для удаления
 */
async function handleIdInput(ctx, userId, text) {
    const userState = conversationState.getState(userId);

    // Парсим ID
    const removeAdminId = parseInt(text.trim(), 10);

    // Валидация
    if (isNaN(removeAdminId) || removeAdminId <= 0) {
        const backKeyboard = Markup.inlineKeyboard([
            [Markup.button.callback('◀️ Назад', 'menu:admins')]
        ]);
        await ctx.reply(
            '❌ Некорректный ID\n\n' +
            'ID должен быть положительным числом.\n\n' +
            'Попробуйте снова или отправьте /cancel для отмены.',
            backKeyboard
        );
        logger.warn(`User ${userId} entered invalid admin ID: ${text}`);
        return;
    }

    // Проверка на попытку удалить самого себя
    if (removeAdminId === userId) {
        const backKeyboard = Markup.inlineKeyboard([
            [Markup.button.callback('◀️ Назад', 'menu:admins')]
        ]);
        await ctx.reply(
            '❌ Вы не можете удалить самого себя\n\n' +
            'Для удаления своих прав администратора обратитесь к другому администратору.\n\n' +
            'Попробуйте снова или отправьте /cancel для отмены.',
            backKeyboard
        );
        logger.warn(`User ${userId} tried to remove themselves as admin`);
        return;
    }

    // Проверка на существование администратора
    if (!isAdmin(removeAdminId)) {
        const backKeyboard = Markup.inlineKeyboard([
            [Markup.button.callback('◀️ Назад', 'menu:admins')]
        ]);
        await ctx.reply(
            '❌ Пользователь не является администратором\n\n' +
            `ID ${removeAdminId} не найден в списке администраторов.\n\n` +
            'Попробуйте снова или отправьте /cancel для отмены.',
            backKeyboard
        );
        logger.warn(`User ${userId} tried to remove non-existent admin: ${removeAdminId}`);
        return;
    }

    // Обновляем состояние
    conversationState.setState(userId, {
        action: 'remove_admin',
        state: STATES.WAITING_FOR_CONFIRMATION,
        removeAdminId: removeAdminId,
        adminId: userId
    });

    // Создаем кнопки подтверждения
    const confirmKeyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('✅ Да, удалить', 'removeadmin:confirm'),
            Markup.button.callback('❌ Отмена', 'removeadmin:cancel')
        ]
    ]);

    await ctx.reply(
        `⚠️ Подтверждение удаления\n\n` +
        `Вы действительно хотите удалить пользователя с ID ${removeAdminId} из списка администраторов?\n\n` +
        `После удаления пользователь потеряет доступ ко всем административным функциям бота.`,
        confirmKeyboard
    );

    logger.info(`User ${userId} requested to remove admin ${removeAdminId}, waiting for confirmation`);
}

/**
 * Запустить процесс удаления администратора (для использования из других модулей)
 * @param {number} userId - ID пользователя, который запускает процесс
 */
export function startRemoveAdminProcess(userId) {
    if (!isAdmin(userId)) {
        return false;
    }

    conversationState.setState(userId, {
        action: 'remove_admin',
        state: STATES.WAITING_FOR_ID,
        adminId: userId
    });

    logger.info(`Admin ${userId} started /removeadmin process`);
    return true;
}
