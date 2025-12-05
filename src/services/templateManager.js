import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Template Manager Service
 * Управление шаблонами объявлений
 */
class TemplateManager {
    constructor() {
        this.templatesFile = path.join(__dirname, '../../data/templates.json');
        this.ensureDataFile();
    }

    /**
     * Проверяет существование файла templates.json
     */
    ensureDataFile() {
        const dataDir = path.dirname(this.templatesFile);

        // Создаем директорию data, если её нет
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Создаем файл templates.json, если его нет
        if (!fs.existsSync(this.templatesFile)) {
            fs.writeFileSync(this.templatesFile, JSON.stringify({}, null, 2));
            logger.info('Created templates.json file');
        }
    }

    /**
     * Читает все шаблоны из файла
     * @returns {Object} Объект с шаблонами { "название": "текст", ... }
     */
    getTemplates() {
        try {
            const data = fs.readFileSync(this.templatesFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            logger.error('Error reading templates.json', error);
            return {};
        }
    }

    /**
     * Сохраняет шаблоны в файл
     * @param {Object} templates - Объект с шаблонами
     * @returns {boolean} Успешность операции
     */
    saveTemplates(templates) {
        try {
            fs.writeFileSync(this.templatesFile, JSON.stringify(templates, null, 2));
            logger.info('Templates saved successfully');
            return true;
        } catch (error) {
            logger.error('Error saving templates.json', error);
            return false;
        }
    }

    /**
     * Сохраняет новый шаблон
     * @param {string} name - Название шаблона
     * @param {string} text - Текст шаблона
     * @returns {boolean} Успешность операции
     */
    saveTemplate(name, text) {
        const templates = this.getTemplates();

        const exists = templates.hasOwnProperty(name);
        templates[name] = text;

        const success = this.saveTemplates(templates);
        if (success) {
            if (exists) {
                logger.success(`Template "${name}" updated`);
            } else {
                logger.success(`Template "${name}" created`);
            }
        }
        return success;
    }

    /**
     * Получает текст шаблона по названию
     * @param {string} name - Название шаблона
     * @returns {string|null} Текст шаблона или null
     */
    getTemplate(name) {
        const templates = this.getTemplates();
        return templates[name] || null;
    }

    /**
     * Удаляет шаблон
     * @param {string} name - Название шаблона
     * @returns {boolean} Успешность операции
     */
    deleteTemplate(name) {
        const templates = this.getTemplates();

        if (!templates.hasOwnProperty(name)) {
            logger.warn(`Template "${name}" not found`);
            return false;
        }

        delete templates[name];
        const success = this.saveTemplates(templates);

        if (success) {
            logger.success(`Template "${name}" deleted`);
        }
        return success;
    }

    /**
     * Получает количество шаблонов
     * @returns {number} Количество шаблонов
     */
    getTemplateCount() {
        return Object.keys(this.getTemplates()).length;
    }

    /**
     * Проверяет существование шаблона
     * @param {string} name - Название шаблона
     * @returns {boolean} Существует ли шаблон
     */
    templateExists(name) {
        const templates = this.getTemplates();
        return templates.hasOwnProperty(name);
    }
}

export default new TemplateManager();
