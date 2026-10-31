# Структура проекта (стандарт для DT, NLT и CLT)

```
index.html
README.md
STRUCTURE.md
config/
  config.json              ЕДИНСТВЕННОЕ место настроек по умолчанию
docs/
  readme/                  README.<lang>.md и img/ (картинки для README)
  help/                    help.<lang>.html (появится на шаге справки)
assets/
  icons/                   icon_CLT_<ширина>x<высота>.png
src/
  i18n/                    <lang>.json (тексты интерфейса)
  vocabs/                  <lang>.json (слова для времени: часы и все минуты 0-59)
  css/                     style.css, themes.css
  js/
    main.js                точка входа: создаёт модули и связывает их
    core/                  основа: config, event-bus, event-types, i18n, store, utils
    features/              возможности: app, ui, speaker, voices, wake-lock, playback,
                           time-dict (загрузка словарей), time-phrase (движок фраз времени)
```

## Правила

- Настройки по умолчанию: только `config/config.json`. В коде значений по умолчанию нет. Блок `mobile` переопределяет значения на телефонах и планшетах.
- Настройки пользователя: localStorage, ключ `CLT-settings`.
- Версия приложения: `APP_VERSION` в `src/js/core/config.js`; меняется при каждом изменении.
- JS: ES-модули, без глобальных переменных. Модули общаются через event-bus.
- Языки интерфейса и словарей: `UI_LANGS` в `core/config.js`.
- Ключ localStorage: `STORAGE_KEY` в `core/config.js`.
- Нет inline-обработчиков (`onclick`) и inline-стилей в HTML.
- Случайное время: минуты с шагом 5; словари содержат все минуты 0-59.
- Приложение нужно открывать по HTTP (`fetch` не работает с `file://`).

## Шаги работы

1. Структура папок, пути, конфиг, чистка, исправление ошибок. (готово, версия 1.4.1)
2. Код на ES-модули (core/ и features/), движок фраз времени отдельным модулем. (готово, версия 1.4.2)
3. Темы 9 палитр × 4 режима, `CLTThemeRegistry`, `theme-boot.js`, разбивка CSS.
4. Верхняя строка, окно справки, окно настроек (настройки пока и на главной странице), SVG-иконки.
5. Языки интерфейса (13), справка, README.
