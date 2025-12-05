import { Markup } from 'telegraf';
import { isAdmin } from '../config/admins.js';
import groupManager from '../services/groupManager.js';
import logger from '../services/logger.js';

/**
 * Команда /announce
 * Создание и рассылка объявлений в группы (только для админов)
 */
export function setupAnnounceCommand(bot) {
    // Обработчик команды /announce
    bot.command('announce', (ctx) => {
        const userId = ctx.from.id;

        // Проверка прав администратора
        if (!isAdmin(userId)) {
            logger.warn(`User ${userId} tried to use /announce without admin rights`);
            return ctx.reply('❌ У вас нет прав для использования этой команды.');
        }

        // Получаем текст объявления
        const messageText = ctx.message.text.replace('/announce', '').trim();

        if (!messageText) {
            return ctx.reply(
                '⚠️ Использование: /announce <текст объявления>\n\n' +
                'Пример:\n' +
                '/announce Важное объявление для всех участников!'
            );
        }

        // Проверяем наличие групп
        const groups = groupManager.getGroups();
        if (groups.length === 0) {
            return ctx.reply(
                '❌ Нет зарегистрированных групп для рассылки.\n\n' +
                'Добавьте бота в группы, чтобы начать рассылку.'
            );
        }

        // Показываем превью и кнопки подтверждения
        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Да, отправить', `confirm_announce:${Date.now()}`),
                Markup.button.callback('❌ Отмена', 'cancel_announce')
            ]
        ]);

        logger.info(`Admin ${userId} created announcement draft`);

        ctx.reply(
            `📢 Предпросмотр объявления:\n\n` +
            `${messageText}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `Будет отправлено в ${groups.length} ${getGroupWord(groups.length)}.\n\n` +
            `Подтвердите отправку:`,
            {
                ...keyboard,
                // Сохраняем текст объявления в контексте через reply_markup
                reply_to_message_id: ctx.message.message_id
            }
        );
    });

    // Обработчик подтверждения отправки
    bot.action(/confirm_announce:(.+)/, async (ctx) => {
        const userId = ctx.from.id;

        if (!isAdmin(userId)) {
            return ctx.answerCbQuery('❌ У вас нет прав для этого действия.');
        }

        // Получаем текст объявления из исходного сообщения
        const originalMessage = ctx.callbackQuery.message.reply_to_message;
        if (!originalMessage) {
            await ctx.answerCbQuery('❌ Ошибка: исходное сообщение не найдено.');
            return ctx.editMessageText('❌ Ошибка: не удалось найти текст объявления.');
        }

        const announcementText = originalMessage.text.replace('/announce', '').trim();
        const groups = groupManager.getGroups();

        // Удаляем кнопки
        await ctx.editMessageText(
            `📢 Отправка объявления...\n\n${announcementText}\n\n━━━━━━━━━━━━━━━━━━━━\n` +
            `Отправляется в ${groups.length} ${getGroupWord(groups.length)}...`
        );

        logger.info(`Admin ${userId} confirmed announcement sending to ${groups.length} groups`);

        // Рассылка по группам
        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (const group of groups) {
            try {
                // Экранируем HTML-символы в тексте объявления
                const escapedText = escapeHtml(announcementText);

                await ctx.telegram.sendMessage(
                    group.id,
                    `📢 <b>Объявление</b>\n\n${escapedText}`,
                    { parse_mode: 'HTML' }
                );
                successCount++;
                logger.success(`Announcement sent to group ${group.title} (${group.id})`);
            } catch (error) {
                errorCount++;
                const errorMsg = `Failed to send to ${group.title} (${group.id}): ${error.message}`;
                errors.push(errorMsg);
                logger.error(errorMsg, error);
            }
        }

        // Отчет о рассылке
        let reportMessage = `✅ Рассылка завершена!\n\n`;
        reportMessage += `Успешно отправлено: ${successCount}\n`;

        if (errorCount > 0) {
            reportMessage += `Ошибок: ${errorCount}\n\n`;
            reportMessage += `Детали ошибок:\n`;
            errors.forEach((err, index) => {
                reportMessage += `${index + 1}. ${err}\n`;
            });
        }

        await ctx.editMessageText(reportMessage);
        await ctx.answerCbQuery('✅ Рассылка завершена!');
    });

    // Обработчик отмены
    bot.action('cancel_announce', async (ctx) => {
        const userId = ctx.from.id;
        logger.info(`Admin ${userId} cancelled announcement`);

        await ctx.editMessageText('❌ Рассылка отменена.');
        await ctx.answerCbQuery('Отменено');
    });
}

/**
 * Вспомогательная функция для склонения слова "группа"
 */
function getGroupWord(count) {
    if (count % 10 === 1 && count % 100 !== 11) {
        return 'группу';
    } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
        return 'группы';
    } else {
        return 'групп';
    }
}

/**
 * Экранирует HTML-символы в тексте
 */
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
