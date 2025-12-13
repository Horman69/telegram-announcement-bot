import logger from '../services/logger.js';
import { isAdmin, addAdmin } from '../config/admins.js';
import { Markup } from 'telegraf';
import conversationState from '../services/conversationState.js';

/**
 * Состояния процесса добавления администратора
 */
const STATES = {
    IDLE: 'idle',
    WAITING_FOR_ID: 'waiting_for_id',
    WAITING_FOR_CONFIRMATION: 'waiting_for_confirmation'
};

/**
 * Настройка команды /addadmin
 * @param {Object} bot - Экземпляр бота Telegraf
 */
export function setupAddAdminCommand(bot) {
    // Команда /addadmin - начало процесса добавления администратора
    bot.command('addadmin', async (ctx) => {
        try {
            const userId = ctx.from?.id;

            // Проверка на наличие ID пользователя
            if (!userId) {
                logger.warn('AddAdmin command: User ID not found');
                return ctx.reply('❌ Ошибка: не удалось определить пользователя');
            }

            // Проверка прав администратора
            if (!isAdmin(userId)) {
                logger.warn(`User ${userId} tried to use /addadmin without admin rights`);
                return ctx.reply('❌ У вас нет прав для выполнения этой команды');
            }

            logger.info(`Admin ${userId} started /addadmin process`);

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
                action: 'add_admin',
                state: STATES.WAITING_FOR_ID,
                adminId: userId
            });

            await ctx.reply(
                '👥 Добавление нового администратора\n\n' +
                adminsInfo + '\n' +
                '━━━━━━━━━━━━━━━━━━━━\n\n' +
                'Отправьте Telegram ID пользователя, которого хотите добавить в администраторы.\n\n' +
                '💡 Пользователь может узнать свой ID с помощью команды /myid\n\n' +
                'Для отмены отправьте /cancel'
            );
        } catch (error) {
            logger.error('Error in /addadmin command:', error);
            ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
        }
    });

    // Команда /cancel - отмена процесса
    bot.command('cancel', async (ctx) => {
        const userId = ctx.from?.id;
        const userState = conversationState.getState(userId);

        // Проверяем, что это именно процесс добавления админа
        if (userState && userState.action === 'add_admin') {
            conversationState.clearState(userId);
            logger.info(`User ${userId} cancelled admin addition process`);
            await ctx.reply('❌ Процесс добавления администратора отменён');
        }
    });

    // Обработчик текстовых сообщений для процесса добавления админа
    bot.on('text', async (ctx, next) => {
        try {
            const userId = ctx.from?.id;
            const text = ctx.message.text;

            // Проверяем, есть ли активное состояние для пользователя
            const userState = conversationState.getState(userId);
            if (!userState || userState.action !== 'add_admin') {
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
            logger.error('Error handling text in addadmin process:', error);
            return next();
        }
    });

    // Обработчики callback-запросов для кнопок подтверждения
    bot.action('addadmin:confirm', async (ctx) => {
        try {
            const userId = ctx.from?.id;

            if (!conversationState.hasState(userId)) {
                await ctx.answerCbQuery('❌ Сессия истекла. Начните заново с /addadmin');
                return;
            }

            const userState = conversationState.getState(userId);

            if (userState.state !== STATES.WAITING_FOR_CONFIRMATION) {
                await ctx.answerCbQuery('❌ Неверное состояние');
                return;
            }

            await ctx.answerCbQuery('⏳ Добавляю администратора...');

            // Добавляем администратора
            const result = await addAdmin(userState.newAdminId);

            // Создаем кнопку "Назад"
            const backKeyboard = Markup.inlineKeyboard([
                [Markup.button.callback('◀️ Назад в меню', 'menu:admins')]
            ]);

            if (result.success) {
                await ctx.editMessageText(
                    `✅ Администратор успешно добавлен!\n\n` +
                    `ID: ${userState.newAdminId}\n\n` +
                    `Пользователь теперь имеет полный доступ ко всем административным функциям бота.`,
                    backKeyboard
                );
                logger.success(`Admin ${userId} successfully added new admin ${userState.newAdminId}`);
            } else {
                await ctx.editMessageText(
                    `❌ Ошибка при добавлении администратора\n\n` +
                    `Причина: ${result.error}`,
                    backKeyboard
                );
                logger.error(`Failed to add admin ${userState.newAdminId}: ${result.error}`);
            }

            // Очищаем состояние
            conversationState.clearState(userId);
        } catch (error) {
            logger.error('Error in addadmin:confirm handler:', error);
            await ctx.answerCbQuery('❌ Произошла ошибка');
        }
    });

    bot.action('addadmin:cancel', async (ctx) => {
        try {
            const userId = ctx.from?.id;

            if (conversationState.hasState(userId)) {
                conversationState.clearState(userId);

                // Создаем кнопку "Назад"
                const backKeyboard = Markup.inlineKeyboard([
                    [Markup.button.callback('◀️ Назад в меню', 'menu:admins')]
                ]);

                await ctx.editMessageText(
                    '❌ Добавление администратора отменено',
                    backKeyboard
                );
                logger.info(`User ${userId} cancelled admin addition via button`);
            } else {
                await ctx.answerCbQuery('❌ Сессия уже завершена');
            }
        } catch (error) {
            logger.error('Error in addadmin:cancel handler:', error);
            await ctx.answerCbQuery('❌ Произошла ошибка');
        }
    });

    logger.success('AddAdmin command registered');
}

/**
 * Обработка ввода ID администратора
 */
async function handleIdInput(ctx, userId, text) {
    const userState = conversationState.getState(userId);

    // Парсим ID
    const newAdminId = parseInt(text.trim(), 10);

    // Валидация
    if (isNaN(newAdminId) || newAdminId <= 0) {
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

    // Проверка на попытку добавить самого себя
    if (newAdminId === userId) {
        const backKeyboard = Markup.inlineKeyboard([
            [Markup.button.callback('◀️ Назад', 'menu:admins')]
        ]);
        await ctx.reply(
            '❌ Вы не можете добавить самого себя\n\n' +
            'Вы уже являетесь администратором.\n\n' +
            'Попробуйте снова или отправьте /cancel для отмены.',
            backKeyboard
        );
        logger.warn(`User ${userId} tried to add themselves as admin`);
        return;
    }

    // Проверка на дубликат
    if (isAdmin(newAdminId)) {
        const backKeyboard = Markup.inlineKeyboard([
            [Markup.button.callback('◀️ Назад', 'menu:admins')]
        ]);
        await ctx.reply(
            '❌ Пользователь уже является администратором\n\n' +
            `ID ${newAdminId} уже есть в списке администраторов.\n\n` +
            'Попробуйте снова или отправьте /cancel для отмены.',
            backKeyboard
        );
        logger.warn(`User ${userId} tried to add existing admin: ${newAdminId}`);
        return;
    }

    // Обновляем состояние
    conversationState.setState(userId, {
        action: 'add_admin',
        state: STATES.WAITING_FOR_CONFIRMATION,
        newAdminId: newAdminId,
        adminId: userId
    });

    // Создаем кнопки подтверждения
    const confirmKeyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('✅ Да, добавить', 'addadmin:confirm'),
            Markup.button.callback('❌ Отмена', 'addadmin:cancel')
        ]
    ]);

    await ctx.reply(
        `✅ ID принят\n\n` +
        `Вы хотите добавить пользователя с ID ${newAdminId} в список администраторов?\n\n` +
        `⚠️ После добавления пользователь получит полный доступ ко всем административным функциям бота.`,
        confirmKeyboard
    );

    logger.info(`User ${userId} requested to add admin ${newAdminId}, waiting for confirmation`);
}

/**
 * Запустить процесс добавления администратора (для использования из других модулей)
 * @param {number} userId - ID пользователя, который запускает процесс
 */
export function startAddAdminProcess(userId) {
    if (!isAdmin(userId)) {
        return false;
    }

    conversationState.setState(userId, {
        action: 'add_admin',
        state: STATES.WAITING_FOR_ID,
        adminId: userId
    });

    logger.info(`Admin ${userId} started /addadmin process`);
    return true;
}

