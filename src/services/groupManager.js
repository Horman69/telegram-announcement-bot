import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Group Manager Service
 * Управление списком групп для рассылки
 */
class GroupManager {
    constructor() {
        this.groupsFile = path.join(__dirname, '../../data/groups.json');
        this.ensureDataFile();
    }

    /**
     * Проверяет существование файла groups.json
     */
    ensureDataFile() {
        const dataDir = path.dirname(this.groupsFile);

        // Создаем директорию data, если её нет
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Создаем файл groups.json, если его нет
        if (!fs.existsSync(this.groupsFile)) {
            fs.writeFileSync(this.groupsFile, JSON.stringify([], null, 2));
            logger.info('Created groups.json file');
        }
    }

    /**
     * Читает список групп из файла
     */
    getGroups() {
        try {
            const data = fs.readFileSync(this.groupsFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            logger.error('Error reading groups.json', error);
            return [];
        }
    }

    /**
     * Сохраняет список групп в файл
     */
    saveGroups(groups) {
        try {
            fs.writeFileSync(this.groupsFile, JSON.stringify(groups, null, 2));
            logger.info('Groups saved successfully');
            return true;
        } catch (error) {
            logger.error('Error saving groups.json', error);
            return false;
        }
    }

    /**
     * Добавляет новую группу
     */
    addGroup(chatId, chatTitle) {
        const groups = this.getGroups();

        // Проверяем, не добавлена ли уже эта группа
        const exists = groups.find(g => g.id === chatId);
        if (exists) {
            logger.warn(`Group ${chatTitle} (${chatId}) already exists`);
            return false;
        }

        groups.push({
            id: chatId,
            title: chatTitle,
            tags: [],
            threadId: null,  // ID темы для форумов (null = General)
            addedAt: new Date().toISOString()
        });

        this.saveGroups(groups);
        logger.success(`Added group: ${chatTitle} (${chatId})`);
        return true;
    }

    /**
     * Добавляет группу вручную (по ID и названию)
     */
    addGroupManually(chatId, chatTitle) {
        const groups = this.getGroups();

        // Проверяем, не добавлена ли уже эта группа
        const exists = groups.find(g => g.id === chatId);
        if (exists) {
            logger.warn(`Group ${chatTitle} (${chatId}) already exists`);
            return false;
        }

        groups.push({
            id: chatId,
            title: chatTitle,
            tags: [],
            addedAt: new Date().toISOString(),
            addedManually: true // Флаг для отслеживания ручного добавления
        });

        this.saveGroups(groups);
        logger.success(`Manually added group: ${chatTitle} (${chatId})`);
        return true;
    }

    /**
     * Удаляет группу
     */
    removeGroup(chatId) {
        const groups = this.getGroups();
        const filtered = groups.filter(g => g.id !== chatId);

        if (filtered.length === groups.length) {
            logger.warn(`Group ${chatId} not found`);
            return false;
        }

        this.saveGroups(filtered);
        logger.success(`Removed group: ${chatId}`);
        return true;
    }

    /**
     * Получает количество групп
     */
    getGroupCount() {
        return this.getGroups().length;
    }

    /**
     * Добавляет тег к группе
     * @param {number} groupId - ID группы
     * @param {string} tag - Тег для добавления
     * @returns {boolean} Успешность операции
     */
    addTag(groupId, tag) {
        const groups = this.getGroups();
        const group = groups.find(g => g.id === groupId);

        if (!group) {
            logger.warn(`Group ${groupId} not found`);
            return false;
        }

        // Инициализируем tags, если его нет (для старых групп)
        if (!group.tags) {
            group.tags = [];
        }

        // Проверяем, нет ли уже такого тега
        if (group.tags.includes(tag)) {
            logger.warn(`Tag "${tag}" already exists for group ${group.title}`);
            return false;
        }

        group.tags.push(tag);
        this.saveGroups(groups);
        logger.success(`Added tag "${tag}" to group ${group.title} (${groupId})`);
        return true;
    }

    /**
     * Удаляет тег у группы
     * @param {number} groupId - ID группы
     * @param {string} tag - Тег для удаления
     * @returns {boolean} Успешность операции
     */
    removeTag(groupId, tag) {
        const groups = this.getGroups();
        const group = groups.find(g => g.id === groupId);

        if (!group) {
            logger.warn(`Group ${groupId} not found`);
            return false;
        }

        if (!group.tags || !group.tags.includes(tag)) {
            logger.warn(`Tag "${tag}" not found for group ${group.title}`);
            return false;
        }

        group.tags = group.tags.filter(t => t !== tag);
        this.saveGroups(groups);
        logger.success(`Removed tag "${tag}" from group ${group.title} (${groupId})`);
        return true;
    }

    /**
     * Получает группы по тегам (OR логика - хотя бы один тег совпадает)
     * @param {string[]} tags - Массив тегов
     * @returns {Array} Массив групп
     */
    getGroupsByTags(tags) {
        const groups = this.getGroups();

        if (!tags || tags.length === 0) {
            return groups;
        }

        return groups.filter(group => {
            if (!group.tags || group.tags.length === 0) {
                return false;
            }
            // Проверяем, есть ли хотя бы один совпадающий тег
            return group.tags.some(tag => tags.includes(tag));
        });
    }

    /**
     * Получает все уникальные теги из всех групп
     * @returns {string[]} Массив уникальных тегов
     */
    getAllTags() {
        const groups = this.getGroups();
        const allTags = new Set();

        groups.forEach(group => {
            if (group.tags && Array.isArray(group.tags)) {
                group.tags.forEach(tag => allTags.add(tag));
            }
        });

        return Array.from(allTags).sort();
    }

    /**
     * Получает группу по ID
     * @param {number} groupId - ID группы
     * @returns {Object|null} Объект группы или null
     */
    getGroupById(groupId) {
        const groups = this.getGroups();
        return groups.find(g => g.id === groupId) || null;
    }

    /**
     * Устанавливает ID темы для группы
     * @param {number} groupId - ID группы
     * @param {number|null} threadId - ID темы (null для General)
     * @returns {boolean} Успешность операции
     */
    setThreadId(groupId, threadId) {
        const groups = this.getGroups();
        const group = groups.find(g => g.id === groupId);

        if (!group) {
            logger.warn(`Group ${groupId} not found`);
            return false;
        }

        group.threadId = threadId;
        this.saveGroups(groups);
        logger.success(`Set threadId ${threadId} for group ${group.title} (${groupId})`);
        return true;
    }

    /**
     * Получает ID темы для группы
     * @param {number} groupId - ID группы
     * @returns {number|null} ID темы или null
     */
    getThreadId(groupId) {
        const group = this.getGroupById(groupId);
        return group ? group.threadId : null;
    }
}

export default new GroupManager();
