import logger from '../services/logger.js';

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

        ctx.reply(
            `🆔 Ваш Telegram ID:\n\n` +
            `ID: <code>${userId}</code>\n` +
            `Имя: ${firstName}\n` +
            `Username: ${username}\n\n` +
            `Скопируйте ID и добавьте его в файл <code>src/config/admins.js</code> для получения прав администратора.`,
            { parse_mode: 'HTML' }
        );
    });
}
