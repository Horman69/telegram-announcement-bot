import logger from '../services/logger.js';
import { Markup } from 'telegraf';

/**
 * Команда /myid
 * Показывает пользователю его Telegram ID
 */
export function setupMyIdCommand(bot) {
    bot.command('myid', (ctx) => {
        const userId = ctx.from.id;
        const username = ctx.from.username ? `@${ctx.from.username}` : 'без username';
        const firstName = ctx.from.first_name || '';

        logger.info(`User ${userId} requested their ID`);

        const backKeyboard = Markup.inlineKeyboard([
            [Markup.button.callback('◀️ Назад', 'menu:user')]
        ]);

        ctx.reply(
            `🆔 Ваш Telegram ID:\n\n` +
            `ID: <code>${userId}</code>\n` +
            `Имя: ${firstName}\n` +
            `Username: ${username}\n\n` +
            `Отправьте этот ID администратору для получения прав доступа.`,
            { parse_mode: 'HTML', ...backKeyboard }
        );
    });
}

