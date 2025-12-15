import { Markup } from 'telegraf';
import userManager from '../services/userManager.js';
import conversationState from '../services/conversationState.js';
import logger from '../services/logger.js';
import { ADMIN_IDS } from '../config/admins.js';

/**
 * Команда /register
 * Регистрация пользователя для получения рассылок
 */
export function setupRegisterCommand(bot) {
    // Команда для запуска процесса регистрации
    bot.command('register', (ctx) => {
        const userId = ctx.from.id;

        // Проверяем, не зарегистрирован ли уже пользователь
        const existingUser = userManager.getUserById(userId);

        if (existingUser) {
            let statusText = '';
            if (existingUser.status === 'pending') {
                statusText = '⏳ Ваша заявка ожидает одобрения администратором.';
            } else if (existingUser.status === 'approved') {
                statusText = '✅ Вы уже зарегистрированы и одобрены!';
            } else if (existingUser.status === 'rejected') {
                statusText = '❌ Ваша заявка была отклонена администратором.';
            }

            return ctx.reply(
                `📋 Вы уже зарегистрированы в системе!\n\n` +
                `👤 ${existingUser.lastName} ${existingUser.firstName} ${existingUser.patronymic}\n` +
                `📚 Предмет: ${existingUser.subject}\n\n` +
                statusText
            );
        }

        // Запускаем процесс регистрации
        conversationState.setState(userId, { action: 'waiting_last_name' });

        ctx.reply(
            '👋 Добро пожаловать в систему регистрации!\n\n' +
            'Для получения рассылок вам необходимо зарегистрироваться.\n' +
            'После регистрации ваша заявка будет отправлена администратору на одобрение.\n\n' +
            '━━━━━━━━━━━━━━━━━━━━\n\n' +
            '📝 Шаг 1 из 4\n\n' +
            'Введите вашу <b>фамилию</b>:\n\n' +
            'Для отмены отправьте /cancel',
            { parse_mode: 'HTML' }
        );

        logger.info(`User ${userId} started registration process`);
    });

    // Обработчик текстовых сообщений для процесса регистрации
    bot.on('text', async (ctx, next) => {
        const userId = ctx.from.id;
        const state = conversationState.getState(userId);

        // Проверяем, что это наш процесс регистрации
        if (!state || !state.action.startsWith('waiting_')) {
            return next();
        }

        const text = ctx.message.text;

        // Отмена процесса
        if (text === '/cancel') {
            conversationState.clearState(userId);
            return ctx.reply('❌ Регистрация отменена.');
        }

        // Шаг 1: Ожидание фамилии
        if (state.action === 'waiting_last_name') {
            const lastName = text.trim();

            if (lastName.length === 0 || lastName.length > 50) {
                return ctx.reply(
                    '❌ Фамилия должна содержать от 1 до 50 символов.\n\n' +
                    'Попробуйте ещё раз или отправьте /cancel для отмены.'
                );
            }

            conversationState.setState(userId, {
                action: 'waiting_first_name',
                lastName
            });

            return ctx.reply(
                '✅ Фамилия принята!\n\n' +
                '📝 Шаг 2 из 4\n\n' +
                'Введите ваше <b>имя</b>:\n\n' +
                'Для отмены отправьте /cancel',
                { parse_mode: 'HTML' }
            );
        }

        // Шаг 2: Ожидание имени
        if (state.action === 'waiting_first_name') {
            const firstName = text.trim();

            if (firstName.length === 0 || firstName.length > 50) {
                return ctx.reply(
                    '❌ Имя должно содержать от 1 до 50 символов.\n\n' +
                    'Попробуйте ещё раз или отправьте /cancel для отмены.'
                );
            }

            conversationState.setState(userId, {
                action: 'waiting_patronymic',
                lastName: state.lastName,
                firstName
            });

            return ctx.reply(
                '✅ Имя принято!\n\n' +
                '📝 Шаг 3 из 4\n\n' +
                'Введите ваше <b>отчество</b>:\n\n' +
                'Для отмены отправьте /cancel',
                { parse_mode: 'HTML' }
            );
        }

        // Шаг 3: Ожидание отчества
        if (state.action === 'waiting_patronymic') {
            const patronymic = text.trim();

            if (patronymic.length === 0 || patronymic.length > 50) {
                return ctx.reply(
                    '❌ Отчество должно содержать от 1 до 50 символов.\n\n' +
                    'Попробуйте ещё раз или отправьте /cancel для отмены.'
                );
            }

            conversationState.setState(userId, {
                action: 'waiting_subject',
                lastName: state.lastName,
                firstName: state.firstName,
                patronymic
            });

            return ctx.reply(
                '✅ Отчество принято!\n\n' +
                '📝 Шаг 4 из 4\n\n' +
                'Введите ваш <b>предмет</b> (например: Математика, Русский язык, Физика):\n\n' +
                'Для отмены отправьте /cancel',
                { parse_mode: 'HTML' }
            );
        }

        // Шаг 4: Ожидание предмета
        if (state.action === 'waiting_subject') {
            const subject = text.trim();

            if (subject.length === 0 || subject.length > 100) {
                return ctx.reply(
                    '❌ Предмет должен содержать от 1 до 100 символов.\n\n' +
                    'Попробуйте ещё раз или отправьте /cancel для отмены.'
                );
            }

            // Сохраняем все данные и показываем подтверждение
            conversationState.setState(userId, {
                action: 'confirm_registration',
                lastName: state.lastName,
                firstName: state.firstName,
                patronymic: state.patronymic,
                subject
            });

            const confirmKeyboard = Markup.inlineKeyboard([
                [
                    Markup.button.callback('✅ Да, всё верно', 'confirm_registration'),
                    Markup.button.callback('❌ Отмена', 'cancel_registration')
                ]
            ]);

            return ctx.reply(
                '📋 Подтверждение регистрации\n\n' +
                'Проверьте введённые данные:\n\n' +
                `👤 ФИО: ${state.lastName} ${state.firstName} ${state.patronymic}\n` +
                `📚 Предмет: ${subject}\n\n` +
                'Всё верно?',
                confirmKeyboard
            );
        }
    });

    // Обработчик подтверждения регистрации
    bot.action('confirm_registration', async (ctx) => {
        const userId = ctx.from.id;
        const state = conversationState.getState(userId);

        if (!state || state.action !== 'confirm_registration') {
            return ctx.answerCbQuery('❌ Ошибка: состояние не найдено');
        }

        const { lastName, firstName, patronymic, subject } = state;

        // Добавляем пользователя
        const result = userManager.addUser(userId, firstName, lastName, patronymic, subject);

        conversationState.clearState(userId);

        if (!result.success) {
            await ctx.editMessageText(
                '❌ Ошибка при регистрации.\n\n' +
                'Возможно, вы уже зарегистрированы.'
            );
            return ctx.answerCbQuery('❌ Ошибка регистрации');
        }

        // Уведомляем пользователя
        await ctx.editMessageText(
            '✅ Регистрация успешна!\n\n' +
            `👤 ${lastName} ${firstName} ${patronymic}\n` +
            `📚 ${subject}\n\n` +
            '⏳ Ваша заявка отправлена администратору на одобрение.\n' +
            'Вы получите уведомление, когда администратор рассмотрит вашу заявку.'
        );
        await ctx.answerCbQuery('✅ Регистрация отправлена!');

        // Уведомляем всех администраторов
        const approveKeyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Одобрить', `approve_user:${userId}`),
                Markup.button.callback('❌ Отклонить', `reject_user:${userId}`)
            ]
        ]);

        for (const adminId of ADMIN_IDS) {
            try {
                await ctx.telegram.sendMessage(
                    adminId,
                    '🔔 Новая заявка на регистрацию!\n\n' +
                    `👤 ФИО: ${lastName} ${firstName} ${patronymic}\n` +
                    `📚 Предмет: ${subject}\n` +
                    `🆔 ID: <code>${userId}</code>\n\n` +
                    'Одобрить или отклонить?',
                    { parse_mode: 'HTML', ...approveKeyboard }
                );
            } catch (error) {
                logger.error(`Failed to notify admin ${adminId}:`, error);
            }
        }

        logger.success(`User ${userId} registered: ${lastName} ${firstName} ${patronymic} (${subject})`);
    });

    // Обработчик отмены регистрации
    bot.action('cancel_registration', async (ctx) => {
        const userId = ctx.from.id;
        conversationState.clearState(userId);

        await ctx.editMessageText('❌ Регистрация отменена.');
        await ctx.answerCbQuery('Отменено');
        logger.info(`User ${userId} cancelled registration`);
    });
}
