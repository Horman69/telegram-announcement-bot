import logger from '../services/logger.js';
import menuBuilder from '../services/menuBuilder.js';
import { isAdmin } from '../config/admins.js';

/**
 * Настройка команды /menu и обработчиков inline-кнопок
 * @param {Object} bot - Экземпляр бота Telegraf
 */
export function setupMenuCommand(bot) {
    // Команда /menu - открывает главное меню
    bot.command('menu', async (ctx) => {
        try {
            const userId = ctx.from?.id;
            const userName = ctx.from?.first_name || 'друг';

            // Проверка на наличие ID пользователя
            if (!userId) {
                logger.warn('Menu command: User ID not found');
                return ctx.reply('❌ Ошибка: не удалось определить пользователя');
            }

            const userIsAdmin = isAdmin(userId);
            const menuText = menuBuilder.getMainMenuText(userName, userIsAdmin);
            const menuKeyboard = menuBuilder.getMainMenu(userIsAdmin);

            await ctx.reply(menuText, menuKeyboard);
            logger.info(`User ${userId} opened main menu`);
        } catch (error) {
            logger.error('Error in menu command:', error);
            ctx.reply('❌ Произошла ошибка при открытии меню. Попробуйте позже.');
        }
    });

    // Обработчик нажатий на кнопки меню
    bot.action(/^menu:(.+)$/, async (ctx) => {
        try {
            const userId = ctx.from?.id;
            const userName = ctx.from?.first_name || 'друг';
            const action = ctx.match[1]; // Получаем действие из callback_data

            // Проверка на наличие ID пользователя
            if (!userId) {
                logger.warn('Menu action: User ID not found');
                return ctx.answerCbQuery('❌ Ошибка: не удалось определить пользователя');
            }

            const userIsAdmin = isAdmin(userId);

            logger.info(`User ${userId} clicked menu button: ${action}`);

            // Обрабатываем различные действия
            switch (action) {
                case 'main':
                    // Возврат в главное меню
                    const mainMenuText = menuBuilder.getMainMenuText(userName, userIsAdmin);
                    const mainMenuKeyboard = menuBuilder.getMainMenu(userIsAdmin);

                    await ctx.editMessageText(mainMenuText, mainMenuKeyboard);
                    await ctx.answerCbQuery('Главное меню');
                    break;

                case 'user':
                    // Открываем меню для всех пользователей
                    const userMenuText = menuBuilder.getUserMenuText();
                    const userMenuKeyboard = menuBuilder.getUserMenu();

                    await ctx.editMessageText(userMenuText, userMenuKeyboard);
                    await ctx.answerCbQuery('Раздел для всех');
                    break;


                case 'admin':
                    // Проверяем права администратора
                    if (!userIsAdmin) {
                        await ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
                        logger.warn(`User ${userId} tried to access admin menu without permissions`);
                        return;
                    }

                    // Открываем меню администратора
                    const adminMenuText = menuBuilder.getAdminMenuText();
                    const adminMenuKeyboard = menuBuilder.getAdminMenu();

                    await ctx.editMessageText(adminMenuText, adminMenuKeyboard);
                    await ctx.answerCbQuery('Раздел администратора');
                    break;

                case 'announce':
                    // Проверяем права администратора
                    if (!userIsAdmin) {
                        await ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
                        return;
                    }

                    // Открываем меню рассылки
                    const announceMenuText = menuBuilder.getAnnouncementMenuText();
                    const announceMenuKeyboard = menuBuilder.getAnnouncementMenu();

                    await ctx.editMessageText(announceMenuText, announceMenuKeyboard);
                    await ctx.answerCbQuery('Рассылка');
                    break;

                case 'templates':
                    // Проверяем права администратора
                    if (!userIsAdmin) {
                        await ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
                        return;
                    }

                    // Открываем меню шаблонов
                    const templatesMenuText = menuBuilder.getTemplateMenuText();
                    const templatesMenuKeyboard = menuBuilder.getTemplateMenu();

                    await ctx.editMessageText(templatesMenuText, templatesMenuKeyboard);
                    await ctx.answerCbQuery('Шаблоны');
                    break;

                case 'tags':
                    // Проверяем права администратора
                    if (!userIsAdmin) {
                        await ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
                        return;
                    }

                    // Открываем меню тегов
                    const tagsMenuText = menuBuilder.getTagMenuText();
                    const tagsMenuKeyboard = menuBuilder.getTagMenu();

                    await ctx.editMessageText(tagsMenuText, tagsMenuKeyboard);
                    await ctx.answerCbQuery('Теги');
                    break;

                case 'admins':
                    // Проверяем права администратора
                    if (!userIsAdmin) {
                        await ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
                        return;
                    }

                    // Открываем меню управления администраторами
                    const adminsMenuText = menuBuilder.getAdminManagementMenuText();
                    const adminsMenuKeyboard = menuBuilder.getAdminManagementMenu();

                    await ctx.editMessageText(adminsMenuText, adminsMenuKeyboard);
                    await ctx.answerCbQuery('Администраторы');
                    break;


                case 'action:start':
                    // Действие: О боте - редактируем сообщение меню
                    const startText = `ℹ️ О боте\n\n` +
                        `Привет, ${userName}! 👋\n\n` +
                        `Я бот для рассылки объявлений в группы.\n\n` +
                        `Доступные команды:\n` +
                        `/start - Начать работу с ботом\n` +
                        `/help - Показать справку\n` +
                        `/myid - Узнать свой Telegram ID\n` +
                        `/menu - Открыть меню\n\n` +
                        `Команды для администраторов:\n` +
                        `/announce <текст> - Создать объявление\n` +
                        `/groups - Список групп для рассылки`;

                    // Добавляем кнопку "Назад" к информации
                    const startKeyboard = menuBuilder.getUserMenu();
                    await ctx.editMessageText(startText, startKeyboard);
                    await ctx.answerCbQuery('О боте');
                    break;

                case 'action:help':
                    // Действие: Справка - редактируем сообщение меню
                    const helpText = `📚 Справка по боту\n\n` +
                        `Для всех пользователей:\n` +
                        `/start - Приветственное сообщение\n` +
                        `/help - Эта справка\n` +
                        `/myid - Узнать свой Telegram ID\n` +
                        `/menu - Открыть меню\n\n` +
                        `Для администраторов:\n\n` +
                        `Рассылка:\n` +
                        `/announce <текст> - Рассылка во все группы\n` +
                        `/announce_to <теги> <текст> - Рассылка по тегам\n` +
                        `/announce_groups <id1,id2> <текст> - Рассылка по ID\n` +
                        `/announce_media - Рассылка с медиа-файлом\n` +
                        `/groups - Посмотреть список групп\n\n` +
                        `Шаблоны:\n` +
                        `/template_save <название> - Сохранить шаблон\n` +
                        `/template_list - Список шаблонов\n` +
                        `/template_use <название> - Использовать шаблон\n` +
                        `/template_delete <название> - Удалить шаблон\n\n` +
                        `Теги групп:\n` +
                        `/tag_add <group_id> <тег> - Добавить тег\n` +
                        `/tag_remove <group_id> <тег> - Удалить тег\n` +
                        `/tag_list - Список всех тегов\n\n` +
                        `Как стать администратором:\n` +
                        `1. Используйте команду /myid\n` +
                        `2. Добавьте полученный ID в файл src/config/admins.js\n` +
                        `3. Перезапустите бота`;

                    // Добавляем кнопку "Назад" к справке
                    const helpKeyboard = menuBuilder.getUserMenu();
                    await ctx.editMessageText(helpText, helpKeyboard);
                    await ctx.answerCbQuery('Справка');
                    break;

                case 'action:myid':
                    // Действие: Мой ID - редактируем сообщение меню
                    const myidText = `🆔 Ваш Telegram ID\n\n` +
                        `ID: ${userId}\n\n` +
                        `Этот ID нужен для получения прав администратора.\n` +
                        `Отправьте его владельцу бота.`;

                    // Добавляем кнопку "Назад"
                    const myidKeyboard = menuBuilder.getUserMenu();
                    await ctx.editMessageText(myidText, myidKeyboard);
                    await ctx.answerCbQuery('Ваш ID');
                    break;

                // === ДЕЙСТВИЯ АДМИНИСТРАТОРОВ ===

                case 'action:add_admin':
                    // Добавить администратора
                    if (!userIsAdmin) {
                        await ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
                        return;
                    }

                    // Импортируем conversationState
                    const conversationState = (await import('../services/conversationState.js')).default;
                    
                    // Устанавливаем состояние диалога для запуска процесса добавления админа
                    conversationState.setState(userId, { action: 'waiting_new_admin_id' });

                    const addAdminText = `👥 Добавить администратора\n\n` +
                        `Отправьте Telegram ID пользователя, которого хотите сделать администратором.\n\n` +
                        `Пример: \`123456789\`\n\n` +
                        `❌ /cancel - отменить`;

                    const addAdminKeyboard = menuBuilder.getAdminManagementMenu();
                    await ctx.editMessageText(addAdminText, addAdminKeyboard);
                    await ctx.answerCbQuery('Добавить администратора');
                    break;

                case 'action:list_admins':
                    // Список администраторов
                    if (!userIsAdmin) {
                        await ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
                        return;
                    }

                    // Импортируем ADMIN_IDS для отображения списка
                    const { ADMIN_IDS } = await import('../config/admins.js');
                    let listAdminsText = `👥 Список администраторов\n\n`;
                    listAdminsText += `Всего администраторов: ${ADMIN_IDS.length}\n\n`;
                    listAdminsText += `ID администраторов:\n`;
                    ADMIN_IDS.forEach((id, index) => {
                        listAdminsText += `${index + 1}. ${id}\n`;
                    });

                    const listAdminsKeyboard = menuBuilder.getAdminManagementMenu();
                    await ctx.editMessageText(listAdminsText, listAdminsKeyboard);
                    await ctx.answerCbQuery('Список администраторов');
                    break;

                // === ДЕЙСТВИЯ РАССЫЛКИ ===

                case 'action:announce_all':
                    // Рассылка во все группы
                    if (!userIsAdmin) {
                        await ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
                        return;
                    }

                    const announceAllText = `📣 Рассылка во все группы\n\n` +
                        `Чтобы создать рассылку во все зарегистрированные группы, используйте команду:\n\n` +
                        `/announce <текст объявления>\n\n` +
                        `Пример:\n` +
                        `/announce Важное объявление для всех!`;

                    const announceAllKeyboard = menuBuilder.getAnnouncementMenu();
                    await ctx.editMessageText(announceAllText, announceAllKeyboard);
                    await ctx.answerCbQuery('Рассылка во все группы');
                    break;

                case 'action:announce_tags':
                    // Рассылка по тегам
                    if (!userIsAdmin) {
                        await ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
                        return;
                    }

                    const announceTagsText = `🏷️ Рассылка по тегам\n\n` +
                        `Отправить объявление только в группы с определенными тегами:\n\n` +
                        `/announce_to <теги> <текст>\n\n` +
                        `Пример:\n` +
                        `/announce_to новости,важное Срочная новость!`;

                    const announceTagsKeyboard = menuBuilder.getAnnouncementMenu();
                    await ctx.editMessageText(announceTagsText, announceTagsKeyboard);
                    await ctx.answerCbQuery('Рассылка по тегам');
                    break;

                case 'action:announce_ids':
                    // Рассылка по ID групп
                    if (!userIsAdmin) {
                        await ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
                        return;
                    }

                    const announceIdsText = `🎯 Рассылка по ID групп\n\n` +
                        `Отправить объявление в конкретные группы по их ID:\n\n` +
                        `/announce_groups <id1,id2> <текст>\n\n` +
                        `Пример:\n` +
                        `/announce_groups -1001601437600 Сообщение для группы`;

                    const announceIdsKeyboard = menuBuilder.getAnnouncementMenu();
                    await ctx.editMessageText(announceIdsText, announceIdsKeyboard);
                    await ctx.answerCbQuery('Рассылка по ID');
                    break;

                case 'action:announce_media':
                    // Рассылка с медиа
                    if (!userIsAdmin) {
                        await ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
                        return;
                    }

                    const announceMediaText = `📎 Рассылка с медиа-файлом\n\n` +
                        `Отправить объявление с фото, видео, документом или аудио:\n\n` +
                        `1. Отправьте команду: /announce_media\n` +
                        `2. Отправьте медиа-файл\n` +
                        `3. Отправьте текст (подпись)\n` +
                        `4. Подтвердите отправку`;

                    const announceMediaKeyboard = menuBuilder.getAnnouncementMenu();
                    await ctx.editMessageText(announceMediaText, announceMediaKeyboard);
                    await ctx.answerCbQuery('Рассылка с медиа');
                    break;

                case 'action:groups':
                    // Список групп
                    if (!userIsAdmin) {
                        await ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
                        return;
                    }

                    const groupsText = `📊 Список групп\n\n` +
                        `Чтобы посмотреть все зарегистрированные группы, используйте:\n\n` +
                        `/groups\n\n` +
                        `Вы увидите:\n` +
                        `• Название группы\n` +
                        `• ID группы\n` +
                        `• Теги группы\n` +
                        `• Дату добавления`;

                    const groupsKeyboard = menuBuilder.getAnnouncementMenu();
                    await ctx.editMessageText(groupsText, groupsKeyboard);
                    await ctx.answerCbQuery('Список групп');
                    break;

                // === ДЕЙСТВИЯ ШАБЛОНОВ ===

                case 'action:template_save':
                    // Сохранить шаблон
                    if (!userIsAdmin) {
                        await ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
                        return;
                    }

                    const templateSaveText = `💾 Сохранить шаблон\n\n` +
                        `Сохранить часто используемый текст как шаблон:\n\n` +
                        `1. Отправьте: /template_save <название>\n` +
                        `2. Отправьте текст шаблона\n\n` +
                        `Пример:\n` +
                        `/template_save приветствие\n` +
                        `Добро пожаловать в нашу группу! 👋`;

                    const templateSaveKeyboard = menuBuilder.getTemplateMenu();
                    await ctx.editMessageText(templateSaveText, templateSaveKeyboard);
                    await ctx.answerCbQuery('Сохранить шаблон');
                    break;

                case 'action:template_list':
                    // Список шаблонов
                    if (!userIsAdmin) {
                        await ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
                        return;
                    }

                    const templateListText = `📜 Список шаблонов\n\n` +
                        `Посмотреть все сохраненные шаблоны:\n\n` +
                        `/template_list\n\n` +
                        `Вы увидите список всех шаблонов с кнопками для просмотра и использования.`;

                    const templateListKeyboard = menuBuilder.getTemplateMenu();
                    await ctx.editMessageText(templateListText, templateListKeyboard);
                    await ctx.answerCbQuery('Список шаблонов');
                    break;

                case 'action:template_use':
                    // Использовать шаблон
                    if (!userIsAdmin) {
                        await ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
                        return;
                    }

                    const templateUseText = `✅ Использовать шаблон\n\n` +
                        `Отправить сохраненный шаблон во все группы:\n\n` +
                        `/template_use <название>\n\n` +
                        `Пример:\n` +
                        `/template_use приветствие`;

                    const templateUseKeyboard = menuBuilder.getTemplateMenu();
                    await ctx.editMessageText(templateUseText, templateUseKeyboard);
                    await ctx.answerCbQuery('Использовать шаблон');
                    break;

                case 'action:template_delete':
                    // Удалить шаблон
                    if (!userIsAdmin) {
                        await ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
                        return;
                    }

                    const templateDeleteText = `🗑️ Удалить шаблон\n\n` +
                        `Удалить сохраненный шаблон:\n\n` +
                        `/template_delete <название>\n\n` +
                        `Пример:\n` +
                        `/template_delete приветствие\n\n` +
                        `⚠️ Удаление нельзя отменить!`;

                    const templateDeleteKeyboard = menuBuilder.getTemplateMenu();
                    await ctx.editMessageText(templateDeleteText, templateDeleteKeyboard);
                    await ctx.answerCbQuery('Удалить шаблон');
                    break;

                // === ДЕЙСТВИЯ ТЕГОВ ===

                case 'action:tag_add':
                    // Добавить тег
                    if (!userIsAdmin) {
                        await ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
                        return;
                    }

                    const tagAddText = `➕ Добавить тег группе\n\n` +
                        `Добавить тег для категоризации группы:\n\n` +
                        `/tag_add <group_id> <тег>\n\n` +
                        `Пример:\n` +
                        `/tag_add -1001601437600 новости\n\n` +
                        `💡 Используйте /groups чтобы узнать ID группы`;

                    const tagAddKeyboard = menuBuilder.getTagMenu();
                    await ctx.editMessageText(tagAddText, tagAddKeyboard);
                    await ctx.answerCbQuery('Добавить тег');
                    break;

                case 'action:tag_remove':
                    // Удалить тег
                    if (!userIsAdmin) {
                        await ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
                        return;
                    }

                    const tagRemoveText = `➖ Удалить тег у группы\n\n` +
                        `Удалить тег у группы:\n\n` +
                        `/tag_remove <group_id> <тег>\n\n` +
                        `Пример:\n` +
                        `/tag_remove -1001601437600 новости`;

                    const tagRemoveKeyboard = menuBuilder.getTagMenu();
                    await ctx.editMessageText(tagRemoveText, tagRemoveKeyboard);
                    await ctx.answerCbQuery('Удалить тег');
                    break;

                case 'action:tag_list':
                    // Список тегов
                    if (!userIsAdmin) {
                        await ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
                        return;
                    }

                    const tagListText = `📋 Список всех тегов\n\n` +
                        `Посмотреть все доступные теги:\n\n` +
                        `/tag_list\n\n` +
                        `Вы увидите:\n` +
                        `• Все теги\n` +
                        `• Количество групп для каждого тега`;

                    const tagListKeyboard = menuBuilder.getTagMenu();
                    await ctx.editMessageText(tagListText, tagListKeyboard);
                    await ctx.answerCbQuery('Список тегов');
                    break;


                default:
                    logger.warn(`Unknown menu action: ${action}`);
                    await ctx.answerCbQuery('❌ Неизвестное действие');
            }
        } catch (error) {
            // Игнорируем ошибку "message is not modified" - это нормально когда пользователь нажимает ту же кнопку дважды
            if (error.response && error.response.description &&
                error.response.description.includes('message is not modified')) {
                logger.info(`User ${ctx.from?.id} clicked same button again - ignored`);
                try {
                    await ctx.answerCbQuery();
                } catch (cbError) {
                    // Игнорируем
                }
                return;
            }

            // Игнорируем ошибку "query is too old" - это нормально при медленном интернете
            if (error.response && error.response.description &&
                error.response.description.includes('query is too old')) {
                logger.info(`Callback query timeout for user ${ctx.from?.id} - ignored`);
                return;
            }

            logger.error('Error handling menu action:', error);

            // Пытаемся ответить на callback query, чтобы убрать "часики"
            try {
                await ctx.answerCbQuery('❌ Произошла ошибка');
            } catch (cbError) {
                // Игнорируем ошибки при ответе на callback query (например, timeout)
                if (cbError.response && cbError.response.description &&
                    cbError.response.description.includes('query is too old')) {
                    // Это нормально, игнорируем
                } else {
                    logger.error('Error answering callback query:', cbError);
                }
            }
        }
    });

    logger.success('Menu command registered');
}
