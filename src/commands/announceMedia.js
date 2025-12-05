import { Markup } from 'telegraf';
import { isAdmin } from '../config/admins.js';
import groupManager from '../services/groupManager.js';
import conversationState from '../services/conversationState.js';
import logger from '../services/logger.js';

/**
 * Команда для рассылки объявлений с медиа-файлами
 */
export function setupAnnounceMediaCommand(bot) {

    // Команда /announce_media - запуск режима создания объявления с медиа
    bot.command('announce_media', (ctx) => {
        const userId = ctx.from.id;

        // Проверка прав администратора
        if (!isAdmin(userId)) {
            logger.warn(`User ${userId} tried to use /announce_media without admin rights`);
            return ctx.reply('❌ У вас нет прав для использования этой команды.');
        }

        // Проверяем наличие групп
        const groups = groupManager.getGroups();
        if (groups.length === 0) {
            return ctx.reply(
                '❌ Нет зарегистрированных групп для рассылки.\n\n' +
                'Добавьте бота в группы, чтобы начать рассылку.'
            );
        }

        // Устанавливаем состояние: ожидаем медиа-файл
        conversationState.setState(userId, {
            action: 'announce_media',
            step: 'waiting_for_media'
        });

        logger.info(`Admin ${userId} started media announcement creation`);

        ctx.reply(
            '📎 Отправьте медиа-файл для объявления:\n\n' +
            '• Фото 📷\n' +
            '• Видео 🎥\n' +
            '• Документ 📄\n' +
            '• Аудио 🎵\n\n' +
            'Отправьте /cancel для отмены.'
        );
    });

    // Обработчик фото
    bot.on('photo', async (ctx) => {
        const userId = ctx.from.id;
        const state = conversationState.getState(userId);

        if (!state || state.action !== 'announce_media' || state.step !== 'waiting_for_media') {
            return; // Игнорируем, если не в режиме создания медиа-объявления
        }

        const photo = ctx.message.photo[ctx.message.photo.length - 1]; // Берем самое большое фото

        conversationState.updateState(userId, {
            step: 'waiting_for_caption',
            mediaType: 'photo',
            fileId: photo.file_id
        });

        logger.info(`Admin ${userId} uploaded photo for announcement`);

        ctx.reply(
            '✅ Фото получено!\n\n' +
            'Теперь отправьте текст (подпись) для объявления.\n\n' +
            'Отправьте /cancel для отмены.'
        );
    });

    // Обработчик видео
    bot.on('video', async (ctx) => {
        const userId = ctx.from.id;
        const state = conversationState.getState(userId);

        if (!state || state.action !== 'announce_media' || state.step !== 'waiting_for_media') {
            return;
        }

        const video = ctx.message.video;

        conversationState.updateState(userId, {
            step: 'waiting_for_caption',
            mediaType: 'video',
            fileId: video.file_id
        });

        logger.info(`Admin ${userId} uploaded video for announcement`);

        ctx.reply(
            '✅ Видео получено!\n\n' +
            'Теперь отправьте текст (подпись) для объявления.\n\n' +
            'Отправьте /cancel для отмены.'
        );
    });

    // Обработчик документов
    bot.on('document', async (ctx) => {
        const userId = ctx.from.id;
        const state = conversationState.getState(userId);

        if (!state || state.action !== 'announce_media' || state.step !== 'waiting_for_media') {
            return;
        }

        const document = ctx.message.document;

        conversationState.updateState(userId, {
            step: 'waiting_for_caption',
            mediaType: 'document',
            fileId: document.file_id,
            fileName: document.file_name
        });

        logger.info(`Admin ${userId} uploaded document for announcement`);

        ctx.reply(
            '✅ Документ получен!\n\n' +
            'Теперь отправьте текст (подпись) для объявления.\n\n' +
            'Отправьте /cancel для отмены.'
        );
    });

    // Обработчик аудио
    bot.on('audio', async (ctx) => {
        const userId = ctx.from.id;
        const state = conversationState.getState(userId);

        if (!state || state.action !== 'announce_media' || state.step !== 'waiting_for_media') {
            return;
        }

        const audio = ctx.message.audio;

        conversationState.updateState(userId, {
            step: 'waiting_for_caption',
            mediaType: 'audio',
            fileId: audio.file_id,
            fileName: audio.file_name || audio.title
        });

        logger.info(`Admin ${userId} uploaded audio for announcement`);

        ctx.reply(
            '✅ Аудио получено!\n\n' +
            'Теперь отправьте текст (подпись) для объявления.\n\n' +
            'Отправьте /cancel для отмены.'
        );
    });

    // Обработчик текста (для подписи к медиа)
    bot.on('text', async (ctx) => {
        const userId = ctx.from.id;
        const state = conversationState.getState(userId);

        // Проверяем, что это не команда
        if (ctx.message.text.startsWith('/')) {
            return;
        }

        if (!state || state.action !== 'announce_media' || state.step !== 'waiting_for_caption') {
            return;
        }

        const caption = ctx.message.text;
        const groups = groupManager.getGroups();

        // Показываем превью и кнопки подтверждения
        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Да, отправить', `confirm_media_announce:${Date.now()}`),
                Markup.button.callback('❌ Отмена', 'cancel_media_announce')
            ]
        ]);

        // Сохраняем подпись в состоянии
        conversationState.updateState(userId, {
            caption: caption
        });

        logger.info(`Admin ${userId} added caption to media announcement`);

        // Отправляем превью с медиа
        const mediaTypeEmoji = {
            photo: '📷',
            video: '🎥',
            document: '📄',
            audio: '🎵'
        };

        let previewMessage = `${mediaTypeEmoji[state.mediaType]} Предпросмотр объявления с медиа:\n\n`;
        previewMessage += `Тип: ${getMediaTypeName(state.mediaType)}\n`;
        if (state.fileName) {
            previewMessage += `Файл: ${state.fileName}\n`;
        }
        previewMessage += `\nПодпись:\n${caption}\n\n`;
        previewMessage += `━━━━━━━━━━━━━━━━━━━━\n`;
        previewMessage += `Будет отправлено в ${groups.length} ${getGroupWord(groups.length)}.\n\n`;
        previewMessage += `Подтвердите отправку:`;

        // Отправляем превью с самим медиа
        try {
            if (state.mediaType === 'photo') {
                await ctx.replyWithPhoto(state.fileId, {
                    caption: previewMessage,
                    ...keyboard
                });
            } else if (state.mediaType === 'video') {
                await ctx.replyWithVideo(state.fileId, {
                    caption: previewMessage,
                    ...keyboard
                });
            } else if (state.mediaType === 'document') {
                await ctx.replyWithDocument(state.fileId, {
                    caption: previewMessage,
                    ...keyboard
                });
            } else if (state.mediaType === 'audio') {
                await ctx.replyWithAudio(state.fileId, {
                    caption: previewMessage,
                    ...keyboard
                });
            }
        } catch (error) {
            logger.error('Error sending media preview:', error);
            ctx.reply('❌ Ошибка при отправке превью. Попробуйте снова.');
            conversationState.clearState(userId);
        }
    });

    // Обработчик подтверждения рассылки медиа
    bot.action(/confirm_media_announce:(.+)/, async (ctx) => {
        const userId = ctx.from.id;

        if (!isAdmin(userId)) {
            return ctx.answerCbQuery('❌ У вас нет прав для этого действия.');
        }

        const state = conversationState.getState(userId);
        if (!state || state.action !== 'announce_media') {
            await ctx.answerCbQuery('❌ Сессия истекла. Начните заново.');
            return ctx.editMessageCaption('❌ Сессия истекла. Используйте /announce_media для создания нового объявления.');
        }

        const groups = groupManager.getGroups();
        const { mediaType, fileId, caption } = state;

        await ctx.editMessageCaption(
            `📢 Отправка объявления с медиа...\n\n` +
            `Отправляется в ${groups.length} ${getGroupWord(groups.length)}...`
        );

        logger.info(`Admin ${userId} confirmed media announcement sending to ${groups.length} groups`);

        // Рассылка по группам
        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (const group of groups) {
            try {
                const escapedCaption = escapeHtml(caption);
                const fullCaption = `📢 <b>Объявление</b>\n\n${escapedCaption}`;

                if (mediaType === 'photo') {
                    await ctx.telegram.sendPhoto(group.id, fileId, {
                        caption: fullCaption,
                        parse_mode: 'HTML'
                    });
                } else if (mediaType === 'video') {
                    await ctx.telegram.sendVideo(group.id, fileId, {
                        caption: fullCaption,
                        parse_mode: 'HTML'
                    });
                } else if (mediaType === 'document') {
                    await ctx.telegram.sendDocument(group.id, fileId, {
                        caption: fullCaption,
                        parse_mode: 'HTML'
                    });
                } else if (mediaType === 'audio') {
                    await ctx.telegram.sendAudio(group.id, fileId, {
                        caption: fullCaption,
                        parse_mode: 'HTML'
                    });
                }

                successCount++;
                logger.success(`Media announcement sent to group ${group.title} (${group.id})`);
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

        await ctx.editMessageCaption(reportMessage);
        await ctx.answerCbQuery('✅ Рассылка завершена!');

        // Очищаем состояние
        conversationState.clearState(userId);
    });

    // Обработчик отмены
    bot.action('cancel_media_announce', async (ctx) => {
        const userId = ctx.from.id;
        logger.info(`Admin ${userId} cancelled media announcement`);

        await ctx.editMessageCaption('❌ Рассылка отменена.');
        await ctx.answerCbQuery('Отменено');

        conversationState.clearState(userId);
    });

    // Команда /cancel - отмена текущего действия
    bot.command('cancel', (ctx) => {
        const userId = ctx.from.id;
        const state = conversationState.getState(userId);

        if (!state) {
            return ctx.reply('Нет активных действий для отмены.');
        }

        conversationState.clearState(userId);
        logger.info(`User ${userId} cancelled action: ${state.action}`);

        ctx.reply('❌ Действие отменено.');
    });

    // Периодическая очистка старых состояний (каждый час)
    setInterval(() => {
        conversationState.cleanupOldStates();
    }, 60 * 60 * 1000);
}

/**
 * Вспомогательная функция для получения названия типа медиа
 */
function getMediaTypeName(type) {
    const names = {
        photo: 'Фото',
        video: 'Видео',
        document: 'Документ',
        audio: 'Аудио'
    };
    return names[type] || type;
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
