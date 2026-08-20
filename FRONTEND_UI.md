# Nexus B2B SaaS Frontend UI/UX Specification

## 1. Global Layout & Branding
- **App Name:** Nexus
- **Color Palette:** Deep Emerald Green. Primary dark: `#0d3829`, Accent: `#10b981`. Backgrounds: Premium light or dark mode with soft Glassmorphism on the Navbar.
- **Navbar:** Tabs should be: "Аналитика ресурсов", "Тарифы и подписка", "Профиль компании".

## 2. Dashboard & Smart Upload Zone (`/dashboard`)
- **Hero Title:** "Zero-CapEx AI Энергоаудит"
- **Subtitle:** "Загрузите PDF-счет или фото квитанции. Наш алгоритм за 3 секунды найдет скрытые переплаты, перекосы фаз и оптимизирует ваш тарифный план."
- **Dropzone:** Large drag-and-drop area. Client-side validation: Max 10MB, accepts `.pdf, .png, .jpg, .jpeg, .webp, .docx, .doc`. Error toast if invalid.
- **Results:** Display data beautifully using Recharts with Optional Chaining (`?.`) to prevent white screens on null data.

## 3. SaaS Pricing Matrix (`/pricing`)
- Interactive toggle: "Ежемесячно / За год (Скидка 20%)".
- **Card 1 (Freemium):** 0 ₸. 1 audit/month.
- **Card 2 (Nexus Pro):** 7 500 ₸/мес. Highlight as "Популярный выбор". Unlimited uploads, Code RK penalty protection.
- **Card 3 (ESG Bridge):** 50 000 ₸ (разово). Scope 2 reporting, Damu green loan application.
- **Action:** Buttons trigger `POST /api/v1/subscribe` mock endpoint.

## 4. Demo Profile (`/profile`)
- Hardcoded mock data: Пекарня-кондитерская «Tandyr & Co», г. Астана, Владелец.
- **Badges:** "Верифицирован", "Сэкономлено: 1 020 000 ₸", "Снижен CO₂: 12 тонн".
- Fetch auth status from `GET /api/v1/profile/me`.

## 5. Floating AI FAQ Widget (Agent 5)
- **UI:** A floating circular button (`?`) fixed at `bottom-right`.
- **Chat Window:** Opens "Nexus AI Ассистент".
- **Quick Prompts:**
  1. "Сколько я сэкономлю?"
  2. "Как мы помогаем экологии РК?"
  3. "Что такое ESG-отчет для Даму?"
- **Logic:** Quick buttons fetch from `GET /api/v1/faq`. Custom input sends to `POST /api/v1/chat`.
