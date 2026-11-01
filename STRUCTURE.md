# Структура проекта (стандарт для DT, NLT и CLT)

```
index.html
README.md
STRUCTURE.md
config/
  config.json              ЕДИНСТВЕННОЕ место настроек по умолчанию
docs/
  readme/                  README.<lang>.md и img/ (картинки для README)
  help/                    help.<lang>.html (справка, 13 языков, формат как у DT)
    img/                   скриншоты справки (добавляются вручную; нет файла - серая заглушка с именем файла):
                           main-overview.png, playing.png, settings-window.png
assets/
  icons/                   icon_CLT_<ширина>x<высота>.png
src/
  i18n/                    <lang>.json (тексты интерфейса, 13 языков)
  vocabs/                  <lang>.json (слова для времени: часы и все минуты 0-59; 10 языков, без cs, es, it)
  css/
    main.css               список подключения файлов (порядок важен: themes.css последним)
    base.css               переменные, цвета по умолчанию, базовые элементы (как у DT)
    main-screen.css        верхняя строка: справка, настройки, режим (как у DT)
    clock.css              строки со временем, кнопки, блок настроек главной страницы
    settings-window.css    окно настроек: плоские панели (как у DT), сброс
    developer.css, modals.css, responsive.css (576 / 640 / 992 px), help.css (как у DT)
    themes.css             общий с DT
  js/
    theme-boot.js          обычный скрипт: тема до первой отрисовки
    main.js                точка входа: создаёт модули и связывает их
    core/                  основа: config, event-bus, event-types, i18n, store, theme-registry, utils
    features/              возможности: app, ui (+ ui-theme, ui-help, ui-settings-window, ui-mirrors), speaker, voices, wake-lock, playback,
                           time-dict (загрузка словарей), time-phrase (движок фраз времени)
```

## Правила

- Настройки по умолчанию: только `config/config.json`. В коде значений по умолчанию нет. Блок `mobile` переопределяет значения на телефонах и планшетах.
- Настройки пользователя: localStorage, ключ `CLT-settings`.
- Версия приложения: `APP_VERSION` в `src/js/core/config.js`; меняется при каждом изменении.
- JS: ES-модули, без глобальных переменных. Модули общаются через event-bus.
- Языки интерфейса: `UI_LANGS`; языки со словарём времени: `TIME_LANGS` (оба в `core/config.js`). Язык озвучки выбирается только из `TIME_LANGS`.
- Ключ localStorage: `STORAGE_KEY` в `core/config.js`.
- Число строк со временем: `rows` в `config/config.json` (1-15); строки создаёт `ui.buildRows`.
- Высота кнопок под строками времени постоянна (30px); блок с кнопками чуть выше кнопок.
- Окно настроек: копии настроек главной страницы (`data-mirror-of="<id оригинала>"`); логика только у оригиналов.
- Тема: `thema` (например `theme-warmorange-normal`) в `config/config.json`. Тема по умолчанию в `theme-boot.js` и `core/theme-registry.js` (`DEFAULT_THEME`) должна совпадать с ней.
- Нет inline-обработчиков (`onclick`) и inline-стилей в HTML.
- Случайное время: минуты с шагом 5; словари содержат все минуты 0-59.
- Приложение нужно открывать по HTTP (`fetch` не работает с `file://`).

## Шаги работы

1. Структура папок, пути, конфиг, чистка, исправление ошибок. (готово, версия 1.4.1)
2. Код на ES-модули (core/ и features/), движок фраз времени отдельным модулем. (готово, версия 1.4.2)
3. Темы (палитры × 4 режима), `theme-registry`, `theme-boot.js`, `main.css`, выбор палитры и режима. (готово, версия 1.4.3)
4. Верхняя строка, окно справки, окно настроек (настройки пока и на главной странице), SVG-иконки. (готово, версия 1.4.4)
5. Языки интерфейса (13), справка, README. (готово, версия 1.4.6; стили приведены к DT 2.5.10)
