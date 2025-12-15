import { isAdmin } from '../config/admins.js';
import groupManager from '../services/groupManager.js';
import logger from '../services/logger.js';

/**
 * Команда /settopic - установка темы для группы-форума
 * Работает только в группах, сохраняет message_thread_id текущего сообщения
 */
export function setupSetTopicCommand(bot) {

    bot.command('settopic', async (ctx) => {
        const userId = ctx.from.id;
        const chatId = ctx.chat.id;
        const chatType = ctx.chat.type;

        logger.info(`[SETTOPIC] Command received from user ${userId} in chat ${chatId}`);

        // Проверка прав администратора
        if (!isAdmin(userId)) {
            logger.warn(`[SETTOPIC] User ${userId} is not admin`);
            return ctx.reply('❌ У вас нет прав для использования этой команды.');
        }

        // Проверка, что команда вызвана в группе
        if (chatType === 'private') {
            return ctx.reply('❌ Эта команда работает только в группах.');
        }

        // Проверяем, что группа зарегистрирована
        const group = groupManager.getGroupById(chatId);
        if (!group) {
            return ctx.reply(
                '❌ Эта группа не зарегистрирована для рассылки.\n\n' +
                'Сначала добавьте группу через команду /addgroup в личке с ботом.'
            );
        }

        // Получаем ID темы из ответа на сообщение
        // Telegram Bot API не передаёт message_thread_id напрямую для форумов
        // Используем трюк: пересылаем сообщение самому себе и получаем message_thread_id
        let threadId = null;

        if (ctx.message.reply_to_message) {
            try {
                // Пробуем получить message_thread_id из ответного сообщения
                const replyMsg = ctx.message.reply_to_message;

                // Проверяем разные источники threadId
                threadId = replyMsg.message_thread_id ||
                    ctx.message.message_thread_id ||
                    replyMsg.message_id;  // Fallback: используем ID сообщения

                logger.info(`[SETTOPIC] Reply message data: ${JSON.stringify({
                    reply_message_id: replyMsg.message_id,
                    reply_thread_id: replyMsg.message_thread_id,
                    current_thread_id: ctx.message.message_thread_id,
                    selected_thread_id: threadId
                })}`);

            } catch (error) {
                logger.error(`[SETTOPIC] Error getting threadId:`, error);
                return ctx.reply('❌ Ошибка при определении ID темы. Попробуйте ещё раз.');
            }
        } else if (ctx.chat.is_forum) {
            // Если форум, но нет ответа - просим ответить на сообщение
            return ctx.reply(
                '❌ Для установки темы в форуме:\n\n' +
                '1. Откройте нужную тему\n' +
                '2. Ответьте на ПЕРВОЕ сообщение в этой теме командой /settopic\n\n' +
                '💡 Важно: отвечайте именно на первое сообщение темы!\n\n' +
                'Или отправьте /settopic в главной теме (General) для сброса.'
            );
        }

        logger.info(`[SETTOPIC] Chat type: ${chatType}, is_forum: ${ctx.chat.is_forum}, threadId: ${threadId}`);

        // Сохраняем threadId
        const success = groupManager.setThreadId(chatId, threadId);

        if (!success) {
            return ctx.reply('❌ Ошибка при сохранении настроек темы.');
        }

        // Формируем ответ
        if (threadId) {
            logger.success(`[SETTOPIC] Set threadId ${threadId} for group ${chatId}`);
            await ctx.reply(
                `✅ Тема установлена!\n\n` +
                `📍 ID темы: ${threadId}\n` +
                `📊 Группа: ${group.title}\n\n` +
                `Теперь все рассылки для этой группы будут отправляться в эту тему.`
            );
        } else {
            logger.success(`[SETTOPIC] Reset threadId for group ${chatId} (General)`);
            await ctx.reply(
                `✅ Тема сброшена!\n\n` +
                `📊 Группа: ${group.title}\n\n` +
                `Теперь рассылки будут отправляться в General (главную тему).`
            );
        }
    });

    logger.success('[SETUP] /settopic command registered');
}
