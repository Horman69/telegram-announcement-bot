import { Markup } from 'telegraf';
import logger from './logger.js';

/**
 * Menu Builder Service
 * Сервис для создания inline-клавиатур с кнопками меню
 */
class MenuBuilder {
    /**
     * Создает главное меню
     * @param {boolean} isAdmin - Является ли пользователь администратором
     * @returns {Object} Inline клавиатура
     */
    getMainMenu(isAdmin) {
        try {
            const buttons = [
                [Markup.button.callback('👤 Для всех', 'menu:user')]
            ];

            // Добавляем кнопку администратора только для админов
            if (isAdmin) {
                buttons.push([Markup.button.callback('👨‍💼 Администратор', 'menu:admin')]);
            }

            logger.info(`Main menu created for ${isAdmin ? 'admin' : 'user'}`);
            return Markup.inlineKeyboard(buttons);
        } catch (error) {
            logger.error('Error creating main menu:', error);
            // Возвращаем пустую клавиатуру в случае ошибки
            return Markup.inlineKeyboard([]);
        }
    }

    /**
     * Создает меню для всех пользователей
     * @returns {Object} Inline клавиатура
     */
    getUserMenu() {
        try {
            const buttons = [
                [Markup.button.callback('ℹ️ О боте', 'menu:action:start')],
                [Markup.button.callback('📖 Справка', 'menu:action:help')],
                [Markup.button.callback('🆔 Мой ID', 'menu:action:myid')],
                [Markup.button.callback('◀️ Назад', 'menu:main')]
            ];

            logger.info('User menu created');
            return Markup.inlineKeyboard(buttons);
        } catch (error) {
            logger.error('Error creating user menu:', error);
            return Markup.inlineKeyboard([]);
        }
    }

    /**
     * Создает текст для главного меню
     * @param {string} userName - Имя пользователя
     * @param {boolean} isAdmin - Является ли пользователь администратором
     * @returns {string} Текст сообщения
     */
    getMainMenuText(userName, isAdmin) {
        let text = `Привет, ${userName}! 👋\n\n`;
        text += `Я бот для рассылки объявлений в Telegram-группы.\n\n`;
        text += `📌 Выберите раздел:`;

        if (isAdmin) {
            text += `\n\n✅ У вас есть права администратора`;
        }

        return text;
    }

    /**
     * Создает текст для меню пользователя
     * @returns {string} Текст сообщения
     */
    getUserMenuText() {
        return `👤 Раздел для всех пользователей\n\n📌 Выберите действие:`;
    }

    /**
     * Создает меню администратора с категориями
     * @returns {Object} Inline клавиатура
     */
    getAdminMenu() {
        try {
            const buttons = [
                [Markup.button.callback('📢 Рассылка', 'menu:announce')],
                [Markup.button.callback('📋 Шаблоны', 'menu:templates')],
                [Markup.button.callback('🏷️ Теги', 'menu:tags')],
                [Markup.button.callback('📊 Управление группами', 'menu:group_management')],
                [Markup.button.callback('👥 Администраторы', 'menu:admins')],
                [Markup.button.callback('◀️ Назад', 'menu:main')]
            ];

            logger.info('Admin menu created');
            return Markup.inlineKeyboard(buttons);
        } catch (error) {
            logger.error('Error creating admin menu:', error);
            return Markup.inlineKeyboard([]);
        }
    }

    /**
     * Создает текст для меню администратора
     * @returns {string} Текст сообщения
     */
    getAdminMenuText() {
        return `👨‍💼 Раздел администратора

📌 Выберите категорию:`;
    }

    /**
     * Создает меню рассылки
     * @returns {Object} Inline клавиатура
     */
    getAnnouncementMenu() {
        try {
            const buttons = [
                [Markup.button.callback('📣 Во все группы', 'menu:action:announce_all')],
                [Markup.button.callback('🏷️ По тегам', 'menu:action:announce_tags')],
                [Markup.button.callback('🎯 По ID групп', 'menu:action:announce_ids')],
                [Markup.button.callback('📎 С медиа (все)', 'menu:action:announce_media')],
                [Markup.button.callback('📎🏷️ С медиа по тегам', 'menu:action:announce_media_tags')],
                [Markup.button.callback('📊 Список групп', 'menu:action:groups')],
                [Markup.button.callback('ℹ️ О форумах', 'menu:action:forum_help_v2')],
                [Markup.button.callback('◀️ Назад', 'menu:admin')]
            ];

            logger.info('Announcement menu created');
            return Markup.inlineKeyboard(buttons);
        } catch (error) {
            logger.error('Error creating announcement menu:', error);
            return Markup.inlineKeyboard([]);
        }
    }

    /**
     * Создает текст для меню рассылки
     * @returns {string} Текст сообщения
     */
    getAnnouncementMenuText() {
        return `📢 Рассылка объявлений

📌 Выберите тип рассылки:`;
    }

    /**
     * Создает меню шаблонов
     * @returns {Object} Inline клавиатура
     */
    getTemplateMenu() {
        try {
            const buttons = [
                [Markup.button.callback('💾 Сохранить шаблон', 'menu:action:template_save')],
                [Markup.button.callback('📜 Список шаблонов', 'menu:action:template_list')],
                [Markup.button.callback('✅ Использовать шаблон', 'menu:action:template_use')],
                [Markup.button.callback('🗑️ Удалить шаблон', 'menu:action:template_delete')],
                [Markup.button.callback('◀️ Назад', 'menu:admin')]
            ];

            logger.info('Template menu created');
            return Markup.inlineKeyboard(buttons);
        } catch (error) {
            logger.error('Error creating template menu:', error);
            return Markup.inlineKeyboard([]);
        }
    }

    /**
     * Создает текст для меню шаблонов
     * @returns {string} Текст сообщения
     */
    getTemplateMenuText() {
        return `📋 Управление шаблонами

📌 Выберите действие:`;
    }

    /**
     * Создает меню тегов
     * @returns {Object} Inline клавиатура
     */
    getTagMenu() {
        try {
            const buttons = [
                [Markup.button.callback('➕ Добавить тег', 'menu:action:tag_add')],
                [Markup.button.callback('➖ Удалить тег', 'menu:action:tag_remove')],
                [Markup.button.callback('📋 Список тегов', 'menu:action:tag_list')],
                [Markup.button.callback('◀️ Назад', 'menu:admin')]
            ];

            logger.info('Tag menu created');
            return Markup.inlineKeyboard(buttons);
        } catch (error) {
            logger.error('Error creating tag menu:', error);
            return Markup.inlineKeyboard([]);
        }
    }

    /**
     * Создает текст для меню тегов
     * @returns {string} Текст сообщения
     */
    getTagMenuText() {
        return `🏷️ Управление тегами групп

📌 Выберите действие:`;
    }

    /**
     * Создает меню управления администраторами
     * @returns {Object} Inline клавиатура
     */
    getAdminManagementMenu() {
        try {
            const buttons = [
                [Markup.button.callback('➕ Добавить администратора', 'menu:action:admin_add')],
                [Markup.button.callback('🗑️ Удалить администратора', 'menu:action:admin_remove')],
                [Markup.button.callback('📋 Список администраторов', 'menu:action:admin_list')],
                [Markup.button.callback('◀️ Назад', 'menu:admin')]
            ];

            logger.info('Admin management menu created');
            return Markup.inlineKeyboard(buttons);
        } catch (error) {
            logger.error('Error creating admin management menu:', error);
            return Markup.inlineKeyboard([]);
        }
    }

    /**
     * Создает текст для меню управления администраторами
     * @returns {string} Текст сообщения
     */
    getAdminManagementMenuText() {
        return `👥 Управление администраторами

📌 Выберите действие:`;
    }

    /**
     * Создает меню управления группами
     * @returns {Object} Inline клавиатура
     */
    getGroupManagementMenu() {
        try {
            const buttons = [
                [Markup.button.callback('📋 Список групп', 'menu:action:group_list')],
                [Markup.button.callback('➕ Добавить группу', 'menu:action:group_add')],
                [Markup.button.callback('🗑️ Удалить группу', 'menu:action:group_remove')],
                [Markup.button.callback('🆔 ID группы', 'menu:action:group_id')],
                [Markup.button.callback('◀️ Назад', 'menu:admin')]
            ];

            logger.info('Group management menu created');
            return Markup.inlineKeyboard(buttons);
        } catch (error) {
            logger.error('Error creating group management menu:', error);
            return Markup.inlineKeyboard([]);
        }
    }

    /**
     * Создает текст для меню управления группами
     * @returns {string} Текст сообщения
     */
    getGroupManagementMenuText() {
        return `📊 Управление группами

📌 Выберите действие:`;
    }
}

export default new MenuBuilder();
