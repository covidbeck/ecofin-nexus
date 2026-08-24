# Nexus — Frontend UI/UX Specification (Resource Decision Engine)

Дополняет SPECIFICATION.md. Старый UX (Damu, «Zero-CapEx AI Энергоаудит»,
фиксированные KREM-тарифы, ESG Bridge, «5 агентов») удалён.

## 1. Дизайн-система

- **Бренд:** Nexus. Premium B2B workspace.
- **Палитра:** глубокие emerald (`emerald-600/700/800`) и slate (`slate-50…900`),
  фон `slate-50`/белый, карточки white + `rounded-xl` + `border-gray-200` +
  `shadow-sm`, много воздуха.
- **Статусы данных** — обязательные бейджи на каждом существенном числе:
  `measured` (изумрудный), `confirmed` (изумрудный контур), `estimated` (янтарный),
  `simulated` (синий), `unavailable` (серый + объяснение, чего не хватает).
- Доступные loading / empty / error states; белых экранов быть не должно.
- Никаких обещаний гарантированной экономии, автоматического одобрения
  финансирования или несуществующих интеграций.

## 2. Маршруты

| Маршрут | Доступ | Содержание |
| --- | --- | --- |
| `/` | публичный | Landing: ценность Nexus (от счёта к выполнимому плану), как это работает, CTA |
| `/login`, `/register` | публичный | Вход / регистрация (имя, компания, email, пароль) через backend API |
| `/onboarding` | защищённый | Профиль предприятия: тип, регион/валюта/часовой пояс, драйвер, часы работы, гибкая нагрузка, ограничения (CapEx, выпуск, сдвиг графика) |
| `/dashboard` | защищённый | Digital Twin: карточки KZT / kWh / CO₂e (или unavailable), data-quality badge, ключевая аномалия с доказательством, current vs scenario, best feasible scenario, план действий, allowances/assumptions |
| `/bills` | защищённый | Upload (drag-and-drop, ≤10 MB, PDF/PNG/JPEG/WebP/DOCX) → review извлечённых полей → подтверждение; ручной ввод как fallback; список записей потребления |
| `/scenarios` | защищённый | Симулятор: параметры действий, активные ограничения, причины недопустимых вариантов, сравнение с базой, запуск оптимизатора |
| `/subscription` | защищённый | Планы Free / Pro / Business с сервера, переключатель месяц/год, mock-checkout (реквизиты карт не отправляются) |
| `/profile` | защищённый | Компания, профиль, текущий план, управление сессией, выход |

Редиректы: `/analytics` → `/dashboard`, `/pricing` → `/subscription`,
`/about` → `/`.

## 3. Главный экран (Digital Twin)

Отвечает на вопрос: **«Что требует внимания и какое действие лучше сделать
следующим?»** Обязательные блоки:

1. Текущие KZT, kWh и CO₂e (CO₂e — только при утверждённом emission factor,
   иначе `unavailable` с объяснением и ссылкой на настройку фактора).
2. Data-quality / confidence badge (полоса уверенности из backend).
3. Одна ключевая аномалия с доказательством (значения, база, формула).
4. Сравнение current vs scenario.
5. Best feasible scenario + план действий.
6. Evidence & assumptions drawer: допущения, источники, версии конфигураций,
   формулы, маркировки `measured / estimated / simulated / unavailable`.

## 4. Copilot

Плавающий виджет: организация-scoped вопросы, объяснение подтверждённых
расчётов, FAQ. Не изменяет данные; при сбое LLM — детерминированный ответ.

## 5. Технические требования

- Next.js App Router + TypeScript + Tailwind + TanStack React Query.
- API-клиенты в `frontend/lib/api.ts`, строгая типизация в `frontend/lib/types.ts`.
- Токен сессии — Bearer из localStorage; все защищённые запросы через общий клиент.
- Никакой арифметики на клиенте: все числа приходят из backend.
- Клиентская валидация загрузки: ≤10 MB, допустимые расширения; ошибки — toast.
