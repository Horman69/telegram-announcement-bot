import { Markup } from 'telegraf';
import { isAdmin } from '../config/admins.js';
import userManager from '../services/userManager.js';
import conversationState from '../services/conversationState.js';
import logger from '../services/logger.js';

/**
 * Команда для рассылки медиа-сообщений пользователям
 */
export function setupAnnounceUsersMediaCommand(bot) {

    // Команда /announce_users_media - запуск режима создания медиа-рассылки
    bot.command('announce_users_media', (ctx) => {
        const userId = ctx.from.id;

        // Проверка прав администратора
        if (!isAdmin(userId)) {
            logger.warn(`User ${userId} tried to use /announce_users_media without admin rights`);
            return ctx.reply('❌ У вас нет прав для использования этой команды.');
        }

        // Проверяем наличие пользователей
        const users = userManager.getApprovedUsers();
        if (users.length === 0) {
            const backKeyboard = Markup.inlineKeyboard([
                [Markup.button.callback('◀️ Назад', 'menu:user_management')]
            ]);
            return ctx.reply(
                '❌ Нет одобренных пользователей для рассылки.\n\n' +
                'Дождитесь регистрации пользователей и одобрите их заявки.',
                backKeyboard
            );
        }

        // Устанавливаем состояние: ожидаем медиа-файл
        conversationState.setState(userId, {
            action: 'announce_users_media',
            step: 'waiting_for_media'
        });

        logger.info(`Admin ${userId} started media broadcast to users`);

        const backKeyboard = Markup.inlineKeyboard([
            [Markup.button.callback('◀️ Назад', 'menu:user_management')]
        ]);

        ctx.reply(
            '📎 Отправьте медиа-файл для рассылки пользователям:\n\n' +
            '• Фото 📷\n' +
            '• Видео 🎥\n' +
            '• Документ 📄\n' +
            '• Аудио 🎵\n\n' +
            'Отправьте /cancel для отмены.',
            backKeyboard
        );
    });

    // Обработчик фото
    bot.on('photo', async (ctx, next) => {
        const userId = ctx.from.id;
        const state = conversationState.getState(userId);

        if (!state || state.action !== 'announce_users_media' || state.step !== 'waiting_for_media') {
            return next(); // Передаём другим обработчикам
        }

        const photo = ctx.message.photo[ctx.message.photo.length - 1]; // Берем самое большое фото

        conversationState.updateState(userId, {
            step: 'waiting_for_caption',
            mediaType: 'photo',
            fileId: photo.file_id
        });

        logger.info(`Admin ${userId} uploaded photo for user broadcast`);

        ctx.reply(
            '✅ Фото получено!\n\n' +
            'Теперь отправьте текст (подпись) для сообщения.\n\n' +
            'Отправьте /cancel для отмены.'
        );
    });

    // Обработчик видео
    bot.on('video', async (ctx, next) => {
        const userId = ctx.from.id;
        const state = conversationState.getState(userId);

        if (!state || state.action !== 'announce_users_media' || state.step !== 'waiting_for_media') {
            return next();
        }

        const video = ctx.message.video;

        conversationState.updateState(userId, {
            step: 'waiting_for_caption',
            mediaType: 'video',
            fileId: video.file_id
        });

        logger.info(`Admin ${userId} uploaded video for user broadcast`);

        ctx.reply(
            '✅ Видео получено!\n\n' +
            'Теперь отправьте текст (подпись) для сообщения.\n\n' +
            'Отправьте /cancel для отмены.'
        );
    });

    // Обработчик документов
    bot.on('document', async (ctx, next) => {
        const userId = ctx.from.id;
        const state = conversationState.getState(userId);

        if (!state || state.action !== 'announce_users_media' || state.step !== 'waiting_for_media') {
            return next();
        }

        const document = ctx.message.document;

        conversationState.updateState(userId, {
            step: 'waiting_for_caption',
            mediaType: 'document',
            fileId: document.file_id,
            fileName: document.file_name
        });

        logger.info(`Admin ${userId} uploaded document for user broadcast`);

        ctx.reply(
            '✅ Документ получен!\n\n' +
            'Теперь отправьте текст (подпись) для сообщения.\n\n' +
            'Отправьте /cancel для отмены.'
        );
    });

    // Обработчик аудио
    bot.on('audio', async (ctx, next) => {
        const userId = ctx.from.id;
        const state = conversationState.getState(userId);

        if (!state || state.action !== 'announce_users_media' || state.step !== 'waiting_for_media') {
            return next();
        }

        const audio = ctx.message.audio;

        conversationState.updateState(userId, {
            step: 'waiting_for_caption',
            mediaType: 'audio',
            fileId: audio.file_id,
            title: audio.title
        });

        logger.info(`Admin ${userId} uploaded audio for user broadcast`);

        ctx.reply(
            '✅ Аудио получено!\n\n' +
            'Теперь отправьте текст (подпись) для сообщения.\n\n' +
            'Отправьте /cancel для отмены.'
        );
    });

    // Обработчик текста (подпись к медиа)
    bot.on('text', async (ctx, next) => {
        const userId = ctx.from.id;
        const state = conversationState.getState(userId);

        if (!state || state.action !== 'announce_users_media' || state.step !== 'waiting_for_caption') {
            return next();
        }

        const caption = ctx.message.text;

        // Сохраняем подпись
        conversationState.updateState(userId, {
            step: 'confirm',
            caption: caption
        });

        const users = userManager.getApprovedUsers();

        // Показываем превью и кнопки подтверждения
        const confirmKeyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Да, отправить', `confirm_users_media:${Date.now()}`),
                Markup.button.callback('❌ Отмена', 'cancel_users_media')
            ]
        ]);

        const mediaTypeText = {
            photo: '📷 Фото',
            video: '🎥 Видео',
            document: '📄 Документ',
            audio: '🎵 Аудио'
        };

        logger.info(`Admin ${userId} added caption for user media broadcast`);

        ctx.reply(
            `📢 Предпросмотр рассылки:\n\n` +
            `${mediaTypeText[state.mediaType]}\n` +
            `Подпись: ${caption}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `👥 Будет отправлено ${users.length} пользовател${getUserWord(users.length)}.\n\n` +
            `Подтвердите отправку:`,
            confirmKeyboard
        );
    });

    // Обработчик подтверждения рассылки
    bot.action(/confirm_users_media:(.+)/, async (ctx) => {
        const userId = ctx.from.id;

        if (!isAdmin(userId)) {
            return ctx.answerCbQuery('❌ У вас нет прав для этого действия.');
        }

        const state = conversationState.getState(userId);

        if (!state || state.action !== 'announce_users_media' || state.step !== 'confirm') {
            await ctx.answerCbQuery('❌ Ошибка: данные не найдены');
            return ctx.editMessageText('❌ Ошибка: данные рассылки не найдены. Попробуйте снова.');
        }

        const { mediaType, fileId, caption } = state;
        const users = userManager.getApprovedUsers();

        // Очищаем состояние
        conversationState.clearState(userId);

        await ctx.answerCbQuery('Начинаю рассылку...');
        await ctx.editMessageText('📤 Начинаю рассылку медиа...');

        // Отправляем рассылку
        await sendMediaBroadcastToUsers(ctx, users, mediaType, fileId, caption, userId);
    });

    // Обработчик отмены рассылки
    bot.action('cancel_users_media', async (ctx) => {
        const userId = ctx.from.id;
        conversationState.clearState(userId);

        await ctx.answerCbQuery('Отменено');
        await ctx.editMessageText('❌ Рассылка медиа отменена.');
        logger.info(`Admin ${userId} cancelled media broadcast to users`);
    });
}

/**
 * Отправить медиа-рассылку пользователям
 */
async function sendMediaBroadcastToUsers(ctx, users, mediaType, fileId, caption, adminId) {
    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;
    let blockedCount = 0;

    const statusMessage = await ctx.reply(
        `📤 Рассылка медиа...\n\n` +
        `👥 Получателей: ${users.length}\n` +
        `⏳ Отправлено: 0/${users.length}`
    );

    for (let i = 0; i < users.length; i++) {
        const user = users[i];

        try {
            // Отправляем в зависимости от типа медиа
            switch (mediaType) {
                case 'photo':
                    await ctx.telegram.sendPhoto(user.id, fileId, { caption: caption, parse_mode: 'HTML' });
                    break;
                case 'video':
                    await ctx.telegram.sendVideo(user.id, fileId, { caption: caption, parse_mode: 'HTML' });
                    break;
                case 'document':
                    await ctx.telegram.sendDocument(user.id, fileId, { caption: caption, parse_mode: 'HTML' });
                    break;
                case 'audio':
                    await ctx.telegram.sendAudio(user.id, fileId, { caption: caption, parse_mode: 'HTML' });
                    break;
            }

            successCount++;

            // Обновляем статус каждые 5 пользователей
            if ((i + 1) % 5 === 0 || i === users.length - 1) {
                await ctx.telegram.editMessageText(
                    ctx.chat.id,
                    statusMessage.message_id,
                    null,
                    `📤 Рассылка медиа...\n\n` +
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
                logger.error(`Failed to send media to user ${user.id}:`, error);
            }
        }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    // Финальный отчёт
    await ctx.telegram.editMessageText(
        ctx.chat.id,
        statusMessage.message_id,
        null,
        `✅ Рассылка медиа завершена!\n\n` +
        `👥 Всего получателей: ${users.length}\n` +
        `✅ Успешно отправлено: ${successCount}\n` +
        `❌ Ошибок: ${errorCount}\n` +
        `🚫 Заблокировали бота: ${blockedCount}\n\n` +
        `⏱ Время: ${duration} сек`
    );

    logger.success(`Media broadcast to users completed: ${successCount}/${users.length} successful`);
}

/**
 * Вспомогательная функция для склонения слова "пользователь"
 */
function getUserWord(count) {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;

    if (lastDigit === 1 && lastTwoDigits !== 11) {
        return 'ю';  // 1 пользователю
    } else if ([2, 3, 4].includes(lastDigit) && ![12, 13, 14].includes(lastTwoDigits)) {
        return 'ям';  // 2 пользователям
    } else {
        return 'ям';  // 5 пользователям
    }
}
