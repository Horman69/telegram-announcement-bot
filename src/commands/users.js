import { Markup } from 'telegraf';
import { isAdmin } from '../config/admins.js';
import userManager from '../services/userManager.js';
import logger from '../services/logger.js';

/**
 * Команда /users
 * Просмотр и управление зарегистрированными пользователями
 */
export function setupUsersCommand(bot) {
    bot.command('users', (ctx) => {
        const userId = ctx.from.id;

        // Проверка прав администратора
        if (!isAdmin(userId)) {
            logger.warn(`User ${userId} tried to access /users without admin rights`);
            return ctx.reply('❌ У вас нет прав для использования этой команды.');
        }

        const stats = userManager.getStats();

        if (stats.total === 0) {
            const backKeyboard = Markup.inlineKeyboard([
                [Markup.button.callback('◀️ Назад', 'menu:user_management')]
            ]);
            return ctx.reply(
                '📋 Список пользователей пуст.\n\n' +
                'Пользователи могут зарегистрироваться через команду /register',
                backKeyboard
            );
        }

        // Показываем статистику и кнопки фильтров
        const buttons = [
            [Markup.button.callback(`📋 Все (${stats.total})`, 'users:all')],
            [Markup.button.callback(`⏳ Ожидают (${stats.pending})`, 'users:pending')],
            [Markup.button.callback(`✅ Одобренные (${stats.approved})`, 'users:approved')],
            [Markup.button.callback(`❌ Отклонённые (${stats.rejected})`, 'users:rejected')],
            [Markup.button.callback('◀️ Назад', 'menu:user_management')]
        ];

        const keyboard = Markup.inlineKeyboard(buttons);

        ctx.reply(
            '👥 Управление пользователями\n\n' +
            `📊 Статистика:\n` +
            `• Всего: ${stats.total}\n` +
            `• Ожидают одобрения: ${stats.pending}\n` +
            `• Одобрены: ${stats.approved}\n` +
            `• Отклонены: ${stats.rejected}\n\n` +
            'Выберите фильтр:',
            keyboard
        );

        logger.info(`Admin ${userId} viewed users list`);
    });

    // Обработчики фильтров
    bot.action(/users:(all|pending|approved|rejected)/, async (ctx) => {
        const userId = ctx.from.id;

        if (!isAdmin(userId)) {
            return ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
        }

        const filter = ctx.match[1];
        let users = [];
        let title = '';

        switch (filter) {
            case 'all':
                users = userManager.getUsers();
                title = 'Все пользователи';
                break;
            case 'pending':
                users = userManager.getPendingUsers();
                title = 'Ожидают одобрения';
                break;
            case 'approved':
                users = userManager.getApprovedUsers();
                title = 'Одобренные';
                break;
            case 'rejected':
                users = userManager.getRejectedUsers();
                title = 'Отклонённые';
                break;
        }

        if (users.length === 0) {
            await ctx.answerCbQuery(`Нет пользователей в категории "${title}"`, { show_alert: true });
            return;
        }

        let message = `👥 ${title} (${users.length}):\n\n`;

        users.forEach((user, index) => {
            const statusIcon = user.status === 'approved' ? '✅' : user.status === 'pending' ? '⏳' : '❌';
            message += `${index + 1}. ${statusIcon} ${user.lastName} ${user.firstName} ${user.patronymic}\n`;
            message += `   📚 ${user.subject}\n`;
            message += `   🆔 <code>${user.id}</code>\n\n`;
        });

        // Создаем кнопки для каждого пользователя
        const buttons = [];

        users.forEach((user) => {
            const userButtons = [
                Markup.button.callback(`🗑️ Удалить "${user.lastName} ${user.firstName}"`, `delete_user:${user.id}`)
            ];
            buttons.push(userButtons);
        });

        buttons.push([Markup.button.callback('◀️ Назад', 'menu:user_management')]);

        const keyboard = Markup.inlineKeyboard(buttons);

        await ctx.editMessageText(message, { parse_mode: 'HTML', ...keyboard });
        await ctx.answerCbQuery();
    });

    // Обработчик удаления пользователя
    bot.action(/delete_user:(.+)/, async (ctx) => {
        const adminId = ctx.from.id;

        if (!isAdmin(adminId)) {
            return ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
        }

        const userId = parseInt(ctx.match[1]);
        const user = userManager.getUserById(userId);

        if (!user) {
            await ctx.answerCbQuery('❌ Пользователь не найден', { show_alert: true });
            return;
        }

        // Удаляем пользователя
        userManager.deleteUser(userId);

        await ctx.answerCbQuery('✅ Пользователь удалён');

        // Обновляем список
        const stats = userManager.getStats();
        const buttons = [
            [Markup.button.callback(`📋 Все (${stats.total})`, 'users:all')],
            [Markup.button.callback(`⏳ Ожидают (${stats.pending})`, 'users:pending')],
            [Markup.button.callback(`✅ Одобренные (${stats.approved})`, 'users:approved')],
            [Markup.button.callback(`❌ Отклонённые (${stats.rejected})`, 'users:rejected')],
            [Markup.button.callback('◀️ Назад', 'menu:user_management')]
        ];

        const keyboard = Markup.inlineKeyboard(buttons);

        await ctx.editMessageText(
            '👥 Управление пользователями\n\n' +
            `📊 Статистика:\n` +
            `• Всего: ${stats.total}\n` +
            `• Ожидают одобрения: ${stats.pending}\n` +
            `• Одобрены: ${stats.approved}\n` +
            `• Отклонены: ${stats.rejected}\n\n` +
            'Выберите фильтр:',
            keyboard
        );

        logger.info(`Admin ${adminId} deleted user ${userId}`);
    });
}
