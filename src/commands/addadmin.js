import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../services/logger.js';
import { isAdmin, ADMIN_IDS } from '../config/admins.js';
import conversationState from '../services/conversationState.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Добавление нового администратора
 * @param {Object} bot - Экземпляр бота Telegraf
 */
export function setupAddAdminCommand(bot) {
    // Команда /addadmin - начинаем процесс добавления админа
    bot.command('addadmin', async (ctx) => {
        try {
            const userId = ctx.from?.id;

            // Проверяем, есть ли ID
            if (!userId) {
                logger.warn('AddAdmin command: User ID not found');
                return ctx.reply('❌ Ошибка: не удалось определить пользователя');
            }

            // Проверяем, является ли пользователь администратором
            if (!isAdmin(userId)) {
                logger.warn(`User ${userId} tried to use /addadmin without admin rights`);
                return ctx.reply('❌ У вас нет прав администратора для этой команды');
            }

            // Устанавливаем состояние диалога
            conversationState.setState(userId, { action: 'waiting_new_admin_id' });

            logger.info(`Admin ${userId} started adding new admin`);

            await ctx.reply(
                '👥 Добавление нового администратора\n\n' +
                'Отправьте Telegram ID пользователя, которого хотите сделать администратором.\n\n' +
                'Пример: `123456789`\n\n' +
                '❌ /cancel - отменить'
            );
        } catch (error) {
            logger.error('Error in addadmin command:', error);
            ctx.reply('❌ Произошла ошибка при выполнении команды');
        }
    });

    // Обработчик для получения ID нового админа
    bot.on('text', async (ctx) => {
        try {
            const userId = ctx.from?.id;
            const state = conversationState.getState(userId);

            // Проверяем, ждем ли мы ID нового админа
            if (!state || state.action !== 'waiting_new_admin_id') {
                return; // Не наш обработчик
            }

            const messageText = ctx.message.text.trim();

            // Проверка на команду отмены
            if (messageText === '/cancel') {
                conversationState.clearState(userId);
                await ctx.reply('❌ Добавление администратора отменено');
                logger.info(`Admin ${userId} cancelled adding new admin`);
                return;
            }

            // Парсим ID
            const newAdminId = parseInt(messageText);

            // Проверяем, что это число
            if (isNaN(newAdminId)) {
                await ctx.reply('❌ Ошибка: ID должен быть числом.\n\nПопробуйте еще раз или отправьте /cancel');
                return;
            }

            // Проверяем, что это положительное число
            if (newAdminId <= 0) {
                await ctx.reply('❌ Ошибка: ID должен быть положительным числом.\n\nПопробуйте еще раз или отправьте /cancel');
                return;
            }

            // Проверяем, не является ли он уже админом
            if (isAdmin(newAdminId)) {
                await ctx.reply(`❌ Пользователь с ID ${newAdminId} уже является администратором`);
                conversationState.clearState(userId);
                return;
            }

            // Проверяем, что админ не добавляет самого себя
            if (newAdminId === userId) {
                await ctx.reply('❌ Вы уже администратор! Нельзя добавить себя');
                conversationState.clearState(userId);
                return;
            }

            // Запрашиваем подтверждение
            conversationState.setState(userId, { action: `confirming_new_admin`, newAdminId });

            await ctx.reply(
                `✅ Подтверждение\n\n` +
                `Вы хотите сделать пользователя с ID ${newAdminId} администратором?\n\n` +
                `Отправьте:\n` +
                `✅ - подтвердить\n` +
                `❌ - отменить`
            );

            logger.info(`Admin ${userId} is confirming to add admin ${newAdminId}`);
        } catch (error) {
            logger.error('Error in addadmin text handler:', error);
        }
    });

    // Обработчик для подтверждения (эмодзи или текст)
    bot.on('text', async (ctx) => {
        try {
            const userId = ctx.from?.id;
            const state = conversationState.getState(userId);

            // Проверяем, находимся ли мы в состоянии подтверждения
            if (!state || state.action !== 'confirming_new_admin') {
                return;
            }

            const newAdminId = state.newAdminId;
            const response = ctx.message.text.trim();

            if (response === '✅' || response.toLowerCase() === 'да' || response === '/yes') {
                // Подтверждаем добавление администратора
                try {
                    // Добавляем ID в массив
                    ADMIN_IDS.push(newAdminId);

                    // Обновляем файл config/admins.js
                    const adminsFilePath = path.join(__dirname, '../config/admins.js');
                    const adminsFileContent = generateAdminsFileContent();

                    fs.writeFileSync(adminsFilePath, adminsFileContent, 'utf-8');

                    conversationState.clearState(userId);

                    await ctx.reply(
                        `✅ Успешно!\n\n` +
                        `Пользователь с ID ${newAdminId} теперь администратор.\n\n` +
                        `📝 Изменения сохранены в конфигурацию`
                    );

                    logger.info(`Admin ${userId} successfully added new admin ${newAdminId}`);
                    logger.success(`New admin added: ${newAdminId}`);
                } catch (error) {
                    logger.error(`Error updating admins file: ${error}`);
                    await ctx.reply('❌ Ошибка при сохранении администратора. Попробуйте позже.');
                    conversationState.clearState(userId);
                }
            } else if (response === '❌' || response.toLowerCase() === 'нет' || response === '/no') {
                // Отменяем добавление
                conversationState.clearState(userId);
                await ctx.reply('❌ Добавление администратора отменено');
                logger.info(`Admin ${userId} cancelled adding admin ${newAdminId}`);
            } else {
                await ctx.reply('❓ Ответьте ✅ для подтверждения или ❌ для отмены');
            }
        } catch (error) {
            logger.error('Error in addadmin confirmation handler:', error);
        }
    });

    logger.success('AddAdmin command registered');
}

/**
 * Генерирует содержимое файла admins.js с текущим списком админов
 */
function generateAdminsFileContent() {
    const adminIds = ADMIN_IDS.map(id => `    ${id}`).join(', // New admin\n');

    return `/**
 * Admin Configuration
 * Список Telegram ID администраторов, которые могут использовать команду /announce
 */

// ВАЖНО: Добавьте сюда свой Telegram ID после выполнения команды /myid
export const ADMIN_IDS = [
${adminIds}
];

/**
 * Проверяет, является ли пользователь администратором
 */
export function isAdmin(userId) {
    return ADMIN_IDS.includes(userId);
}
`;
}
