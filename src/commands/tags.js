import { Markup } from 'telegraf';
import { isAdmin } from '../config/admins.js';
import groupManager from '../services/groupManager.js';
import logger from '../services/logger.js';

/**
 * Команды для работы с тегами групп
 */
export function setupTagCommands(bot) {

    // Команда /tag_add - добавить тег группе
    bot.command('tag_add', (ctx) => {
        const userId = ctx.from.id;

        // Проверка прав администратора
        if (!isAdmin(userId)) {
            logger.warn(`User ${userId} tried to use /tag_add without admin rights`);
            return ctx.reply('❌ У вас нет прав для использования этой команды.');
        }

        // Парсим аргументы: /tag_add <group_id> <тег>
        const args = ctx.message.text.replace('/tag_add', '').trim().split(/\s+/);

        if (args.length < 2) {
            return ctx.reply(
                '⚠️ Использование: /tag_add <group_id> <тег>\n\n' +
                'Пример:\n' +
                '/tag_add -1001601437600 новости\n\n' +
                'Используйте /groups для просмотра ID групп.'
            );
        }

        const groupId = parseInt(args[0]);
        const tag = args.slice(1).join(' '); // Тег может состоять из нескольких слов

        if (isNaN(groupId)) {
            return ctx.reply('❌ Неверный формат ID группы. ID должен быть числом.');
        }

        const group = groupManager.getGroupById(groupId);
        if (!group) {
            return ctx.reply(
                `❌ Группа с ID ${groupId} не найдена.\n\n` +
                'Используйте /groups для просмотра доступных групп.'
            );
        }

        const success = groupManager.addTag(groupId, tag);

        if (success) {
            ctx.reply(
                `✅ Тег "${tag}" добавлен группе "${group.title}".\n\n` +
                `Теперь вы можете использовать этот тег для выборочной рассылки.`
            );
            logger.info(`Admin ${userId} added tag "${tag}" to group ${groupId}`);
        } else {
            ctx.reply(`❌ Не удалось добавить тег. Возможно, он уже существует.`);
        }
    });

    // Команда /tag_remove - удалить тег у группы
    bot.command('tag_remove', (ctx) => {
        const userId = ctx.from.id;

        // Проверка прав администратора
        if (!isAdmin(userId)) {
            logger.warn(`User ${userId} tried to use /tag_remove without admin rights`);
            return ctx.reply('❌ У вас нет прав для использования этой команды.');
        }

        // Парсим аргументы: /tag_remove <group_id> <тег>
        const args = ctx.message.text.replace('/tag_remove', '').trim().split(/\s+/);

        if (args.length < 2) {
            return ctx.reply(
                '⚠️ Использование: /tag_remove <group_id> <тег>\n\n' +
                'Пример:\n' +
                '/tag_remove -1001601437600 новости'
            );
        }

        const groupId = parseInt(args[0]);
        const tag = args.slice(1).join(' ');

        if (isNaN(groupId)) {
            return ctx.reply('❌ Неверный формат ID группы. ID должен быть числом.');
        }

        const group = groupManager.getGroupById(groupId);
        if (!group) {
            return ctx.reply(
                `❌ Группа с ID ${groupId} не найдена.\n\n` +
                'Используйте /groups для просмотра доступных групп.'
            );
        }

        const success = groupManager.removeTag(groupId, tag);

        if (success) {
            ctx.reply(`✅ Тег "${tag}" удален у группы "${group.title}".`);
            logger.info(`Admin ${userId} removed tag "${tag}" from group ${groupId}`);
        } else {
            ctx.reply(`❌ Не удалось удалить тег. Возможно, его нет у этой группы.`);
        }
    });

    // Команда /tag_list - показать все доступные теги
    bot.command('tag_list', (ctx) => {
        const userId = ctx.from.id;

        // Проверка прав администратора
        if (!isAdmin(userId)) {
            logger.warn(`User ${userId} tried to use /tag_list without admin rights`);
            return ctx.reply('❌ У вас нет прав для использования этой команды.');
        }

        const allTags = groupManager.getAllTags();

        if (allTags.length === 0) {
            return ctx.reply(
                '📋 Нет доступных тегов.\n\n' +
                'Добавьте теги группам командой /tag_add'
            );
        }

        // Подсчитываем количество групп для каждого тега
        const groups = groupManager.getGroups();
        const tagCounts = {};

        allTags.forEach(tag => {
            tagCounts[tag] = groups.filter(g =>
                g.tags && g.tags.includes(tag)
            ).length;
        });

        let message = `📋 Доступные теги (${allTags.length}):\n\n`;

        allTags.forEach((tag, index) => {
            message += `${index + 1}. #${tag} (${tagCounts[tag]} ${getGroupWord(tagCounts[tag])})\n`;
        });

        message += `\n💡 Используйте /announce_to <теги> <текст> для рассылки по тегам.`;

        logger.info(`Admin ${userId} viewed tags list`);
        ctx.reply(message);
    });
}

/**
 * Вспомогательная функция для склонения слова "группа"
 */
function getGroupWord(count) {
    if (count % 10 === 1 && count % 100 !== 11) {
        return 'группа';
    } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
        return 'группы';
    } else {
        return 'групп';
    }
}
