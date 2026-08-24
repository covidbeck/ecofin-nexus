import Link from "next/link";

import { DemoLoginButton } from "@/components/demo-login-button";

const PILLARS = [
  {
    title: "Объяснимый цифровой двойник",
    text: "Счета и подтверждённые данные превращаются в модель предприятия: стоимость, потребление, эффективная ставка, интенсивность и историческая база — с источником у каждого числа.",
  },
  {
    title: "Аномалии с доказательствами",
    text: "Детерминированные проверки к прошлому периоду и исторической базе. Никаких «чёрных ящиков»: у каждой аномалии есть формула и числа.",
  },
  {
    title: "Сценарии и лучший выполнимый план",
    text: "Симулятор действий с проверкой ограничений (бюджет, график, производство) и перебором вариантов. Nexus рекомендует лучший из выполнимых, а не идеальный на бумаге.",
  },
];

const HONESTY = [
  ["measured", "подтверждено данными счёта или ручным вводом"],
  ["estimated", "оценка с явным допущением"],
  ["simulated", "результат симуляции сценария"],
  ["unavailable", "данных или утверждённой конфигурации нет — число не выдумывается"],
];

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 pb-24">
      <section className="landing-panel mt-10 px-6 py-16 text-center sm:px-10 sm:py-20">
        <span className="mb-5 inline-block rounded-full border border-emerald-800 bg-lime-200 px-4 py-1.5 text-xs font-semibold tracking-wide text-emerald-950">
          Resource Decision Engine для малого и среднего бизнеса
        </span>
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-emerald-950 sm:text-5xl">
          Решения по ресурсам, которым можно доверять
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-emerald-900">
          Nexus превращает счета за электроэнергию в объяснимый цифровой двойник
          предприятия: проверяет отклонения, моделирует сценарии и рекомендует лучший из
          выполнимых вариантов. Каждое число имеет источник, статус и снимок расчёта.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <DemoLoginButton className="btn-primary px-6 py-3 text-sm" tone="on-light" />
          <Link href="/register" className="btn-secondary px-6 py-3 text-sm">
            Начать бесплатно
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full border border-emerald-800 bg-white px-6 py-3 text-sm font-semibold text-emerald-950 transition hover:-translate-y-0.5 hover:bg-lime-100"
          >
            Войти
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-3">
        {PILLARS.map((pillar) => (
          <div key={pillar.title} className="landing-panel p-6">
            <h2 className="mb-2 text-base font-semibold text-emerald-950">{pillar.title}</h2>
            <p className="text-sm leading-relaxed text-emerald-900">{pillar.text}</p>
          </div>
        ))}
      </section>

      <section className="landing-panel mt-16 grid gap-8 p-8 md:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold text-emerald-950">Как это работает</h2>
          <ol className="mt-4 flex list-decimal flex-col gap-3 pl-5 text-sm leading-relaxed text-emerald-900">
            <li>Регистрация и короткий онбординг: тип предприятия, регион, ограничения.</li>
            <li>
              Загрузка счёта (PDF, PNG, JPEG, WebP, DOCX до 10 МБ) — ИИ извлекает поля, вы
              подтверждаете. Ручной ввод всегда доступен.
            </li>
            <li>
              Дашборд-двойник: стоимость, кВт·ч, эффективная ставка, CO₂e (только при
              утверждённом факторе), аномалии с доказательствами.
            </li>
            <li>
              Сценарии: действия из версионируемого каталога, проверка ограничений и лучший
              выполнимый план с доверительным интервалом.
            </li>
          </ol>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-emerald-950">Принцип честных данных</h2>
          <p className="mt-2 text-sm leading-relaxed text-emerald-900">
            ИИ в Nexus не считает числа: вся математика — детерминированный серверный слой.
            Каждое значение помечено статусом:
          </p>
          <ul className="mt-4 flex flex-col gap-2">
            {HONESTY.map(([label, text]) => (
              <li key={label} className="flex items-start gap-3 text-sm text-emerald-900">
                <code className="rounded-full bg-lime-200 px-2 py-0.5 text-xs text-emerald-950">
                  {label}
                </code>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="mt-16 border-t border-emerald-800 pt-8 text-center text-xs text-emerald-900">
        Nexus MVP · симуляции не являются гарантией экономии; результаты зависят от ваших
        данных и подтверждённых конфигураций.
      </footer>
    </main>
  );
}
