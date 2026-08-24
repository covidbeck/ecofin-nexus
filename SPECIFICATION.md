<!--
ПРИМЕЧАНИЕ: файл NEXUS_PRODUCT_SPECIFICATION.md не был найден в репозитории на момент
миграции. Эта спецификация восстановлена из нового README.md и постановки задачи
миграции и является действующим source of truth до замены оригинальным документом.
-->

# NEXUS — PRODUCT SPECIFICATION (Resource Decision Engine)

Nexus — explainable Resource Decision Engine для малого и среднего бизнеса.
Продукт превращает счета и операционные данные в объяснимый цифровой двойник
предприятия, проверяет отклонения, моделирует сценарии и рекомендует лучший из
**выполнимых** вариантов. Первый ресурс — электроэнергия; архитектура допускает
воду, тепло, газ, топливо и отходы без переработки ядра.

Старый продукт (Predictive Energy Management / ESG Underwriting: Damu eligibility,
фиксированный Scope 2 factor 0.892, KREM-тарифы как факты, «5 ИИ-агентов»,
tariff arbitrage без конфигурации тарифа) выведен из эксплуатации и не является
источником требований.

## 1. Принципы

1. **Детерминированная база.** Деньги, kWh, CO₂e, аномалии и оптимизация
   рассчитываются серверным математическим движком (`backend/app/math_engine/`).
   ИИ не выполняет арифметику, расчёт тарифов, CO₂e, аномалий или оптимизацию.
2. **Доказуемость.** У каждого существенного числа есть статус
   (`measured`, `confirmed`, `estimated`, `simulated`, `unavailable`), формула,
   входные данные, версия конфигурации и источник. Расчёты сохраняются в
   неизменяемых снимках (calculation snapshot).
3. **Честность к данным.** Нет подтверждённого тарифа, коэффициента выбросов или
   применимого бенчмарка — результат `unavailable` с объяснением, чего не хватает.
   Никаких выдуманных «реальных» тарифов, факторов, гарантий экономии или
   compliance-статусов.
4. **Ограничения — часть модели.** Нулевой CapEx, сохранение объёма производства,
   допустимый сдвиг графика и предел гибкой нагрузки — жёсткие условия оптимизации.
5. **API-first, модульный монолит.** Интерфейс не хранит авторитетные расчёты.
   Все данные изолированы по `organization_id`; авторизация и права проверяются
   на сервере.
6. **Безопасный fallback.** Любой сбой внешнего OCR/ИИ ведёт к ручному вводу или
   детерминированным демонстрационным данным (явно помеченным `demo`), а не к
   правдоподобной подделке.

## 2. Технологии

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4,
  TanStack React Query, Recharts.
- **Backend:** Python 3.12, FastAPI, Pydantic 2, SQLAlchemy 2, Alembic, PostgreSQL 16.
- **Интеграции:** OCR/LLM — заменяемые адаптеры (извлечение полей счёта,
  объяснение подтверждённых расчётов, Copilot). Каждый вызов обёрнут в
  try/except с безопасным fallback.
- **Auth:** email + пароль (PBKDF2-HMAC-SHA256, ≥200k итераций), opaque
  session-токены в БД, Bearer-заголовок. Без OAuth и внешних identity providers.

## 3. Доменная модель

| Сущность | Ключевые поля |
| --- | --- |
| User | email (unique), password_hash, name, role, organization_id |
| Organization | name, business_profile, region, currency, timezone, drivers (JSON), constraints (JSON) |
| SessionToken | token, user_id, expires_at |
| ConsumptionRecord | organization_id, period_start/end, kwh, cost, fixed_charges, effective_rate, data_quality (measured/estimated), source (upload/manual/demo), status (draft/confirmed) |
| TariffConfig | organization_id, structure JSON (flat / time-of-use), source, valid_from/to, status (draft/approved), version |
| EmissionFactor | organization_id, value, unit (kg CO2e/kWh), source, valid_from/to, status (draft/approved) |
| Scenario | organization_id, base record, actions JSON, result snapshot JSON |
| Subscription | organization_id, plan (free/pro/business), cycle, status |

Тарифы, коэффициенты выбросов, отраслевые бенчмарки и коэффициенты экономии —
только конфигурируемые, версионируемые записи с источником, датой действия и
статусом. Демо-данные помечены источником `demo fixture`.

## 4. Математический движок (`backend/app/math_engine/`)

Все функции — чистый детерминированный Python, покрытый unit-тестами.

**Стоимость и эффективная ставка** (`costs.py`)

C_t = E_t × r_t + F_t;  r_eff = (C_t − F_t) / E_t, E_t > 0.
Для ступенчатых/time-of-use тарифов — только утверждённая версионируемая
конфигурация.

**Нормализация и историческая база** (`baseline.py`)

I_t = E_t / D_t (D_t — драйвер профиля: площадь, выпуск, гости);
B_hist = median(E_{t−1..t−n}); A_base = (E_t − B_t) / B_t.
Неприменимый бенчмарк не используется.

**Validation и аномалии** (`validation.py`, `anomalies.py`)

Проверки согласованности записи (положительность, C ≈ E×r+F при известном
тарифе). Аномалии: period-over-period и baseline deviation с порогами,
доказательством (значения, формула) и статусом.

**CO₂e** (`carbon.py`)

M_t = E_t × G_t; ΔM = (E_base − E_scen) × G_t — только при утверждённом
emission factor (значение + единица + источник + срок действия). Иначе
`unavailable`.

**Сценарии** (`scenario.py`)

E_scen = E_base − Σ s_i x_i + Σ_{i<j} γ_ij x_i x_j, где s_i и γ_ij берутся из
версионируемого каталога действий (статус `estimated`, источник указан),
0 ≤ x_i ≤ 1.

**Ограничения** (`constraints.py`)

Бюджет CapEx, минимальный выпуск, допустимый сдвиг графика, предел гибкой
нагрузки, технологические границы. Недопустимый вариант возвращается с причиной.

**Оптимизация** (`optimizer.py`)

MVP — перебор дискретных уровней действий (x_i ∈ {0, 0.5, 1}):
max Z = (C_base − C_scen(x)) − λ_risk·R(x) − λ_effort·H(x)
при всех ограничениях. Возвращаются best feasible scenario, ранжирование и
причины отклонения недопустимых вариантов.

**Confidence и snapshot** (`confidence.py`, `snapshot.py`)

Детерминированная полоса уверенности по качеству данных; снимок расчёта:
версия движка, формулы, входы, версии конфигураций, выходы, время.

## 5. API (`/api/v1`)

| Группа | Маршруты |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Organization | `GET/PUT /organization/profile`, `GET/PUT /organization/tariff`, `GET/PUT /organization/emission-factor` |
| Bills | `POST /bills/upload` (extraction draft; сбой → `needs_manual_entry`) |
| Consumption | `POST /consumption` (подтверждение/ручной ввод), `GET /consumption`, `GET /consumption/{id}` |
| Digital Twin | `GET /dashboard?record_id=` — totals, effective rate, intensity, baseline, anomalies, CO₂e (или unavailable), data-quality badge, confidence band, assumptions, snapshot |
| Scenarios | `POST /scenarios`, `GET /scenarios`, `POST /scenarios/{id}/simulate`, `POST /scenarios/optimize` |
| Subscription | `GET /subscription/plans`, `GET /subscription`, `POST /subscription/checkout` (mock, без реального провайдера, без приёма карточных данных) |
| Copilot | `POST /copilot/chat` — только organization-scoped данные, read-only, детерминированный fallback |
| Demo | `POST /demo/seed` — явно помеченные демо-данные организации |
| Health | `GET /health` |

Все защищённые маршруты требуют Bearer session-токен; каждая выборка
фильтруется по `organization_id` текущего пользователя.

**Uploads:** максимум 10 MB; PDF, PNG, JPEG, WebP, DOCX. Превышение → 413,
неподдерживаемый тип → 415.

## 6. Golden Path (демо)

1. Регистрация → вход → защищённый кабинет.
2. Онбординг: профиль предприятия (тип, регион, валюта, часовой пояс),
   3–6 profile-dependent вопросов: драйвер, часы работы, гибкая нагрузка,
   ограничения (CapEx, выпуск, сдвиг графика).
3. Загрузка счёта → черновик извлечения → ручное подтверждение полей
   (или полностью ручной ввод / demo fixture).
4. Digital Twin dashboard за период: KZT, kWh, effective rate, CO₂e (если
   фактор утверждён), качество данных, ключевая аномалия с доказательством.
5. Scenario simulator: изменение параметров → сравнение current vs scenario.
6. Optimizer: best feasible scenario + план действий + причины отклонений.
7. Evidence & assumptions: формулы, источники, версии конфигураций, маркировки
   `measured / estimated / simulated / unavailable`.

## 7. Тарифные планы (server-side config, mock checkout)

| План | Месяц | Год (−20%) | Возможности |
| --- | --- | --- | --- |
| Free | 0 ₸ | 0 ₸ | 1 счёт/мес, digital twin, 1 активный сценарий |
| Pro | 7 500 ₸ | 72 000 ₸ | 15 счетов/мес, оптимизатор, экспорт снимков расчётов |
| Business | 50 000 ₸ | 480 000 ₸ | Без лимитов, несколько пользователей, приоритетная поддержка |

Entitlements проверяются на сервере. Оплата в MVP — демонстрационная: реквизиты
карт не собираются и не передаются.

## 8. Дизайн продукта

Premium B2B workspace: глубокие emerald/slate тона, ясная типографика, карточки
с воздухом, доступные loading/empty/error states. Главный экран отвечает на
вопрос: «Что требует внимания и какое действие лучше сделать следующим?»
Онбординг — 3–6 вопросов. В симуляторе видны цель, активные ограничения,
причины недопустимых вариантов и маркировка «оценка/симуляция, не гарантия».

## 9. Ограничения MVP

- Один пользователь на организацию (role=owner); RBAC-каркас заложен.
- Оптимизатор — перебор дискретных уровней; непрерывная оптимизация позже.
- Файлы счетов не сохраняются в постоянное хранилище (обрабатываются в памяти).
- Alembic-миграции не инициализированы; схема создаётся `create_all` (без
  destructive reset).
- Copilot — FAQ + LLM-объяснения подтверждённых чисел; без записи в данные.
