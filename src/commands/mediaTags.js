import { Markup } from 'telegraf';
import { isAdmin } from '../config/admins.js';
import groupManager from '../services/groupManager.js';
import conversationState from '../services/conversationState.js';
import logger from '../services/logger.js';

/**
 * Команда /mediatags - рассылка медиа по тегам
 * Простая реализация без сложных обработчиков
 */
export function setupMediaTagsCommand(bot) {

    logger.info('[SETUP] Registering /mediatags command...');

    // Команда /mediatags <теги>
    bot.command('mediatags', async (ctx) => {
        logger.info(`[MEDIATAGS] ===== HANDLER CALLED =====`);

        const userId = ctx.from.id;

        logger.info(`[MEDIATAGS] Command received from user ${userId}`);

        // Проверка прав
        if (!isAdmin(userId)) {
            logger.warn(`[MEDIATAGS] User ${userId} is not admin`);
            return ctx.reply('❌ У вас нет прав для использования этой команды.');
        }

        // Получаем теги из команды
        const args = ctx.message.text.split(' ').slice(1).join(' ');

        if (!args) {
            return ctx.reply(
                '⚠️ Использование: /mediatags <теги>\n\n' +
                'Пример: /mediatags важное,новости\n' +
                'Затем отправьте медиа-файл и текст.'
            );
        }

        // Парсим теги
        const tags = args.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag);

        if (tags.length === 0) {
            return ctx.reply('❌ Не указаны теги.');
        }

        // Фильтруем группы по тегам
        const allGroups = groupManager.getGroups();
        const targetGroups = allGroups.filter(group => {
            if (!group.tags || group.tags.length === 0) return false;
            return tags.some(tag => group.tags.includes(tag));
        });

        if (targetGroups.length === 0) {
            return ctx.reply(`❌ Нет групп с тегами: ${tags.join(', ')}`);
        }

        // Сохраняем состояние
        conversationState.setState(userId, {
            action: 'mediatags',
            step: 'waiting_media',
            tags: tags,
            targetGroups: targetGroups
        });

        logger.info(`[MEDIATAGS] User ${userId} selected ${targetGroups.length} groups with tags: ${tags.join(', ')}`);

        await ctx.reply(
            `✅ Выбрано групп: ${targetGroups.length}\n` +
            `Теги: ${tags.join(', ')}\n\n` +
            `📎 Теперь отправьте медиа-файл (фото, видео, документ или аудио).`
        );
    });

    // Обработчик медиа
    bot.on(['photo', 'video', 'document', 'audio'], async (ctx, next) => {
        const userId = ctx.from.id;
        const state = conversationState.getState(userId);

        if (!state || state.action !== 'mediatags' || state.step !== 'waiting_media') {
            return next();
        }

        logger.info(`[MEDIATAGS] Media received from user ${userId}`);

        // Сохраняем медиа
        let mediaType, mediaId;
        if (ctx.message.photo) {
            mediaType = 'photo';
            mediaId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
        } else if (ctx.message.video) {
            mediaType = 'video';
            mediaId = ctx.message.video.file_id;
        } else if (ctx.message.document) {
            mediaType = 'document';
            mediaId = ctx.message.document.file_id;
        } else if (ctx.message.audio) {
            mediaType = 'audio';
            mediaId = ctx.message.audio.file_id;
        }

        conversationState.setState(userId, {
            ...state,
            step: 'waiting_caption',
            mediaType: mediaType,
            mediaId: mediaId
        });

        await ctx.reply('✅ Медиа получено!\n\n📝 Теперь отправьте текст (подпись) для объявления.');
    });

    // Обработчик текста (подписи)
    bot.on('text', async (ctx, next) => {
        const userId = ctx.from.id;
        const state = conversationState.getState(userId);

        // Пропускаем команды
        if (ctx.message.text.startsWith('/')) {
            return next();
        }

        if (!state || state.action !== 'mediatags' || state.step !== 'waiting_caption') {
            return next();
        }

        logger.info(`[MEDIATAGS] Caption received from user ${userId}`);

        const caption = ctx.message.text;

        // Показываем превью
        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Отправить', 'mediatags_send'),
                Markup.button.callback('❌ Отмена', 'mediatags_cancel')
            ]
        ]);

        conversationState.setState(userId, {
            ...state,
            caption: caption
        });

        await ctx.reply(
            `📋 Превью объявления:\n\n` +
            `📎 Медиа: ${state.mediaType}\n` +
            `📝 Текст: ${caption}\n` +
            `🏷️ Теги: ${state.tags.join(', ')}\n` +
            `👥 Групп: ${state.targetGroups.length}\n\n` +
            `Отправить?`,
            keyboard
        );
    });

    // Обработчик кнопки "Отправить"
    bot.action('mediatags_send', async (ctx) => {
        const userId = ctx.from.id;
        const state = conversationState.getState(userId);

        if (!state || state.action !== 'mediatags') {
            return ctx.answerCbQuery('❌ Сессия истекла');
        }

        await ctx.answerCbQuery('📤 Отправляю...');
        await ctx.editMessageText('⏳ Отправка объявлений...');

        let successCount = 0;
        let failCount = 0;

        for (const group of state.targetGroups) {
            try {
                const sendMethod = {
                    'photo': 'sendPhoto',
                    'video': 'sendVideo',
                    'document': 'sendDocument',
                    'audio': 'sendAudio'
                }[state.mediaType];

                await ctx.telegram[sendMethod](group.id, state.mediaId, {
                    caption: state.caption,
                    parse_mode: 'HTML',
                    message_thread_id: group.threadId || undefined  // Отправка в тему форума
                });

                successCount++;
                logger.info(`[MEDIATAGS] Sent to group ${group.id}`);
            } catch (error) {
                // Если тема форума не найдена, сбрасываем threadId и пробуем отправить в General
                if (error.response?.description?.includes('message thread not found') && group.threadId) {
                    logger.warn(`[MEDIATAGS] Thread ${group.threadId} not found in group ${group.id}, resetting to General`);
                    groupManager.setThreadId(group.id, null);

                    try {
                        const sendMethod = {
                            'photo': 'sendPhoto',
                            'video': 'sendVideo',
                            'document': 'sendDocument',
                            'audio': 'sendAudio'
                        }[state.mediaType];

                        await ctx.telegram[sendMethod](group.id, state.mediaId, {
                            caption: state.caption,
                            parse_mode: 'HTML'
                        });

                        successCount++;
                        logger.info(`[MEDIATAGS] Sent to group ${group.id} in General (thread was reset)`);
                    } catch (retryError) {
                        failCount++;
                        logger.error(`[MEDIATAGS] Failed to send to group ${group.id}:`, retryError.message);
                    }
                } else {
                    failCount++;
                    logger.error(`[MEDIATAGS] Failed to send to group ${group.id}:`, error.message);
                }
            }
        }

        conversationState.clearState(userId);

        await ctx.editMessageText(
            `✅ Рассылка завершена!\n\n` +
            `✅ Отправлено: ${successCount}\n` +
            `❌ Ошибок: ${failCount}`
        );
    });

    // Обработчик кнопки "Отмена"
    bot.action('mediatags_cancel', async (ctx) => {
        const userId = ctx.from.id;
        conversationState.clearState(userId);

        await ctx.answerCbQuery('Отменено');
        await ctx.editMessageText('❌ Рассылка отменена.');
    });

    logger.success('[SETUP] /mediatags command registered successfully!');
}
