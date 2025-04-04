import json
import codecs
import requests
from bs4 import BeautifulSoup


def parser():
    # Парсинг преподавателей
    teachers_result = {"teachers": []}
    teachers_data = []
    for i in range(1, 122):
        url = "https://ssau.ru/staff?page=" + str(i)
        response = requests.get(url)
        teachers_data.append(response.text)
        if i == 121:
            for teacher in teachers_data:
                soup = BeautifulSoup(teacher, 'html.parser')
                teachers_list = soup.select(".list-group-item > a")
                for t in teachers_list:
                    staffId = ''.join(filter(str.isdigit, t.get("href")))
                    teachers_result["teachers"].append({
                        "name": t.text, 
                        "link": f"/rasp?staffId={staffId}"
                    })
    
    # Сохранение преподавателей в отдельный файл
    with codecs.open("datateachers.json", "w", "utf-8") as teachers_file:
        teachers_file.write(json.dumps(teachers_result, ensure_ascii=False, indent=2))
    
    # Парсинг групп
    groups_result = {"groups": []}
    for i in range(1, 6):
        url = "https://ssau.ru/rasp/faculty/492430598?course=" + str(i)
        response = requests.get(url)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            group_list = soup.select(".group-catalog__groups > a")

            for group in group_list:
                group_name = group.text
                group_link = "/rasp" + group['href'][group['href'].find('?'):]
                groups_result["groups"].append({
                    "name": group_name, 
                    "link": group_link
                })
    
    # Сохранение групп в отдельный файл
    with codecs.open("datagroups.json", "w", "utf-8") as groups_file:
        groups_file.write(json.dumps(groups_result, ensure_ascii=False, indent=2))


parser()