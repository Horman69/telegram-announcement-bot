import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import logger from './services/logger.js';
import groupManager from './services/groupManager.js';
import { setupMyIdCommand } from './commands/myid.js';
import { setupGroupsCommand } from './commands/groups.js';
import { setupAnnounceCommand } from './commands/announce.js';
import { setupTemplateCommands } from './commands/template.js';
import { setupTagCommands } from './commands/tags.js';
import { setupSelectiveAnnounceCommands } from './commands/announceSelective.js';
import { setupAnnounceMediaCommand } from './commands/announceMedia.js';
import { setupMediaTagsCommand } from './commands/mediaTags.js';
import { setupMenuCommand } from './commands/menu.js';
import { setupAddAdminCommand } from './commands/addadmin.js';
import { setupRemoveAdminCommand } from './commands/removeadmin.js';
import { setupGroupIdCommand } from './commands/groupid.js';
import { setupAddGroupCommand } from './commands/addgroup.js';
import { setupRemoveGroupCommand } from './commands/removegroup.js';
import { setupSetTopicCommand } from './commands/settopic.js';
import { setupRegisterCommand } from './commands/register.js';
import { setupApproveUserCommands } from './commands/approveUser.js';
import { setupAnnounceUsersCommands } from './commands/announceUsers.js';
import { setupUsersCommand } from './commands/users.js';
import menuBuilder from './services/menuBuilder.js';
import { isAdmin } from './config/admins.js';
import chatTypeCheck from './middleware/chatTypeCheck.js';
import adminCheck from './middleware/adminCheck.js';

// Загружаем переменные окружения
dotenv.config();

// Проверяем наличие токена
if (!process.env.TELEGRAM_BOT_TOKEN) {
    logger.error('TELEGRAM_BOT_TOKEN is not defined in .env file');
    process.exit(1);
}

// Создаем экземпляр бота с увеличенным таймаутом
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN, {
    telegram: {
        apiRoot: 'https://api.telegram.org',
        agent: null,
        webhookReply: false,
        // Увеличиваем таймаут для медленных соединений
        timeout: 60000 // 60 секунд
    }
});

/**
 * Инициализация middleware
 */
function initializeMiddleware() {
    // Применяем проверку типа чата (блокируем команды в группах)
    bot.use(chatTypeCheck);

    // Применяем проверку прав администратора
    bot.use(adminCheck);

    logger.success('Middleware initialized');
}

/**
 * Инициализация команд
 */
function initializeCommands() {
    // Команда /start - показываем меню с кнопками
    bot.start((ctx) => {
        try {
            const userId = ctx.from?.id;
            const userName = ctx.from?.first_name || 'друг';

            if (!userId) {
                logger.warn('Start command: User ID not found');
                return ctx.reply('❌ Ошибка: не удалось определить пользователя');
            }

            logger.info(`User ${userId} started the bot`);

            const userIsAdmin = isAdmin(userId);
            const menuText = menuBuilder.getMainMenuText(userName, userIsAdmin);
            const menuKeyboard = menuBuilder.getMainMenu(userIsAdmin);

            ctx.reply(menuText, menuKeyboard);
        } catch (error) {
            logger.error('Error in start command:', error);
            ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
        }
    });

    // Команда /help
    bot.help((ctx) => {
        logger.info(`User ${ctx.from.id} requested help`);

        ctx.reply(
            `📚 Справка по боту:\n\n` +
            `<b>Для всех пользователей:</b>\n` +
            `/start - Приветственное сообщение\n` +
            `/help - Эта справка\n` +
            `/myid - Узнать свой Telegram ID\n\n` +
            `<b>Для администраторов:</b>\n\n` +
            `<b>Рассылка:</b>\n` +
            `/announce &lt;текст&gt; - Рассылка во все группы\n` +
            `/announce_to &lt;теги&gt; &lt;текст&gt; - Рассылка по тегам\n` +
            `/announce_groups &lt;id1,id2&gt; &lt;текст&gt; - Рассылка по ID\n` +
            `/announce_media - Рассылка с медиа-файлом\n` +
            `/groups - Посмотреть список групп\n\n` +
            `<b>Шаблоны:</b>\n` +
            `/template_save &lt;название&gt; - Сохранить шаблон\n` +
            `/template_list - Список шаблонов\n` +
            `/template_use &lt;название&gt; - Использовать шаблон\n` +
            `/template_delete &lt;название&gt; - Удалить шаблон\n\n` +
            `<b>Теги групп:</b>\n` +
            `/tag_add &lt;group_id&gt; &lt;тег&gt; - Добавить тег\n` +
            `/tag_remove &lt;group_id&gt; &lt;тег&gt; - Удалить тег\n` +
            `/tag_list - Список всех тегов\n\n` +
            `<b>Как стать администратором:</b>\n` +
            `1. Используйте команду /myid\n` +
            `2. Добавьте полученный ID в файл src/config/admins.js\n` +
            `3. Перезапустите бота`,
            { parse_mode: 'HTML' }
        );
    });

    // Регистрируем команды
    setupMediaTagsCommand(bot);  // FIRST! Before any text handlers
    setupMenuCommand(bot);
    setupMyIdCommand(bot);
    setupAddAdminCommand(bot);
    setupRemoveAdminCommand(bot);
    setupGroupIdCommand(bot);
    setupAddGroupCommand(bot);
    setupSetTopicCommand(bot);  // Set topic for forum groups
    setupRegisterCommand(bot);  // User registration
    setupApproveUserCommands(bot);  // Approve/reject users
    setupAnnounceUsersCommands(bot);  // Broadcast to users
    setupUsersCommand(bot);  // Manage users
    setupGroupsCommand(bot);
    setupAnnounceCommand(bot);
    setupTemplateCommands(bot);
    setupTagCommands(bot);
    setupSelectiveAnnounceCommands(bot);
    setupAnnounceMediaCommand(bot);
    setupRemoveGroupCommand(bot);  // Moved after media commands to prevent text handler interception

    logger.success('All commands registered');
}

/**
 * Обработчики событий группы
 */
function initializeGroupHandlers() {
    // Когда бота добавляют в группу
    bot.on('my_chat_member', (ctx) => {
        const { chat, new_chat_member } = ctx.update.my_chat_member;

        // Проверяем, что это именно наш бот
        if (new_chat_member.user.id !== ctx.botInfo.id) {
            return;
        }

        // Проверяем статус: member, administrator, left, kicked
        const newStatus = new_chat_member.status;
        const oldStatus = ctx.update.my_chat_member.old_chat_member.status;

        // Бота добавили в группу
        if ((newStatus === 'member' || newStatus === 'administrator') &&
            (oldStatus === 'left' || oldStatus === 'kicked')) {

            const chatId = chat.id;
            const chatTitle = chat.title || 'Без названия';

            groupManager.addGroup(chatId, chatTitle);
            logger.success(`Bot added to group: ${chatTitle} (${chatId})`);

            // Группа автоматически добавлена, приветственное сообщение не отправляется
        }

        // Бота удалили из группы
        if ((newStatus === 'left' || newStatus === 'kicked') &&
            (oldStatus === 'member' || oldStatus === 'administrator')) {

            const chatId = chat.id;
            const chatTitle = chat.title || 'Без названия';

            groupManager.removeGroup(chatId);
            logger.info(`Bot removed from group: ${chatTitle} (${chatId})`);
        }
    });
}

/**
 * Глобальная обработка ошибок
 */
function initializeErrorHandling() {
    bot.catch((err, ctx) => {
        logger.error(`Error for ${ctx.updateType}:`, err);

        // Пытаемся отправить сообщение об ошибке пользователю
        try {
            ctx.reply('❌ Произошла ошибка при обработке вашего запроса. Попробуйте позже.');
        } catch (replyError) {
            logger.error('Failed to send error message to user:', replyError);
        }
    });
}

/**
 * Запуск бота
 */
async function startBot() {
    try {
        logger.info('Initializing bot...');

        // Инициализируем все компоненты
        initializeMiddleware();
        initializeCommands();
        initializeGroupHandlers();
        // Removed initializeTextIgnore() - it was blocking all commands
        initializeErrorHandling();

        // Запускаем бота
        await bot.launch();

        logger.success('Bot started successfully!');
        logger.info(`Registered groups: ${groupManager.getGroupCount()}`);
        logger.info('Press Ctrl+C to stop');

    } catch (error) {
        logger.error('Failed to start bot:', error);
        process.exit(1);
    }
}

/**
 * Graceful shutdown
 */
process.once('SIGINT', () => {
    logger.info('Stopping bot (SIGINT)...');
    bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
    logger.info('Stopping bot (SIGTERM)...');
    bot.stop('SIGTERM');
});

// Запускаем бота
startBot();
