import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * User Manager Service
 * Управление списком зарегистрированных пользователей
 */
class UserManager {
    constructor() {
        this.usersFile = path.join(__dirname, '../../data/users.json');
        this.ensureDataFile();
    }

    /**
     * Проверяет существование файла users.json
     */
    ensureDataFile() {
        const dataDir = path.dirname(this.usersFile);

        // Создаем директорию data, если её нет
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Создаем файл users.json, если его нет
        if (!fs.existsSync(this.usersFile)) {
            fs.writeFileSync(this.usersFile, JSON.stringify([], null, 2));
            logger.info('Created users.json file');
        }
    }

    /**
     * Читает список пользователей из файла
     */
    getUsers() {
        try {
            const data = fs.readFileSync(this.usersFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            logger.error('Error reading users.json', error);
            return [];
        }
    }

    /**
     * Сохраняет список пользователей в файл
     */
    saveUsers(users) {
        try {
            fs.writeFileSync(this.usersFile, JSON.stringify(users, null, 2));
            logger.info('Users saved successfully');
            return true;
        } catch (error) {
            logger.error('Error saving users.json', error);
            return false;
        }
    }

    /**
     * Получить пользователя по ID
     */
    getUserById(userId) {
        const users = this.getUsers();
        return users.find(u => u.id === userId);
    }

    /**
     * Добавить нового пользователя
     */
    addUser(userId, firstName, lastName, patronymic, subject) {
        const users = this.getUsers();

        // Проверяем, не зарегистрирован ли уже этот пользователь
        const exists = users.find(u => u.id === userId);
        if (exists) {
            logger.warn(`User ${userId} already registered`);
            return { success: false, reason: 'already_exists', user: exists };
        }

        const newUser = {
            id: userId,
            firstName,
            lastName,
            patronymic,
            subject,
            status: 'pending', // pending, approved, rejected
            registeredAt: new Date().toISOString()
        };

        users.push(newUser);
        this.saveUsers(users);
        logger.success(`User registered: ${lastName} ${firstName} ${patronymic} (${subject})`);

        return { success: true, user: newUser };
    }

    /**
     * Обновить статус пользователя
     */
    updateUserStatus(userId, status, adminId) {
        const users = this.getUsers();
        const userIndex = users.findIndex(u => u.id === userId);

        if (userIndex === -1) {
            logger.warn(`User ${userId} not found`);
            return false;
        }

        users[userIndex].status = status;

        if (status === 'approved') {
            users[userIndex].approvedAt = new Date().toISOString();
            users[userIndex].approvedBy = adminId;
        } else if (status === 'rejected') {
            users[userIndex].rejectedAt = new Date().toISOString();
            users[userIndex].rejectedBy = adminId;
        }

        this.saveUsers(users);
        logger.success(`User ${userId} status updated to ${status}`);
        return true;
    }

    /**
     * Удалить пользователя
     */
    deleteUser(userId) {
        const users = this.getUsers();
        const filteredUsers = users.filter(u => u.id !== userId);

        if (users.length === filteredUsers.length) {
            logger.warn(`User ${userId} not found`);
            return false;
        }

        this.saveUsers(filteredUsers);
        logger.success(`User ${userId} deleted`);
        return true;
    }

    /**
     * Получить пользователей, ожидающих одобрения
     */
    getPendingUsers() {
        const users = this.getUsers();
        return users.filter(u => u.status === 'pending');
    }

    /**
     * Получить одобренных пользователей
     */
    getApprovedUsers() {
        const users = this.getUsers();
        return users.filter(u => u.status === 'approved');
    }

    /**
     * Получить одобренных пользователей по предмету
     */
    getApprovedUsersBySubject(subject) {
        const users = this.getApprovedUsers();
        return users.filter(u => u.subject.toLowerCase() === subject.toLowerCase());
    }

    /**
     * Получить отклонённых пользователей
     */
    getRejectedUsers() {
        const users = this.getUsers();
        return users.filter(u => u.status === 'rejected');
    }

    /**
     * Получить статистику
     */
    getStats() {
        const users = this.getUsers();
        return {
            total: users.length,
            pending: users.filter(u => u.status === 'pending').length,
            approved: users.filter(u => u.status === 'approved').length,
            rejected: users.filter(u => u.status === 'rejected').length
        };
    }

    /**
     * Получить список всех предметов
     */
    getAllSubjects() {
        const users = this.getApprovedUsers();
        const subjects = [...new Set(users.map(u => u.subject))];
        return subjects.sort();
    }
}

// Экспортируем единственный экземпляр
const userManager = new UserManager();
export default userManager;
