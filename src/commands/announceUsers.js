import { Markup } from 'telegraf';
import { isAdmin } from '../config/admins.js';
import userManager from '../services/userManager.js';
import logger from '../services/logger.js';

/**
 * Команды для рассылки сообщений пользователям
 */
export function setupAnnounceUsersCommands(bot) {

    // Команда /announce_users - рассылка всем одобренным пользователям
    bot.command('announce_users', async (ctx) => {
        const userId = ctx.from.id;

        // Проверка прав администратора
        if (!isAdmin(userId)) {
            logger.warn(`User ${userId} tried to use /announce_users without admin rights`);
            return ctx.reply('❌ У вас нет прав для использования этой команды.');
        }

        // Парсим текст сообщения
        const messageText = ctx.message.text.replace('/announce_users', '').trim();

        if (!messageText) {
            const backKeyboard = Markup.inlineKeyboard([
                [Markup.button.callback('◀️ Назад', 'menu:user_management')]
            ]);
            return ctx.reply(
                '⚠️ Использование: /announce_users <текст>\n\n' +
                'Отправит сообщение всем одобренным пользователям.\n\n' +
                'Пример:\n' +
                '/announce_users Важное объявление для всех учителей!',
                backKeyboard
            );
        }

        const users = userManager.getApprovedUsers();

        if (users.length === 0) {
            const backKeyboard = Markup.inlineKeyboard([
                [Markup.button.callback('◀️ Назад', 'menu:user_management')]
            ]);
            return ctx.reply(
                '📋 Нет одобренных пользователей для рассылки.\n\n' +
                'Дождитесь регистрации пользователей и одобрите их заявки.',
                backKeyboard
            );
        }

        // Отправляем рассылку
        await sendBroadcastToUsers(ctx, users, messageText, userId);
    });

    // Команда /announce_subject - рассылка пользователям по предмету
    bot.command('announce_subject', async (ctx) => {
        const userId = ctx.from.id;

        // Проверка прав администратора
        if (!isAdmin(userId)) {
            logger.warn(`User ${userId} tried to use /announce_subject without admin rights`);
            return ctx.reply('❌ У вас нет прав для использования этой команды.');
        }

        // Парсим аргументы
        const fullText = ctx.message.text.replace('/announce_subject', '').trim();

        if (!fullText) {
            const subjects = userManager.getAllSubjects();
            const subjectsText = subjects.length > 0
                ? `\n\nДоступные предметы:\n${subjects.map(s => `• ${s}`).join('\n')}`
                : '';

            const backKeyboard = Markup.inlineKeyboard([
                [Markup.button.callback('◀️ Назад', 'menu:user_management')]
            ]);
            return ctx.reply(
                '⚠️ Использование: /announce_subject <предмет> <текст>\n\n' +
                'Отправит сообщение пользователям с указанным предметом.\n\n' +
                'Пример:\n' +
                '/announce_subject Математика Собрание учителей математики завтра в 15:00' +
                subjectsText,
                backKeyboard
            );
        }

        // Разделяем на предмет и текст
        const firstSpaceIndex = fullText.indexOf(' ');

        if (firstSpaceIndex === -1) {
            const backKeyboard = Markup.inlineKeyboard([
                [Markup.button.callback('◀️ Назад', 'menu:user_management')]
            ]);
            return ctx.reply(
                '❌ Не указан текст сообщения.\n\n' +
                'Формат: /announce_subject <предмет> <текст>',
                backKeyboard
            );
        }

        const subject = fullText.substring(0, firstSpaceIndex).trim();
        const messageText = fullText.substring(firstSpaceIndex + 1).trim();

        if (!messageText) {
            const backKeyboard = Markup.inlineKeyboard([
                [Markup.button.callback('◀️ Назад', 'menu:user_management')]
            ]);
            return ctx.reply('❌ Текст сообщения не может быть пустым.', backKeyboard);
        }

        const users = userManager.getApprovedUsersBySubject(subject);

        if (users.length === 0) {
            const backKeyboard = Markup.inlineKeyboard([
                [Markup.button.callback('◀️ Назад', 'menu:user_management')]
            ]);
            return ctx.reply(
                `📋 Нет одобренных пользователей с предметом "${subject}".\n\n` +
                'Проверьте правильность написания предмета.',
                backKeyboard
            );
        }

        // Отправляем рассылку
        await sendBroadcastToUsers(ctx, users, messageText, userId, subject);
    });
}

/**
 * Отправить рассылку пользователям
 */
async function sendBroadcastToUsers(ctx, users, messageText, adminId, subject = null) {
    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;
    let blockedCount = 0;

    const statusMessage = await ctx.reply(
        `📤 Начинаю рассылку${subject ? ` (предмет: ${subject})` : ''}...\n\n` +
        `👥 Получателей: ${users.length}\n` +
        `⏳ Отправлено: 0/${users.length}`
    );

    for (let i = 0; i < users.length; i++) {
        const user = users[i];

        try {
            await ctx.telegram.sendMessage(user.id, messageText, { parse_mode: 'HTML' });
            successCount++;

            // Обновляем статус каждые 5 пользователей
            if ((i + 1) % 5 === 0 || i === users.length - 1) {
                await ctx.telegram.editMessageText(
                    ctx.chat.id,
                    statusMessage.message_id,
                    null,
                    `📤 Рассылка${subject ? ` (предмет: ${subject})` : ''}...\n\n` +
                    `👥 Получателей: ${users.length}\n` +
                    `✅ Отправлено: ${successCount}\n` +
                    `❌ Ошибок: ${errorCount}\n` +
                    `🚫 Заблокировали бота: ${blockedCount}\n\n` +
                    `⏳ Прогресс: ${i + 1}/${users.length}`
                );
            }

            // Задержка для избежания лимитов Telegram
            await new Promise(resolve => setTimeout(resolve, 50));

        } catch (error) {
            if (error.response && error.response.error_code === 403) {
                // Пользователь заблокировал бота
                blockedCount++;
                logger.warn(`User ${user.id} blocked the bot`);
            } else {
                errorCount++;
                logger.error(`Failed to send message to user ${user.id}:`, error);
            }
        }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    // Финальный отчёт
    await ctx.telegram.editMessageText(
        ctx.chat.id,
        statusMessage.message_id,
        null,
        `✅ Рассылка завершена${subject ? ` (предмет: ${subject})` : ''}!\n\n` +
        `👥 Всего получателей: ${users.length}\n` +
        `✅ Успешно отправлено: ${successCount}\n` +
        `❌ Ошибок: ${errorCount}\n` +
        `🚫 Заблокировали бота: ${blockedCount}\n\n` +
        `⏱ Время: ${duration} сек`
    );

    logger.success(`Broadcast to users completed: ${successCount}/${users.length} successful`);
}
