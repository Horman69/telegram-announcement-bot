import { Markup } from 'telegraf';
import { isAdmin } from '../config/admins.js';
import groupManager from '../services/groupManager.js';
import logger from '../services/logger.js';

/**
 * Команды для выборочной рассылки
 */
export function setupSelectiveAnnounceCommands(bot) {

    // Команда /announce_to - рассылка по тегам
    bot.command('announce_to', (ctx) => {
        const userId = ctx.from.id;

        // Проверка прав администратора
        if (!isAdmin(userId)) {
            logger.warn(`User ${userId} tried to use /announce_to without admin rights`);
            return ctx.reply('❌ У вас нет прав для использования этой команды.');
        }

        // Парсим аргументы: /announce_to <теги> <текст>
        const fullText = ctx.message.text.replace('/announce_to', '').trim();

        if (!fullText) {
            const backKeyboard = Markup.inlineKeyboard([
                [Markup.button.callback('◀️ Назад', 'menu:announce')]
            ]);
            return ctx.reply(
                '⚠️ Использование: /announce_to <теги> <текст>\n\n' +
                'Теги указываются через запятую, затем текст объявления.\n\n' +
                'Пример:\n' +
                '/announce_to новости,важное Срочная новость для всех!\n\n' +
                'Используйте /tag_list для просмотра доступных тегов.',
                backKeyboard
            );
        }

        // Разделяем на теги и текст
        // Ищем первый пробел после тегов
        const firstSpaceIndex = fullText.indexOf(' ');

        if (firstSpaceIndex === -1) {
            const backKeyboard = Markup.inlineKeyboard([
                [Markup.button.callback('◀️ Назад', 'menu:announce')]
            ]);
            return ctx.reply('❌ Не указан текст объявления. Формат: /announce_to <теги> <текст>', backKeyboard);
        }

        const tagsStr = fullText.substring(0, firstSpaceIndex).trim();
        const messageText = fullText.substring(firstSpaceIndex + 1).trim();

        if (!messageText) {
            const backKeyboard = Markup.inlineKeyboard([
                [Markup.button.callback('◀️ Назад', 'menu:announce')]
            ]);
            return ctx.reply('❌ Текст объявления не может быть пустым.', backKeyboard);
        }

        // Парсим теги
        const tags = tagsStr.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

        if (tags.length === 0) {
            const backKeyboard = Markup.inlineKeyboard([
                [Markup.button.callback('◀️ Назад', 'menu:announce')]
            ]);
            return ctx.reply('❌ Не указаны теги. Формат: /announce_to <теги> <текст>', backKeyboard);
        }

        // Получаем группы по тегам
        const targetGroups = groupManager.getGroupsByTags(tags);

        if (targetGroups.length === 0) {
            const backKeyboard = Markup.inlineKeyboard([
                [Markup.button.callback('◀️ Назад', 'menu:announce')]
            ]);
            return ctx.reply(
                `❌ Нет групп с тегами: ${tags.map(t => `#${t}`).join(', ')}\n\n` +
                'Используйте /tag_list для просмотра доступных тегов.',
                backKeyboard
            );
        }

        // Показываем превью и кнопки подтверждения
        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Да, отправить', `confirm_announce_tags:${Date.now()}`),
                Markup.button.callback('❌ Отмена', 'cancel_announce_tags')
            ]
        ]);

        const groupsList = targetGroups.map(g => `• ${g.title}`).join('\n');

        logger.info(`Admin ${userId} created selective announcement for tags: ${tags.join(', ')}`);

        ctx.reply(
            `📢 Предпросмотр объявления:\n\n` +
            `${messageText}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `Теги: ${tags.map(t => `#${t}`).join(', ')}\n` +
            `Будет отправлено в ${targetGroups.length} ${getGroupWord(targetGroups.length)}:\n\n` +
            `${groupsList}\n\n` +
            `Подтвердите отправку:`,
            {
                ...keyboard,
                reply_to_message_id: ctx.message.message_id
            }
        );
    });

    // Команда /announce_groups - рассылка по конкретным ID
    bot.command('announce_groups', (ctx) => {
        const userId = ctx.from.id;

        // Проверка прав администратора
        if (!isAdmin(userId)) {
            logger.warn(`User ${userId} tried to use /announce_groups without admin rights`);
            return ctx.reply('❌ У вас нет прав для использования этой команды.');
        }

        // Парсим аргументы: /announce_groups <id1,id2> <текст>
        const fullText = ctx.message.text.replace('/announce_groups', '').trim();

        if (!fullText) {
            const backKeyboard = Markup.inlineKeyboard([
                [Markup.button.callback('◀️ Назад', 'menu:announce')]
            ]);
            return ctx.reply(
                '⚠️ Использование: /announce_groups <id1,id2> <текст>\n\n' +
                'ID групп указываются через запятую, затем текст объявления.\n\n' +
                'Пример:\n' +
                '/announce_groups -1001601437600 Сообщение для конкретной группы\n\n' +
                'Используйте /groups для просмотра ID групп.',
                backKeyboard
            );
        }

        // Разделяем на ID и текст
        const firstSpaceIndex = fullText.indexOf(' ');

        if (firstSpaceIndex === -1) {
            const backKeyboard = Markup.inlineKeyboard([
                [Markup.button.callback('◀️ Назад', 'menu:announce')]
            ]);
            return ctx.reply('❌ Не указан текст объявления. Формат: /announce_groups <id1,id2> <текст>', backKeyboard);
        }

        const idsStr = fullText.substring(0, firstSpaceIndex).trim();
        const messageText = fullText.substring(firstSpaceIndex + 1).trim();

        if (!messageText) {
            const backKeyboard = Markup.inlineKeyboard([
                [Markup.button.callback('◀️ Назад', 'menu:announce')]
            ]);
            return ctx.reply('❌ Текст объявления не может быть пустым.', backKeyboard);
        }

        // Парсим ID
        const groupIds = idsStr.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

        if (groupIds.length === 0) {
            const backKeyboard = Markup.inlineKeyboard([
                [Markup.button.callback('◀️ Назад', 'menu:announce')]
            ]);
            return ctx.reply('❌ Не указаны корректные ID групп. Формат: /announce_groups <id1,id2> <текст>', backKeyboard);
        }

        // Получаем группы по ID
        const allGroups = groupManager.getGroups();
        const targetGroups = allGroups.filter(g => groupIds.includes(g.id));

        if (targetGroups.length === 0) {
            const backKeyboard = Markup.inlineKeyboard([
                [Markup.button.callback('◀️ Назад', 'menu:announce')]
            ]);
            return ctx.reply(
                `❌ Ни одна из указанных групп не найдена.\n\n` +
                'Используйте /groups для просмотра доступных групп.',
                backKeyboard
            );
        }

        // Проверяем, какие ID не найдены
        const foundIds = targetGroups.map(g => g.id);
        const notFoundIds = groupIds.filter(id => !foundIds.includes(id));

        let warningMessage = '';
        if (notFoundIds.length > 0) {
            warningMessage = `\n⚠️ Не найдены группы с ID: ${notFoundIds.join(', ')}\n`;
        }

        // Показываем превью и кнопки подтверждения
        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Да, отправить', `confirm_announce_ids:${Date.now()}`),
                Markup.button.callback('❌ Отмена', 'cancel_announce_ids')
            ]
        ]);

        const groupsList = targetGroups.map(g => `• ${g.title} (${g.id})`).join('\n');

        logger.info(`Admin ${userId} created selective announcement for group IDs: ${groupIds.join(', ')}`);

        ctx.reply(
            `📢 Предпросмотр объявления:\n\n` +
            `${messageText}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `Будет отправлено в ${targetGroups.length} ${getGroupWord(targetGroups.length)}:\n\n` +
            `${groupsList}${warningMessage}\n\n` +
            `Подтвердите отправку:`,
            {
                ...keyboard,
                reply_to_message_id: ctx.message.message_id
            }
        );
    });

    // Обработчик подтверждения рассылки по тегам
    bot.action(/confirm_announce_tags:(.+)/, async (ctx) => {
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

        const fullText = originalMessage.text.replace('/announce_to', '').trim();
        const firstSpaceIndex = fullText.indexOf(' ');
        const tagsStr = fullText.substring(0, firstSpaceIndex).trim();
        const announcementText = fullText.substring(firstSpaceIndex + 1).trim();
        const tags = tagsStr.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

        const targetGroups = groupManager.getGroupsByTags(tags);

        await ctx.editMessageText(
            `📢 Отправка объявления...\n\n${announcementText}\n\n━━━━━━━━━━━━━━━━━━━━\n` +
            `Отправляется в ${targetGroups.length} ${getGroupWord(targetGroups.length)}...`
        );

        logger.info(`Admin ${userId} confirmed selective announcement to ${targetGroups.length} groups`);

        // Рассылка по группам
        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (const group of targetGroups) {
            try {
                const escapedText = escapeHtml(announcementText);

                await ctx.telegram.sendMessage(
                    group.id,
                    `📢 <b>Объявление</b>\n\n${escapedText}`,
                    {
                        parse_mode: 'HTML',
                        message_thread_id: group.threadId || undefined
                    }
                );
                successCount++;
                logger.success(`Announcement sent to group ${group.title} (${group.id})`);
            } catch (error) {
                // Если тема форума не найдена, сбрасываем threadId и пробуем отправить в General
                if (error.response?.description?.includes('message thread not found') && group.threadId) {
                    logger.warn(`Thread ${group.threadId} not found in group ${group.title}, resetting to General`);
                    groupManager.setThreadId(group.id, null);

                    try {
                        await ctx.telegram.sendMessage(
                            group.id,
                            `📢 <b>Объявление</b>\n\n${escapedText}`,
                            { parse_mode: 'HTML' }
                        );
                        successCount++;
                        logger.success(`Announcement sent to group ${group.title} (${group.id}) in General (thread was reset)`);
                    } catch (retryError) {
                        errorCount++;
                        const errorMsg = `Failed to send to ${group.title} (${group.id}): ${retryError.message}`;
                        errors.push(errorMsg);
                        logger.error(errorMsg, retryError);
                    }
                } else {
                    errorCount++;
                    const errorMsg = `Failed to send to ${group.title} (${group.id}): ${error.message}`;
                    errors.push(errorMsg);
                    logger.error(errorMsg, error);
                }
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

        const backKeyboard = Markup.inlineKeyboard([
            [Markup.button.callback('◀️ Назад в меню', 'menu:announce')]
        ]);

        await ctx.editMessageText(reportMessage, backKeyboard);
        await ctx.answerCbQuery('✅ Рассылка завершена!');
    });

    // Обработчик подтверждения рассылки по ID
    bot.action(/confirm_announce_ids:(.+)/, async (ctx) => {
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

        const fullText = originalMessage.text.replace('/announce_groups', '').trim();
        const firstSpaceIndex = fullText.indexOf(' ');
        const idsStr = fullText.substring(0, firstSpaceIndex).trim();
        const announcementText = fullText.substring(firstSpaceIndex + 1).trim();
        const groupIds = idsStr.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

        const allGroups = groupManager.getGroups();
        const targetGroups = allGroups.filter(g => groupIds.includes(g.id));

        await ctx.editMessageText(
            `📢 Отправка объявления...\n\n${announcementText}\n\n━━━━━━━━━━━━━━━━━━━━\n` +
            `Отправляется в ${targetGroups.length} ${getGroupWord(targetGroups.length)}...`
        );

        logger.info(`Admin ${userId} confirmed selective announcement to ${targetGroups.length} groups`);

        // Рассылка по группам
        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (const group of targetGroups) {
            try {
                const escapedText = escapeHtml(announcementText);

                await ctx.telegram.sendMessage(
                    group.id,
                    `📢 <b>Объявление</b>\n\n${escapedText}`,
                    {
                        parse_mode: 'HTML',
                        message_thread_id: group.threadId || undefined
                    }
                );
                successCount++;
                logger.success(`Announcement sent to group ${group.title} (${group.id})`);
            } catch (error) {
                // Если тема форума не найдена, сбрасываем threadId и пробуем отправить в General
                if (error.response?.description?.includes('message thread not found') && group.threadId) {
                    logger.warn(`Thread ${group.threadId} not found in group ${group.title}, resetting to General`);
                    groupManager.setThreadId(group.id, null);

                    try {
                        await ctx.telegram.sendMessage(
                            group.id,
                            `📢 <b>Объявление</b>\n\n${escapedText}`,
                            { parse_mode: 'HTML' }
                        );
                        successCount++;
                        logger.success(`Announcement sent to group ${group.title} (${group.id}) in General (thread was reset)`);
                    } catch (retryError) {
                        errorCount++;
                        const errorMsg = `Failed to send to ${group.title} (${group.id}): ${retryError.message}`;
                        errors.push(errorMsg);
                        logger.error(errorMsg, retryError);
                    }
                } else {
                    errorCount++;
                    const errorMsg = `Failed to send to ${group.title} (${group.id}): ${error.message}`;
                    errors.push(errorMsg);
                    logger.error(errorMsg, error);
                }
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

        const backKeyboard = Markup.inlineKeyboard([
            [Markup.button.callback('◀️ Назад в меню', 'menu:announce')]
        ]);

        await ctx.editMessageText(reportMessage, backKeyboard);
        await ctx.answerCbQuery('✅ Рассылка завершена!');
    });

    // Обработчики отмены
    bot.action('cancel_announce_tags', async (ctx) => {
        const userId = ctx.from.id;
        logger.info(`Admin ${userId} cancelled selective announcement (tags)`);

        const backKeyboard = Markup.inlineKeyboard([
            [Markup.button.callback('◀️ Назад в меню', 'menu:announce')]
        ]);
        await ctx.editMessageText('❌ Рассылка отменена.', backKeyboard);
        await ctx.answerCbQuery('Отменено');
    });

    bot.action('cancel_announce_ids', async (ctx) => {
        const userId = ctx.from.id;
        logger.info(`Admin ${userId} cancelled selective announcement (IDs)`);

        const backKeyboard = Markup.inlineKeyboard([
            [Markup.button.callback('◀️ Назад в меню', 'menu:announce')]
        ]);
        await ctx.editMessageText('❌ Рассылка отменена.', backKeyboard);
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
