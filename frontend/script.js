$(document).ready(function() {
    const API_BASE_URL = 'http://localhost:3000';
    
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
        loadSchedule(id, type);
    });
    
    function loadSchedule(id, type) {
        $('#loading').show();
        $('#schedule-container').empty();
        
        const endpoint = type === 'group' 
            ? '/api/schedule/group/' + id 
            : '/api/schedule/teacher/' + id;
        
        $.get(`${API_BASE_URL}${endpoint}`)
            .done(function(schedule) {
                renderSchedule(schedule, type);
            })
            .fail(function(error) {
                console.error('Ошибка загрузки расписания:', error);
                alert('Не удалось загрузить расписание');
            })
            .always(function() {
                $('#loading').hide();
            });
    }
    
    function renderSchedule(schedule, type) {
        const $container = $('#schedule-container');
        $container.empty();
        
        if (!schedule || !schedule.days || !Array.isArray(schedule.days) || schedule.days.length === 0) {
            $container.html('<div class="error">Расписание не найдено или пустое</div>');
            return;
        }
    
        console.log("Полученные данные расписания:", schedule);
    
        // Создаём таблицу
        const tableHTML = `
            <h2 class="schedule-title">${schedule.selectedItem || 'Расписание'}</h2>
            <div class="week-info">${schedule.currentWeek ? 'Текущая неделя: ' + schedule.currentWeek : ''}</div>
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
                    <tbody></tbody>
                </table>
            </div>
        `;
        
        $container.html(tableHTML);
        const $tbody = $container.find('tbody');
    
        // Собираем все временные слоты с дополнительными проверками
        const allTimes = [];
        schedule.days.forEach(day => {
            if (day && day.lessons && Array.isArray(day.lessons)) {
                day.lessons.forEach(lesson => {
                    if (lesson && lesson.time && typeof lesson.time === 'string' && !allTimes.includes(lesson.time)) {
                        allTimes.push(lesson.time);
                    }
                });
            }
        });
    
        // Сортируем временные слоты
        allTimes.sort((a, b) => {
            try {
                const getMinutes = time => {
                    const [start] = time.split('-');
                    const [hours, minutes] = start.split(':').map(Number);
                    return hours * 60 + minutes;
                };
                return getMinutes(a) - getMinutes(b);
            } catch (e) {
                console.error('Ошибка сортировки времени:', e);
                return 0;
            }
        });
    
        // Создаём строки для каждого временного слота
        allTimes.forEach(time => {
            const $row = $('<tr></tr>');
            $row.append(`<td class="time-cell">${time}</td>`);
            
            // Добавляем ячейки для каждого дня недели
            for (let i = 0; i < 6; i++) {
                const day = schedule.days[i];
                let lesson = null;
                
                if (day && day.lessons && Array.isArray(day.lessons)) {
                    lesson = day.lessons.find(l => l && l.time === time) || null;
                }
                
                if (lesson) {
                    $row.append(`
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
                    `);
                } else {
                    $row.append('<td class="day-cell"></td>');
                }
            }
            
            $tbody.append($row);
        });
    
        // Добавляем кнопки навигации
        $container.append(`
            <div class="week-nav-buttons">
                <button class="week-nav-btn prev-week">← Предыдущая</button>
                <button class="week-nav-btn next-week">Следующая →</button>
            </div>
        `);
    }
});