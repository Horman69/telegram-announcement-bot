import { Markup } from 'telegraf';
import { isAdmin } from '../config/admins.js';
import templateManager from '../services/templateManager.js';
import groupManager from '../services/groupManager.js';
import logger from '../services/logger.js';

/**
 * Команды для работы с шаблонами
 */
export function setupTemplateCommands(bot) {

    // Команда /template_save - сохранить шаблон
    bot.command('template_save', (ctx) => {
        const userId = ctx.from.id;

        // Проверка прав администратора
        if (!isAdmin(userId)) {
            logger.warn(`User ${userId} tried to use /template_save without admin rights`);
            return ctx.reply('❌ У вас нет прав для использования этой команды.');
        }

        // Получаем название шаблона
        const templateName = ctx.message.text.replace('/template_save', '').trim();

        if (!templateName) {
            return ctx.reply(
                '⚠️ Использование: /template_save <название>\n\n' +
                'После ввода команды отправьте текст, который хотите сохранить как шаблон.\n\n' +
                'Пример:\n' +
                '/template_save приветствие\n' +
                'Привет всем! Это стандартное приветствие.'
            );
        }

        // Сохраняем состояние: ожидаем текст шаблона
        if (!bot.context.templateStates) {
            bot.context.templateStates = new Map();
        }

        bot.context.templateStates.set(userId, {
            action: 'save',
            name: templateName
        });

        logger.info(`Admin ${userId} initiated template save: "${templateName}"`);

        ctx.reply(
            `📝 Отлично! Теперь отправьте текст для шаблона "${templateName}".\n\n` +
            `Отправьте /cancel для отмены.`
        );
    });

    // Команда /template_list - список шаблонов
    bot.command('template_list', (ctx) => {
        const userId = ctx.from.id;

        // Проверка прав администратора
        if (!isAdmin(userId)) {
            logger.warn(`User ${userId} tried to use /template_list without admin rights`);
            return ctx.reply('❌ У вас нет прав для использования этой команды.');
        }

        const templates = templateManager.getTemplates();
        const templateNames = Object.keys(templates);

        if (templateNames.length === 0) {
            return ctx.reply(
                '📋 Список шаблонов пуст.\n\n' +
                'Создайте шаблон командой /template_save <название>'
            );
        }

        // Создаем inline-кнопки для каждого шаблона
        const buttons = templateNames.map(name => [
            Markup.button.callback(`📄 ${name}`, `template_view:${name}`)
        ]);

        logger.info(`Admin ${userId} viewed templates list`);

        ctx.reply(
            `📋 Доступные шаблоны (${templateNames.length}):\n\n` +
            `Нажмите на шаблон для просмотра:`,
            Markup.inlineKeyboard(buttons)
        );
    });

    // Команда /template_use - использовать шаблон
    bot.command('template_use', (ctx) => {
        const userId = ctx.from.id;

        // Проверка прав администратора
        if (!isAdmin(userId)) {
            logger.warn(`User ${userId} tried to use /template_use without admin rights`);
            return ctx.reply('❌ У вас нет прав для использования этой команды.');
        }

        // Получаем название шаблона
        const templateName = ctx.message.text.replace('/template_use', '').trim();

        if (!templateName) {
            return ctx.reply(
                '⚠️ Использование: /template_use <название>\n\n' +
                'Пример:\n' +
                '/template_use приветствие'
            );
        }

        const templateText = templateManager.getTemplate(templateName);

        if (!templateText) {
            return ctx.reply(
                `❌ Шаблон "${templateName}" не найден.\n\n` +
                `Используйте /template_list для просмотра доступных шаблонов.`
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
                Markup.button.callback('✅ Да, отправить', `confirm_template:${templateName}:${Date.now()}`),
                Markup.button.callback('❌ Отмена', 'cancel_template')
            ]
        ]);

        logger.info(`Admin ${userId} wants to use template "${templateName}"`);

        ctx.reply(
            `📢 Предпросмотр шаблона "${templateName}":\n\n` +
            `${templateText}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `Будет отправлено в ${groups.length} ${getGroupWord(groups.length)}.\n\n` +
            `Подтвердите отправку:`,
            keyboard
        );
    });

    // Команда /template_delete - удалить шаблон
    bot.command('template_delete', (ctx) => {
        const userId = ctx.from.id;

        // Проверка прав администратора
        if (!isAdmin(userId)) {
            logger.warn(`User ${userId} tried to use /template_delete without admin rights`);
            return ctx.reply('❌ У вас нет прав для использования этой команды.');
        }

        // Получаем название шаблона
        const templateName = ctx.message.text.replace('/template_delete', '').trim();

        if (!templateName) {
            return ctx.reply(
                '⚠️ Использование: /template_delete <название>\n\n' +
                'Пример:\n' +
                '/template_delete приветствие'
            );
        }

        if (!templateManager.templateExists(templateName)) {
            return ctx.reply(
                `❌ Шаблон "${templateName}" не найден.\n\n` +
                `Используйте /template_list для просмотра доступных шаблонов.`
            );
        }

        // Показываем подтверждение удаления
        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Да, удалить', `confirm_delete_template:${templateName}`),
                Markup.button.callback('❌ Отмена', 'cancel_delete_template')
            ]
        ]);

        logger.info(`Admin ${userId} wants to delete template "${templateName}"`);

        ctx.reply(
            `⚠️ Вы уверены, что хотите удалить шаблон "${templateName}"?\n\n` +
            `Это действие нельзя отменить.`,
            keyboard
        );
    });

    // Обработчик просмотра шаблона
    bot.action(/template_view:(.+)/, async (ctx) => {
        const templateName = ctx.match[1];
        const templateText = templateManager.getTemplate(templateName);

        if (!templateText) {
            await ctx.answerCbQuery('❌ Шаблон не найден');
            return ctx.editMessageText('❌ Шаблон не найден.');
        }

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('📤 Использовать', `use_template:${templateName}`),
                Markup.button.callback('🗑️ Удалить', `delete_template:${templateName}`)
            ],
            [
                Markup.button.callback('◀️ Назад к списку', 'back_to_templates')
            ]
        ]);

        await ctx.answerCbQuery();
        await ctx.editMessageText(
            `📄 Шаблон: "${templateName}"\n\n` +
            `${templateText}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `Выберите действие:`,
            keyboard
        );
    });

    // Обработчик "Использовать" из просмотра
    bot.action(/use_template:(.+)/, async (ctx) => {
        const userId = ctx.from.id;
        const templateName = ctx.match[1];
        const templateText = templateManager.getTemplate(templateName);

        if (!templateText) {
            await ctx.answerCbQuery('❌ Шаблон не найден');
            return;
        }

        const groups = groupManager.getGroups();
        if (groups.length === 0) {
            await ctx.answerCbQuery('❌ Нет групп для рассылки');
            return ctx.editMessageText('❌ Нет зарегистрированных групп для рассылки.');
        }

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Да, отправить', `confirm_template:${templateName}:${Date.now()}`),
                Markup.button.callback('❌ Отмена', 'cancel_template')
            ]
        ]);

        await ctx.answerCbQuery();
        await ctx.editMessageText(
            `📢 Предпросмотр шаблона "${templateName}":\n\n` +
            `${templateText}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `Будет отправлено в ${groups.length} ${getGroupWord(groups.length)}.\n\n` +
            `Подтвердите отправку:`,
            keyboard
        );
    });

    // Обработчик подтверждения рассылки шаблона
    bot.action(/confirm_template:(.+):(.+)/, async (ctx) => {
        const userId = ctx.from.id;
        const templateName = ctx.match[1];

        if (!isAdmin(userId)) {
            return ctx.answerCbQuery('❌ У вас нет прав для этого действия.');
        }

        const templateText = templateManager.getTemplate(templateName);
        if (!templateText) {
            await ctx.answerCbQuery('❌ Шаблон не найден');
            return ctx.editMessageText('❌ Шаблон не найден.');
        }

        const groups = groupManager.getGroups();

        await ctx.editMessageText(
            `📢 Отправка шаблона "${templateName}"...\n\n${templateText}\n\n━━━━━━━━━━━━━━━━━━━━\n` +
            `Отправляется в ${groups.length} ${getGroupWord(groups.length)}...`
        );

        logger.info(`Admin ${userId} confirmed template "${templateName}" sending to ${groups.length} groups`);

        // Рассылка по группам
        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (const group of groups) {
            try {
                const escapedText = escapeHtml(templateText);

                await ctx.telegram.sendMessage(
                    group.id,
                    `📢 <b>Объявление</b>\n\n${escapedText}`,
                    { parse_mode: 'HTML' }
                );
                successCount++;
                logger.success(`Template sent to group ${group.title} (${group.id})`);
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

    // Обработчик отмены рассылки шаблона
    bot.action('cancel_template', async (ctx) => {
        await ctx.editMessageText('❌ Рассылка отменена.');
        await ctx.answerCbQuery('Отменено');
    });

    // Обработчик "Удалить" из просмотра
    bot.action(/delete_template:(.+)/, async (ctx) => {
        const templateName = ctx.match[1];

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Да, удалить', `confirm_delete_template:${templateName}`),
                Markup.button.callback('❌ Отмена', 'cancel_delete_template')
            ]
        ]);

        await ctx.answerCbQuery();
        await ctx.editMessageText(
            `⚠️ Вы уверены, что хотите удалить шаблон "${templateName}"?\n\n` +
            `Это действие нельзя отменить.`,
            keyboard
        );
    });

    // Обработчик подтверждения удаления
    bot.action(/confirm_delete_template:(.+)/, async (ctx) => {
        const userId = ctx.from.id;
        const templateName = ctx.match[1];

        if (!isAdmin(userId)) {
            return ctx.answerCbQuery('❌ У вас нет прав для этого действия.');
        }

        const success = templateManager.deleteTemplate(templateName);

        if (success) {
            await ctx.answerCbQuery('✅ Шаблон удален');
            await ctx.editMessageText(`✅ Шаблон "${templateName}" успешно удален.`);
            logger.info(`Admin ${userId} deleted template "${templateName}"`);
        } else {
            await ctx.answerCbQuery('❌ Ошибка удаления');
            await ctx.editMessageText('❌ Не удалось удалить шаблон.');
        }
    });

    // Обработчик отмены удаления
    bot.action('cancel_delete_template', async (ctx) => {
        await ctx.editMessageText('❌ Удаление отменено.');
        await ctx.answerCbQuery('Отменено');
    });

    // Обработчик "Назад к списку"
    bot.action('back_to_templates', async (ctx) => {
        const templates = templateManager.getTemplates();
        const templateNames = Object.keys(templates);

        if (templateNames.length === 0) {
            await ctx.answerCbQuery('Нет шаблонов');
            return ctx.editMessageText('📋 Список шаблонов пуст.');
        }

        const buttons = templateNames.map(name => [
            Markup.button.callback(`📄 ${name}`, `template_view:${name}`)
        ]);

        await ctx.answerCbQuery();
        await ctx.editMessageText(
            `📋 Доступные шаблоны (${templateNames.length}):\n\n` +
            `Нажмите на шаблон для просмотра:`,
            Markup.inlineKeyboard(buttons)
        );
    });

    // Обработчик текстовых сообщений для сохранения шаблона
    bot.on('text', (ctx, next) => {
        const userId = ctx.from.id;

        if (!bot.context.templateStates) {
            return next();
        }

        const state = bot.context.templateStates.get(userId);

        if (!state || state.action !== 'save') {
            return next();
        }

        // Пользователь отправил текст для шаблона
        const templateText = ctx.message.text;
        const templateName = state.name;

        const success = templateManager.saveTemplate(templateName, templateText);

        if (success) {
            ctx.reply(`✅ Шаблон "${templateName}" успешно сохранен!\n\nИспользуйте /template_use ${templateName} для рассылки.`);
            logger.info(`Admin ${userId} saved template "${templateName}"`);
        } else {
            ctx.reply('❌ Не удалось сохранить шаблон. Попробуйте позже.');
        }

        // Очищаем состояние
        bot.context.templateStates.delete(userId);
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
