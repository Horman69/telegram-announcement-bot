import logger from '../services/logger.js';
import menuBuilder from '../services/menuBuilder.js';
import { isAdmin } from '../config/admins.js';
import { startAddAdminProcess } from './addadmin.js';
import { startRemoveAdminProcess } from './removeadmin.js';
import { Markup } from 'telegraf';

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

                case 'group_management':
                    // Проверяем права администратора
                    if (!userIsAdmin) {
                        await ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
                        return;
                    }

                    // Открываем меню управления группами
                    const groupMgmtMenuText = menuBuilder.getGroupManagementMenuText();
                    const groupMgmtMenuKeyboard = menuBuilder.getGroupManagementMenu();

                    await ctx.editMessageText(groupMgmtMenuText, groupMgmtMenuKeyboard);
                    await ctx.answerCbQuery('Управление группами');
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
                        `👤 Для всех пользователей:\n` +
                        `/start - Приветственное сообщение\n` +
                        `/help - Эта справка\n` +
                        `/myid - Узнать свой Telegram ID\n` +
                        `/menu - Открыть интерактивное меню\n\n` +
                        `👨‍💼 Для администраторов:\n\n` +
                        `📢 Рассылка:\n` +
                        `/announce <текст> - Рассылка во все группы\n` +
                        `/announce_to <теги> <текст> - Рассылка по тегам\n` +
                        `/announce_groups <id1,id2> <текст> - Рассылка по ID групп\n` +
                        `/announce_media - Рассылка с медиа-файлом\n` +
                        `/groups - Список зарегистрированных групп\n\n` +
                        `📋 Шаблоны:\n` +
                        `/template_save <название> - Сохранить шаблон\n` +
                        `/template_list - Список всех шаблонов\n` +
                        `/template_use <название> - Использовать шаблон\n` +
                        `/template_delete <название> - Удалить шаблон\n\n` +
                        `🏷️ Теги групп:\n` +
                        `/tag_add <group_id> <тег> - Добавить тег группе\n` +
                        `/tag_remove <group_id> <тег> - Удалить тег\n` +
                        `/tag_list - Список всех тегов\n\n` +
                        `👥 Управление администраторами:\n` +
                        `/addadmin - Добавить нового администратора\n` +
                        `/removeadmin - Удалить администратора\n\n` +
                        `💡 Как стать администратором:\n` +
                        `1. Узнайте свой ID командой /myid\n` +
                        `2. Попросите текущего админа добавить вас\n` +
                        `3. Или добавьте ID в файл src/config/admins.js`;

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

                case 'action:announce_media_tags':
                    // Рассылка с медиа по тегам
                    if (!userIsAdmin) {
                        await ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
                        return;
                    }

                    const announceMediaTagsText = `📎🏷️ Рассылка с медиа по тегам\n\n` +
                        `Отправить объявление с медиа только в группы с определенными тегами:\n\n` +
                        `1. Отправьте команду: /mediatags <теги>\n` +
                        `2. Отправьте медиа-файл\n` +
                        `3. Отправьте текст (подпись)\n` +
                        `4. Подтвердите отправку\n\n` +
                        `Пример:\n` +
                        `/mediatags важное,новости\n` +
                        `[прикрепить фото]\n` +
                        `Текст объявления`;

                    const announceMediaTagsKeyboard = menuBuilder.getAnnouncementMenu();
                    await ctx.editMessageText(announceMediaTagsText, announceMediaTagsKeyboard);
                    await ctx.answerCbQuery('Рассылка с медиа по тегам');
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

                // === ДЕЙСТВИЯ УПРАВЛЕНИЯ АДМИНИСТРАТОРАМИ ===

                case 'action:admin_add':
                    // Добавить администратора
                    if (!userIsAdmin) {
                        await ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
                        return;
                    }

                    // Запускаем процесс добавления администратора
                    const started = startAddAdminProcess(userId);

                    if (started) {
                        // Получаем текущий список администраторов
                        const { getAllAdmins } = await import('../config/admins.js');
                        const adminsList = getAllAdmins();

                        // Пытаемся получить информацию о каждом администраторе
                        let adminsInfo = '📋 Текущие администраторы:\n\n';
                        for (let i = 0; i < adminsList.length; i++) {
                            const adminId = adminsList[i];
                            try {
                                const chatMember = await ctx.telegram.getChat(adminId);
                                const name = chatMember.first_name || 'Неизвестно';
                                const username = chatMember.username ? `@${chatMember.username}` : '';
                                adminsInfo += `${i + 1}. ${name} ${username}\n   ID: ${adminId}\n`;
                            } catch (error) {
                                adminsInfo += `${i + 1}. ID: ${adminId}\n`;
                            }
                        }

                        // Создаем кнопку "Назад"
                        const backKeyboard = Markup.inlineKeyboard([
                            [Markup.button.callback('◀️ Назад', 'menu:admins')]
                        ]);

                        // Редактируем текущее сообщение с инструкцией
                        await ctx.editMessageText(
                            '👥 Добавление нового администратора\n\n' +
                            adminsInfo + '\n' +
                            '━━━━━━━━━━━━━━━━━━━━\n\n' +
                            'Отправьте Telegram ID пользователя, которого хотите добавить в администраторы.\n\n' +
                            '💡 Пользователь может узнать свой ID с помощью команды /myid\n\n' +
                            'Для отмены отправьте /cancel',
                            backKeyboard
                        );
                        await ctx.answerCbQuery('Запускаю процесс добавления...');

                        logger.info(`Admin ${userId} started admin addition process via menu button`);
                    } else {
                        await ctx.answerCbQuery('❌ Ошибка запуска процесса', { show_alert: true });
                    }
                    break;

                case 'action:admin_remove':
                    // Удалить администратора
                    if (!userIsAdmin) {
                        await ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
                        return;
                    }

                    // Запускаем процесс удаления администратора
                    const removeStarted = startRemoveAdminProcess(userId);

                    if (removeStarted) {
                        // Получаем текущий список администраторов
                        const { getAllAdmins: getAllAdminsForRemove } = await import('../config/admins.js');
                        const adminsListForRemove = getAllAdminsForRemove();

                        // Пытаемся получить информацию о каждом администраторе
                        let adminsInfoForRemove = '📋 Текущие администраторы:\n\n';
                        for (let i = 0; i < adminsListForRemove.length; i++) {
                            const adminId = adminsListForRemove[i];
                            try {
                                const chatMember = await ctx.telegram.getChat(adminId);
                                const name = chatMember.first_name || 'Неизвестно';
                                const username = chatMember.username ? `@${chatMember.username}` : '';
                                adminsInfoForRemove += `${i + 1}. ${name} ${username}\n   ID: ${adminId}\n`;
                            } catch (error) {
                                adminsInfoForRemove += `${i + 1}. ID: ${adminId}\n`;
                            }
                        }

                        // Создаем кнопку "Назад"
                        const backKeyboardRemove = Markup.inlineKeyboard([
                            [Markup.button.callback('◀️ Назад', 'menu:admins')]
                        ]);

                        // Редактируем текущее сообщение с инструкцией
                        await ctx.editMessageText(
                            '🗑️ Удаление администратора\n\n' +
                            adminsInfoForRemove + '\n' +
                            '━━━━━━━━━━━━━━━━━━━━\n\n' +
                            'Отправьте Telegram ID пользователя, которого хотите удалить из администраторов.\n\n' +
                            '⚠️ Вы не можете удалить самого себя\n' +
                            '⚠️ Нельзя удалить последнего администратора\n\n' +
                            'Для отмены отправьте /cancel',
                            backKeyboardRemove
                        );
                        await ctx.answerCbQuery('Запускаю процесс удаления...');

                        logger.info(`Admin ${userId} started admin removal process via menu button`);
                    } else {
                        await ctx.answerCbQuery('❌ Ошибка запуска процесса', { show_alert: true });
                    }
                    break;

                case 'action:admin_list':
                    // Список администраторов
                    if (!userIsAdmin) {
                        await ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
                        return;
                    }

                    // Импортируем функцию для получения списка админов
                    const { getAllAdmins } = await import('../config/admins.js');
                    const adminsList = getAllAdmins();

                    let adminListText = `📋 Список администраторов\n\n`;
                    adminListText += `Всего администраторов: ${adminsList.length}\n\n`;

                    adminsList.forEach((adminId, index) => {
                        adminListText += `${index + 1}. ID: ${adminId}\n`;
                    });

                    const adminListKeyboard = menuBuilder.getAdminManagementMenu();
                    await ctx.editMessageText(adminListText, adminListKeyboard);
                    await ctx.answerCbQuery('Список администраторов');
                    break;

                // === ДЕЙСТВИЯ УПРАВЛЕНИЯ ГРУППАМИ ===

                case 'action:group_list':
                    // Список групп
                    if (!userIsAdmin) {
                        await ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
                        return;
                    }

                    const groupManager = (await import('../services/groupManager.js')).default;
                    const groups = groupManager.getGroups();

                    if (groups.length === 0) {
                        const emptyGroupsKeyboard = menuBuilder.getGroupManagementMenu();
                        await ctx.editMessageText(
                            '📋 Список групп пуст.\n\n' +
                            'Добавьте бота в группу, и она автоматически появится в списке.\n' +
                            'Или добавьте группу вручную.',
                            emptyGroupsKeyboard
                        );
                        await ctx.answerCbQuery('Список групп пуст');
                        return;
                    }

                    let groupsListText = `📋 Зарегистрированные группы (${groups.length}):\n\n`;

                    groups.forEach((group, index) => {
                        const addedDate = new Date(group.addedAt).toLocaleDateString('ru-RU');

                        // Добавляем иконку форума, если установлена тема
                        const forumIcon = group.threadId ? ' 💬' : '';
                        groupsListText += `${index + 1}. ${group.title}${forumIcon}\n`;
                        groupsListText += `   ID: <code>${group.id}</code>\n`;

                        if (group.tags && group.tags.length > 0) {
                            const tagsStr = group.tags.map(tag => `#${tag}`).join(', ');
                            groupsListText += `   Теги: ${tagsStr}\n`;
                        }

                        // Показываем тему форума, если установлена
                        if (group.threadId) {
                            groupsListText += `   📍 Тема форума: ID ${group.threadId}\n`;
                        }

                        if (group.addedManually) {
                            groupsListText += `   📝 Добавлена вручную\n`;
                        }

                        groupsListText += `   Добавлена: ${addedDate}\n\n`;
                    });

                    // Создаем кнопки для каждой группы
                    const deleteButtons = [];
                    groups.forEach((group) => {
                        const groupButtons = [
                            Markup.button.callback(`🗑️ Удалить "${group.title}"`, `delete_group:${group.id}`)
                        ];

                        // Добавляем кнопку сброса темы, если тема установлена
                        if (group.threadId) {
                            groupButtons.push(
                                Markup.button.callback(`🔄 Сбросить тему`, `reset_topic:${group.id}`)
                            );
                        }

                        deleteButtons.push(groupButtons);
                    });
                    deleteButtons.push([Markup.button.callback('◀️ Назад', 'menu:group_management')]);

                    const groupsListKeyboard = Markup.inlineKeyboard(deleteButtons);

                    await ctx.editMessageText(groupsListText, { parse_mode: 'HTML', ...groupsListKeyboard });
                    await ctx.answerCbQuery('Список групп');
                    break;

                case 'action:groups':
                    // Список групп из меню рассылок
                    if (!userIsAdmin) {
                        await ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
                        return;
                    }

                    // Используем ту же логику, что и action:group_list
                    const groupsManager = (await import('../services/groupManager.js')).default;
                    const allGroups = groupsManager.getGroups();

                    if (allGroups.length === 0) {
                        const emptyKeyboard = menuBuilder.getAnnouncementMenu();
                        await ctx.editMessageText(
                            '📋 Список групп пуст.\n\n' +
                            'Добавьте бота в группу, и она автоматически появится в списке.\n' +
                            'Или добавьте группу вручную.',
                            emptyKeyboard
                        );
                        await ctx.answerCbQuery('Список групп пуст');
                        return;
                    }

                    let groupsMessage = `📋 Зарегистрированные группы (${allGroups.length}):\n\n`;
                    groupsMessage += `💡 <b>Подсказка:</b> Для отправки в конкретную тему форума:\n`;
                    groupsMessage += `   1. Откройте нужную тему в группе\n`;
                    groupsMessage += `   2. Отправьте: <code>/settopic ID_темы</code>\n`;
                    groupsMessage += `   3. Для сброса: <code>/settopic reset</code>\n\n`;
                    groupsMessage += `━━━━━━━━━━━━━━━━━━━━\n\n`;

                    allGroups.forEach((group, index) => {
                        const addedDate = new Date(group.addedAt).toLocaleDateString('ru-RU');

                        // Добавляем иконку форума, если установлена тема
                        const forumIcon = group.threadId ? ' 💬' : '';
                        groupsMessage += `${index + 1}. ${group.title}${forumIcon}\n`;
                        groupsMessage += `   ID: <code>${group.id}</code>\n`;

                        if (group.tags && group.tags.length > 0) {
                            const tagsStr = group.tags.map(tag => `#${tag}`).join(', ');
                            groupsMessage += `   Теги: ${tagsStr}\n`;
                        }

                        // Показываем тему форума, если установлена
                        if (group.threadId) {
                            groupsMessage += `   📍 Тема форума: ID ${group.threadId}\n`;
                        }

                        if (group.addedManually) {
                            groupsMessage += `   📝 Добавлена вручную\n`;
                        }

                        groupsMessage += `   Добавлена: ${addedDate}\n\n`;
                    });

                    // Создаем кнопки для каждой группы
                    const groupsButtons = [];
                    allGroups.forEach((group) => {
                        const groupButtons = [
                            Markup.button.callback(`🗑️ Удалить "${group.title}"`, `delete_group:${group.id}`)
                        ];

                        // Добавляем кнопку сброса темы, если тема установлена
                        if (group.threadId) {
                            groupButtons.push(
                                Markup.button.callback(`🔄 Сбросить тему`, `reset_topic:${group.id}`)
                            );
                        }

                        groupsButtons.push(groupButtons);
                    });

                    groupsButtons.push([Markup.button.callback('◀️ Назад', 'menu:announce')]);

                    const groupsKeyboard = Markup.inlineKeyboard(groupsButtons);

                    await ctx.editMessageText(groupsMessage, { parse_mode: 'HTML', ...groupsKeyboard });
                    await ctx.answerCbQuery('Список групп');
                    break;

                case 'action:group_add':
                    // Добавить группу
                    if (!userIsAdmin) {
                        await ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
                        return;
                    }

                    const { startAddGroupProcess } = await import('./addgroup.js');
                    const addGroupStarted = startAddGroupProcess(userId);

                    if (addGroupStarted) {
                        const addGroupKeyboard = Markup.inlineKeyboard([
                            [Markup.button.callback('◀️ Назад', 'menu:group_management')]
                        ]);

                        await ctx.editMessageText(
                            '➕ Добавление группы вручную\n\n' +
                            'Отправьте ID группы, которую хотите добавить в список рассылки.\n\n' +
                            '💡 Используйте команду /groupid в группе, чтобы узнать её ID\n\n' +
                            'Пример: <code>-1001234567890</code>\n\n' +
                            'Для отмены отправьте /cancel',
                            { parse_mode: 'HTML', ...addGroupKeyboard }
                        );
                        await ctx.answerCbQuery('Запускаю процесс добавления...');
                        logger.info(`Admin ${userId} started add group process via menu`);
                    } else {
                        await ctx.answerCbQuery('❌ Ошибка запуска процесса', { show_alert: true });
                    }
                    break;

                case 'action:group_remove':
                    // Удалить группу
                    if (!userIsAdmin) {
                        await ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
                        return;
                    }

                    const groupManagerForRemove = (await import('../services/groupManager.js')).default;
                    const groupsForRemove = groupManagerForRemove.getGroups();

                    if (groupsForRemove.length === 0) {
                        await ctx.answerCbQuery('❌ Нет групп для удаления', { show_alert: true });
                        return;
                    }

                    const { startRemoveGroupProcess } = await import('./removegroup.js');
                    const removeGroupStarted = startRemoveGroupProcess(userId);

                    if (removeGroupStarted) {
                        let removeMessage = '🗑️ Удаление группы из списка рассылки\n\n';
                        removeMessage += 'Отправьте ID группы, которую хотите удалить:\n\n';

                        groupsForRemove.forEach((group, index) => {
                            removeMessage += `${index + 1}. ${group.title}\n`;
                            removeMessage += `   ID: <code>${group.id}</code>\n\n`;
                        });

                        removeMessage += 'Для отмены отправьте /cancel';

                        const removeGroupKeyboard = Markup.inlineKeyboard([
                            [Markup.button.callback('◀️ Назад', 'menu:group_management')]
                        ]);

                        await ctx.editMessageText(removeMessage, { parse_mode: 'HTML', ...removeGroupKeyboard });
                        await ctx.answerCbQuery('Запускаю процесс удаления...');
                        logger.info(`Admin ${userId} started remove group process via menu`);
                    } else {
                        await ctx.answerCbQuery('❌ Ошибка запуска процесса', { show_alert: true });
                    }
                    break;

                case 'action:group_id':
                    // Инструкция по получению ID группы
                    if (!userIsAdmin) {
                        await ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
                        return;
                    }

                    const groupIdText = `🆔 Как узнать ID группы\n\n` +
                        `1. Откройте группу в Telegram\n` +
                        `2. Отправьте в группе команду: /groupid\n` +
                        `3. Бот ответит с ID группы\n\n` +
                        `💡 Команда работает только в групповых чатах\n\n` +
                        `Полученный ID можно использовать для:\n` +
                        `• Ручного добавления группы\n` +
                        `• Рассылки по конкретным группам\n` +
                        `• Управления тегами`;

                    // Показываем только кнопку "Назад" вместо полного меню
                    const groupIdKeyboard = Markup.inlineKeyboard([
                        [Markup.button.callback('◀️ Назад', 'menu:group_management')]
                    ]);

                    logger.info(`Showing group ID instruction to user ${userId}`);
                    await ctx.editMessageText(groupIdText, groupIdKeyboard);
                    await ctx.answerCbQuery('Инструкция по ID группы');
                    break;

                case 'forum_help':
                    // Информация о работе с форумами
                    if (!userIsAdmin) {
                        await ctx.answerCbQuery('❌ У вас нет прав администратора', { show_alert: true });
                        return;
                    }

                    const forumHelpText = `💬 Работа с форумами Telegram\n\n` +
                        `<b>Что это?</b>\n` +
                        `Если ваша группа - форум, вы можете отправлять рассылки в конкретные темы.\n\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `<b>📍 Как найти ID темы:</b>\n` +
                        `1. Откройте тему в Telegram Desktop/Web\n` +
                        `2. ID темы - это число в URL после последнего /\n` +
                        `   Пример URL: <code>t.me/c/1838199188/1</code>\n` +
                        `   ID темы = <code>1</code>\n\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `<b>🔧 Как установить тему:</b>\n` +
                        `1. Зайдите в группу-форум\n` +
                        `2. Отправьте: <code>/settopic 1</code>\n` +
                        `3. Бот подтвердит установку\n\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `<b>📤 Как отправить рассылку:</b>\n` +
                        `Используйте обычные команды:\n\n` +
                        `• <code>/announce Текст объявления</code>\n` +
                        `  Отправит во все группы (в тему, если установлена)\n\n` +
                        `• <code>/announce_to важное Текст</code>\n` +
                        `  Отправит в группы с тегом "важное"\n\n` +
                        `Бот автоматически отправит в установленную тему!\n\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `<b>🔄 Как сбросить тему:</b>\n` +
                        `Отправьте: <code>/settopic reset</code>\n` +
                        `Рассылка снова пойдет в General\n\n` +
                        `💡 Группы с темой отмечены иконкой 💬`;

                    const forumHelpKeyboard = menuBuilder.getAnnouncementMenu();
                    await ctx.editMessageText(forumHelpText, { parse_mode: 'HTML', ...forumHelpKeyboard });
                    await ctx.answerCbQuery('О форумах');
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
