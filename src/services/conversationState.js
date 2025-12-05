import logger from './logger.js';

/**
 * Conversation State Manager
 * Управление состоянием диалогов пользователей
 */
class ConversationState {
    constructor() {
        // Map для хранения состояний: userId -> state object
        this.states = new Map();
    }

    /**
     * Устанавливает состояние для пользователя
     * @param {number} userId - ID пользователя
     * @param {Object} state - Объект состояния
     */
    setState(userId, state) {
        this.states.set(userId, {
            ...state,
            createdAt: Date.now()
        });
        logger.info(`State set for user ${userId}: ${state.action}`);
    }

    /**
     * Получает состояние пользователя
     * @param {number} userId - ID пользователя
     * @returns {Object|null} Объект состояния или null
     */
    getState(userId) {
        return this.states.get(userId) || null;
    }

    /**
     * Очищает состояние пользователя
     * @param {number} userId - ID пользователя
     */
    clearState(userId) {
        const state = this.states.get(userId);
        if (state) {
            this.states.delete(userId);
            logger.info(`State cleared for user ${userId}`);
        }
    }

    /**
     * Обновляет состояние пользователя
     * @param {number} userId - ID пользователя
     * @param {Object} updates - Обновления состояния
     */
    updateState(userId, updates) {
        const currentState = this.getState(userId);
        if (currentState) {
            this.setState(userId, {
                ...currentState,
                ...updates
            });
        }
    }

    /**
     * Проверяет, есть ли состояние у пользователя
     * @param {number} userId - ID пользователя
     * @returns {boolean}
     */
    hasState(userId) {
        return this.states.has(userId);
    }

    /**
     * Очищает устаревшие состояния (старше 1 часа)
     */
    cleanupOldStates() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        let cleaned = 0;

        for (const [userId, state] of this.states.entries()) {
            if (state.createdAt < oneHourAgo) {
                this.states.delete(userId);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.info(`Cleaned up ${cleaned} old conversation states`);
        }
    }
}

export default new ConversationState();
