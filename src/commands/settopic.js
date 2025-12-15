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

        // Получаем ID темы из текста команды или сбрасываем
        // Формат: /settopic <ID> или /settopic reset
        const args = ctx.message.text.split(' ').slice(1);
        let threadId = null;

        if (args.length > 0) {
            if (args[0].toLowerCase() === 'reset') {
                // Сброс темы
                threadId = null;
            } else {
                // Пробуем распарсить ID
                const parsedId = parseInt(args[0]);
                if (isNaN(parsedId)) {
                    return ctx.reply(
                        '❌ Неверный формат ID темы.\n\n' +
                        'Используйте:\n' +
                        '/settopic <ID> - установить тему\n' +
                        '/settopic reset - сбросить тему\n\n' +
                        'Пример: /settopic 123'
                    );
                }
                threadId = parsedId;
            }
        } else if (ctx.chat.is_forum) {
            // Если форум и нет аргументов - показываем инструкцию
            return ctx.reply(
                '📍 Как установить тему для форума:\n\n' +
                '1. Откройте нужную тему в Telegram\n' +
                '2. Нажмите на название темы вверху\n' +
                '3. Скопируйте ID темы из URL (число после /)\n' +
                '4. Отправьте: /settopic <ID>\n\n' +
                'Пример: /settopic 123\n\n' +
                'Для сброса: /settopic reset'
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
                `📊 Группа: ${group.title}`
            );
        } else {
            logger.success(`[SETTOPIC] Reset threadId for group ${chatId} (General)`);
            await ctx.reply(
                `✅ Тема сброшена!\n\n` +
                `📊 Группа: ${group.title}`
            );
        }
    });

    logger.success('[SETUP] /settopic command registered');
}
