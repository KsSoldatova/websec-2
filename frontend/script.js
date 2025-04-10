$(document).ready(function() {
    const API_BASE_URL = 'http://localhost:3000';
    let currentType, currentId;
    
    $('#search-button').on('click', function() {
        const query = $('#search-input').val().trim();
        const type = $('#search-type').val();
        
        if (query.length < 2) {
            alert('Введите минимум 2 символа');
            return;
        }
        
        searchItems(query, type);
    });
    
    function searchItems(query, type) {
        $('#loading').show();
        $('#results-list').empty();
        
        const endpoint = type === 'group' ? '/api/groups' : '/api/teachers';
        
        $.get(`${API_BASE_URL}${endpoint}?search=${encodeURIComponent(query)}`)
            .done(function(data) {
                displayResults(data, type);

            })
            .fail(function(error) {
                console.error('Ошибка поиска:', error);
                alert('Произошла ошибка при поиске');
            })
            .always(function() {
                $('#loading').hide();
            });
    }
    
    function displayResults(items, type) {
        const $resultsList = $('#results-list');
        $resultsList.empty();
        
        if (items.length === 0) {
            $resultsList.append('<div class="no-results">Ничего не найдено</div>');
            return;
        }
        
        items.forEach(item => {
            const id = item.link.split('=')[1];
            $resultsList.append(`
                <div class="result-item" data-id="${id}" data-type="${type}">
                    <div class="result-name">${item.name}</div>
                    ${type === 'teacher' ? '<div class="result-type">Преподаватель</div>' : ''}
                </div>
            `);
        });
    }
    
    $(document).on('click', '.result-item', function() {
        const id = $(this).data('id');
        const type = $(this).data('type');
        currentType = type;
        currentId = id;
        loadSchedule(id, type);
    });
    
    function loadSchedule(id, type, week = '') {
        $('#loading').show();
        $('#schedule-container').empty();
        
        const endpoint = type === 'group' 
            ? '/api/schedule/group/' + id 
            : '/api/schedule/teacher/' + id;
        
        const url = `${API_BASE_URL}${endpoint}${week ? '?week=' + week : ''}`;
        
        $.get(url)
            .done(function(schedule) {
                renderSchedule(schedule, type, id);
            })
            .fail(function(error) {
                console.error('Ошибка загрузки расписания:', error);
                alert('Не удалось загрузить расписание');
            })
            .always(function() {
                $('#loading').hide();
            });
    }
    
    function renderSchedule(schedule, type, id) {
        const $container = $('#schedule-container');
        $container.empty();
        
        if (!schedule || !schedule.days || !Array.isArray(schedule.days) || schedule.days.length === 0) {
            $container.html('<div class="error">Расписание не найдено или пустое</div>');
            return;
        }
    
        let currentWeek = parseInt(schedule.currentWeek) || 1;
        
        function createTimeIterator(schedule, type) {
            const items = ['8:00-9:35', '9:45-11:20', '11:30-13:05', '13:30-15:05', '15:15-16:50', '17:00-18:35', '18:45-20:15'];
            
            // Определяем начальный индекс
            let initialIndex;
            
            if (type === 'group') {
                initialIndex = -2; // Для групп всегда -2
            } else {
                // Для преподавателей проверяем наличие занятий в 08:00-09:35
                const hasEarlyLesson = schedule.days.some(day => 
                    day.lessons?.some(lesson => 
                        lesson?.time?.includes('08:00') || lesson?.time?.includes('8:00')
                    )
                );
                initialIndex = hasEarlyLesson ? -2 : -1;
            }
            
            let index = initialIndex;
            
            return function() {
                index = (index + 1) % items.length;
                if (index < 0) index += items.length;
                return items[index];
            };
        }
        
        // Использование в renderSchedule:
        const getNextTime = createTimeIterator(schedule, type);

        function tableCellsFilling(schedule) {
            console.log(schedule)
            let htmlRows = '';
            const daysCount = Math.min(schedule.days?.length || 0, 8);
        
            // 1. Собираем первый столбец (первые уроки каждого дня)
            const firstColumnLessons = [];
            for (let i = 0; i < daysCount; i++) {
                const day = schedule.days[i];
                firstColumnLessons.push(day?.lessons?.[0] || null);
            }
        
            // 2. Сдвигаем вверх и добавляем пустую ячейку
            const shiftedFirstColumn = [];
            for (let i = 1; i < firstColumnLessons.length; i++) {
                shiftedFirstColumn.push(firstColumnLessons[i]);
            }
            shiftedFirstColumn.push(null);
        
            for (let i = 0; i < daysCount; i++) {
                const day = schedule.days[i];
                if (!day || !day.lessons) continue;
        
                let htmlCells = `<td>${getNextTime()}</td>`;
        
                // 3. Заполняем ячейки (кроме первого столбца)
                for (let j = 1; j < day.lessons.length; j++) {
                    htmlCells += formatLessonCell(day.lessons[j]);
                }
        
                // 4. Добавляем пустые ячейки, если уроков < 6
                const filledCells = day.lessons.length - 1;
                const emptyCellsCount = 5 - filledCells;
                for (let j = 0; j < emptyCellsCount; j++) {
                    htmlCells += '<td></td>';
                }
        
                // 5. Переносим первый столбец (сдвинутый) В КОНЕЦ
                htmlCells += formatLessonCell(shiftedFirstColumn[i]);
        
                htmlRows += `<tr class="tbody-row">${htmlCells}</tr>`;
            }
        
            return htmlRows;
        }
        
        function formatLessonCell(lesson) {
            if (!lesson) return '<td></td>';
        
            return `
                <td class="day-cell">
                    <div class="lesson-card">
                        <div class="lesson-subject">${lesson.subject || '—'}</div>
                        ${lesson.place ? `<div class="lesson-place">${lesson.place}</div>` : ''}
                        ${type === 'group' && lesson.teacher && lesson.teacher.name ? 
                            `<div class="lesson-teacher">${lesson.teacher.name}</div>` : ''}
                        ${type === 'teacher' && lesson.groups && Array.isArray(lesson.groups) ? 
                            `<div class="lesson-groups">${lesson.groups.map(g => g.name).join(', ')}</div>` : ''}
                    </div>
                </td>
            `;
        }

        const tableHTML = `
            <h2 class="schedule-title">${schedule.selectedItem || 'Расписание'}</h2>
            <div class="week-info">Неделя: ${currentWeek}</div>
            <div class="table-responsive">
                <table class="schedule-table">
                    <thead>
                        <tr>
                            <th>Время</th>
                            <th>Понедельник</th>
                            <th>Вторник</th>
                            <th>Среда</th>
                            <th>Четверг</th>
                            <th>Пятница</th>
                            <th>Суббота</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableCellsFilling(schedule)}
                    </tbody>
                </table>
            </div>
            <div class="week-nav-buttons">
                <button class="week-nav-btn prev-week">← Предыдущая неделя</button>
                <button class="week-nav-btn next-week">Следующая неделя →</button>
            </div>
        `;
        
        $container.html(tableHTML);
        
        // Обработчики кнопок переключения недель
        $container.on('click', '.prev-week', function() {
            const newWeek = Math.max(1, currentWeek - 1);
            loadSchedule(id, type, newWeek);
        });
        
        $container.on('click', '.next-week', function() {
            const newWeek = currentWeek + 1;
            loadSchedule(id, type, newWeek);
        });
    }
});