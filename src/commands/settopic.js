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
                '❌ Эта группа не зарегистрирована для рассылки.\\n\\n' +
                'Сначала добавьте группу через команду /addgroup в личке с ботом.'
            );
        }

        // Получаем ID темы из текущего сообщения
        const threadId = ctx.message.message_thread_id || null;

        logger.info(`[SETTOPIC] Chat type: ${chatType}, is_forum: ${ctx.chat.is_forum}, threadId: ${threadId}`);
        logger.info(`[SETTOPIC] Full message data: ${JSON.stringify({
            message_id: ctx.message.message_id,
            message_thread_id: ctx.message.message_thread_id,
            chat_type: ctx.chat.type,
            is_forum: ctx.chat.is_forum
        })}`);

        // Сохраняем threadId
        const success = groupManager.setThreadId(chatId, threadId);

        if (!success) {
            return ctx.reply('❌ Ошибка при сохранении настроек темы.');
        }

        // Формируем ответ
        if (threadId) {
            logger.success(`[SETTOPIC] Set threadId ${threadId} for group ${chatId}`);
            await ctx.reply(
                `✅ Тема установлена!\\n\\n` +
                `📍 ID темы: ${threadId}\\n` +
                `📊 Группа: ${group.title}\\n\\n` +
                `Теперь все рассылки для этой группы будут отправляться в эту тему.`
            );
        } else {
            logger.success(`[SETTOPIC] Reset threadId for group ${chatId} (General)`);
            await ctx.reply(
                `✅ Тема сброшена!\\n\\n` +
                `📊 Группа: ${group.title}\\n\\n` +
                `Теперь рассылки будут отправляться в General (главную тему).`
            );
        }
    });

    logger.success('[SETUP] /settopic command registered');
}
