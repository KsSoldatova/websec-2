const PORT = process.env.PORT || 3000;
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const axios = require('axios');
const HTMLParser = require('node-html-parser');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Загрузка данных
let groupsData = [];
let teachersData = [];

try {
  groupsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'datagroups.json'))).groups || [];
  console.log('Группы загружены:', groupsData.length);
} catch (err) {
  console.error('Ошибка загрузки групп:', err);
}

try {
  teachersData = JSON.parse(fs.readFileSync(path.join(__dirname, 'datateachers.json'))).teachers || [];
  console.log('Преподаватели загружены:', teachersData.length);
} catch (err) {
  console.error('Ошибка загрузки преподавателей:', err);
}

// Функция парсинга расписания
function parseSchedule(html, isTeacher = false) {
    const root = HTMLParser.parse(html);
    const schedule = {
        currentWeek: root.querySelector('.week-nav-current_week')?.text.trim() || '1',
        selectedItem: root.querySelector('.info-block__title')?.text.trim() || '',
        days: []
    };

    // Получаем даты для каждого дня
    const dateElements = root.querySelectorAll('.schedule__head');
    const dates = dateElements.map(el => el.text.trim());

    // Получаем временные слоты
    const timeElements = root.querySelectorAll('.schedule__time');
    const timeSlots = timeElements.map(el => el.text.trim());

    // Парсим занятия
    const items = root.querySelectorAll('.schedule__item');
    let dayIndex = -1;

    items.forEach((item, index) => {
        if (index % 6 === 0) {
            dayIndex++;
            schedule.days.push({
                date: dates[dayIndex] || '',
                lessons: []
            });
        }

        const discipline = item.querySelector('.schedule__discipline');
        if (!discipline) {
            schedule.days[dayIndex].lessons.push(null);
            return;
        }

        const lesson = {
            time: timeSlots[index % 6] || '',
            subject: discipline.text.trim(),
            place: item.querySelector('.schedule__place')?.text.trim() || '',
            teacher: {
                name: item.querySelector('.schedule__teacher .caption-text')?.text.trim() || '',
                link: item.querySelector('.schedule__teacher a')?.getAttribute('href') || null
            }
        };

        if (isTeacher) {
            const groupElements = item.querySelectorAll('.schedule__group');
            lesson.groups = Array.from(groupElements).map(group => ({
                name: group.text.trim(),
                link: group.getAttribute('href') || null
            }));
        }

        schedule.days[dayIndex].lessons.push(lesson);
    });

    return schedule;
}

// API Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/api/groups', (req, res) => {
    const searchQuery = (req.query.search || '').toLowerCase();
    const filteredGroups = groupsData.filter(group => 
        group.name.toLowerCase().includes(searchQuery)
    ).slice(0, 50);
    res.json(filteredGroups);
});

app.get('/api/teachers', (req, res) => {
    const searchQuery = (req.query.search || '').toLowerCase();
    const filteredTeachers = teachersData.filter(teacher => 
        teacher.name.toLowerCase().includes(searchQuery)
    ).slice(0, 50);
    res.json(filteredTeachers);
});

app.get('/api/schedule/group/:groupId', async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const week = req.query.week || '';
        const url = `https://ssau.ru/rasp?groupId=${groupId}${week ? `&selectedWeek=${week}` : ''}`;
        
        const response = await axios.get(url);
        const schedule = parseSchedule(response.data);
        
        res.json(schedule);
    } catch (error) {
        console.error('Ошибка получения расписания группы:', error);
        res.status(500).json({ 
            error: 'Не удалось получить расписание группы',
            details: error.message
        });
    }
});

app.get('/api/schedule/teacher/:staffId', async (req, res) => {
    try {
        const staffId = req.params.staffId;
        const week = req.query.week || '';
        const url = `https://ssau.ru/rasp?staffId=${staffId}${week ? `&selectedWeek=${week}` : ''}`;
        
        const response = await axios.get(url);
        const schedule = parseSchedule(response.data, true);
        
        res.json(schedule);
    } catch (error) {
        console.error('Ошибка получения расписания преподавателя:', error);
        res.status(500).json({ 
            error: 'Не удалось получить расписание преподавателя',
            details: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});