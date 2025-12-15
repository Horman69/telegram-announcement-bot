import { Markup } from 'telegraf';
import { isAdmin } from '../config/admins.js';
import userManager from '../services/userManager.js';
import logger from '../services/logger.js';

/**
 * Команды для одобрения и отклонения пользователей
 */
export function setupApproveUserCommands(bot) {

    // Обработчик кнопки "Одобрить"
    bot.action(/approve_user:(.+)/, async (ctx) => {
        const adminId = ctx.from.id;

        // Проверка прав администратора
        if (!isAdmin(adminId)) {
            return ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
        }

        const userId = parseInt(ctx.match[1]);
        const user = userManager.getUserById(userId);

        if (!user) {
            await ctx.editMessageText('❌ Пользователь не найден в системе.');
            return ctx.answerCbQuery('Пользователь не найден');
        }

        if (user.status === 'approved') {
            await ctx.answerCbQuery('✅ Пользователь уже одобрен', { show_alert: true });
            return;
        }

        // Обновляем статус
        userManager.updateUserStatus(userId, 'approved', adminId);

        // Обновляем сообщение админу
        await ctx.editMessageText(
            '✅ Пользователь одобрен!\n\n' +
            `👤 ФИО: ${user.lastName} ${user.firstName} ${user.patronymic}\n` +
            `📚 Предмет: ${user.subject}\n` +
            `🆔 ID: <code>${userId}</code>\n\n` +
            `Одобрено администратором: ${ctx.from.first_name || 'Администратор'}`,
            { parse_mode: 'HTML' }
        );
        await ctx.answerCbQuery('✅ Пользователь одобрен!');

        // Уведомляем пользователя
        try {
            await ctx.telegram.sendMessage(
                userId,
                '🎉 Поздравляем!\n\n' +
                'Ваша заявка на регистрацию была одобрена администратором.\n\n' +
                'Теперь вы будете получать рассылки от бота.'
            );
        } catch (error) {
            logger.error(`Failed to notify user ${userId} about approval:`, error);
        }

        logger.success(`Admin ${adminId} approved user ${userId}`);
    });

    // Обработчик кнопки "Отклонить"
    bot.action(/reject_user:(.+)/, async (ctx) => {
        const adminId = ctx.from.id;

        // Проверка прав администратора
        if (!isAdmin(adminId)) {
            return ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
        }

        const userId = parseInt(ctx.match[1]);
        const user = userManager.getUserById(userId);

        if (!user) {
            await ctx.editMessageText('❌ Пользователь не найден в системе.');
            return ctx.answerCbQuery('Пользователь не найден');
        }

        if (user.status === 'rejected') {
            await ctx.answerCbQuery('❌ Пользователь уже отклонён', { show_alert: true });
            return;
        }

        // Обновляем статус
        userManager.updateUserStatus(userId, 'rejected', adminId);

        // Обновляем сообщение админу
        await ctx.editMessageText(
            '❌ Пользователь отклонён\n\n' +
            `👤 ФИО: ${user.lastName} ${user.firstName} ${user.patronymic}\n` +
            `📚 Предмет: ${user.subject}\n` +
            `🆔 ID: <code>${userId}</code>\n\n` +
            `Отклонено администратором: ${ctx.from.first_name || 'Администратор'}`,
            { parse_mode: 'HTML' }
        );
        await ctx.answerCbQuery('❌ Пользователь отклонён');

        // Уведомляем пользователя
        try {
            await ctx.telegram.sendMessage(
                userId,
                '❌ К сожалению, ваша заявка на регистрацию была отклонена администратором.\n\n' +
                'Если вы считаете, что это ошибка, обратитесь к администратору.'
            );
        } catch (error) {
            logger.error(`Failed to notify user ${userId} about rejection:`, error);
        }

        logger.info(`Admin ${adminId} rejected user ${userId}`);
    });
}
