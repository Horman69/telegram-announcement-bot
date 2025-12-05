/**
 * Logger Service
 * Простой сервис для логирования с timestamp и уровнями
 */

class Logger {
    /**
     * Форматирует timestamp
     */
    getTimestamp() {
        return new Date().toISOString();
    }

    /**
     * Логирование информационных сообщений
     */
    info(message) {
        console.log(`[INFO] ${this.getTimestamp()}: ${message}`);
    }

    /**
     * Логирование предупреждений
     */
    warn(message) {
        console.warn(`[WARN] ${this.getTimestamp()}: ${message}`);
    }

    /**
     * Логирование ошибок
     */
    error(message, error = null) {
        console.error(`[ERROR] ${this.getTimestamp()}: ${message}`);
        if (error) {
            console.error(error);
        }
    }

    /**
     * Логирование успешных операций
     */
    success(message) {
        console.log(`[SUCCESS] ${this.getTimestamp()}: ${message}`);
    }
}

export default new Logger();
