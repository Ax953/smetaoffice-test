# DNS-план SmetaOffice

## Домены SmetaGroup

| Домен | Назначение |
|---|---|
| `smetagroup.ru` | официальный сайт компании |
| `smetago.com` | клиентское приложение SmetaGO |
| `smeta.group` | контур SmetaOffice / внутренняя система |

## Текущее состояние

| Адрес | Назначение | Статус |
|---|---|---|
| `test.smeta.group` | тестовая сборка SmetaOffice на GitHub Pages | работает |
| `office.smeta.group` | будущая официальная Node-версия | ждёт адрес хостинга |
| `smeta.group` | корневой домен | пока не трогаем |

## Почему official нельзя держать только на GitHub Pages

GitHub Pages отдаёт только статические файлы. Для SmetaOffice нужны:

- серверная авторизация;
- API;
- сохранение проектов/пользователей/исполнителей;
- права доступа на backend;
- будущая интеграция Bitrix24;
- база данных.

Поэтому официальный контур должен идти на Node-хостинг.

## DNS-запись после создания хостинга

Когда хостинг выдаст адрес приложения, например:

```text
smetaoffice-official.onrender.com
```

в REG.RU для `smeta.group` нужно добавить:

```text
office CNAME smetaoffice-official.onrender.com
```

После этого официальный адрес будет:

```text
https://office.smeta.group
```

Если позже решим использовать корневой домен:

```text
https://smeta.group
```

тогда уже отдельно настраиваем root/apex record по правилам конкретного хостинга.
