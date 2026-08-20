import Link from "next/link";

const STEPS = [
  {
    title: "Загрузка квитанции",
    text: "PDF-счёт или фото бумажной квитанции. Никакого оборудования, датчиков и монтажа.",
  },
  {
    title: "Детерминированная аналитика",
    text: "Расчёты выполняет проверяемое математическое ядро: тарифный арбитраж, почасовой профиль, потенциал экономии.",
  },
  {
    title: "Scope 2 и «Даму»",
    text: "Сэкономленные киловатты переводятся в предотвращённые выбросы CO₂ и в пакет для оценки зелёного финансирования.",
  },
];

const VALUES = [
  { metric: "10–30%", label: "потенциал снижения затрат на энергию для МСБ" },
  { metric: "0 ₸", label: "капитальных вложений: только квитанция, без IoT" },
  { metric: "Scope 2", label: "учёт косвенных выбросов по GHG Protocol" },
];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 pt-16 pb-24">
      <section className="text-center">
        <p className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">
          О платформе
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Nexus превращает киловатты в чистую прибыль
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-500">
          Предиктивный энергоменеджмент и ESG-андеррайтинг для малого и среднего бизнеса
          Казахстана. Мы заменяем дорогое оборудование алгоритмами и делаем экономию измеримой.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/register"
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            Попробовать демо
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Войти
          </Link>
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-center text-sm font-semibold tracking-wide text-slate-400 uppercase">
          Проблема, которую мы решаем
        </h2>
        <p className="mx-auto mt-4 max-w-3xl text-center text-base leading-7 text-slate-600">
          Большинство предприятий МСБ не внедряют энергоменеджмент из-за высокого порога входа:
          классические решения требуют закупки счётчиков, SCADA и промышленных датчиков.
          Для бизнеса с тонкой маржой это неподъёмные вложения. Nexus снимает этот барьер.
        </p>
      </section>

      <section className="mt-14 grid gap-4 sm:grid-cols-3">
        {VALUES.map((value) => (
          <div key={value.label} className="card p-6 text-center">
            <p className="text-3xl font-semibold text-emerald-600">{value.metric}</p>
            <p className="mt-2 text-sm text-slate-500">{value.label}</p>
          </div>
        ))}
      </section>

      <section className="mt-16">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-slate-900">
          Как это работает
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.title} className="card p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                {index + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 rounded-2xl bg-emerald-600 px-8 py-12 text-center">
        <h2 className="text-2xl font-semibold text-white">Готовы увидеть свою экономию?</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-emerald-50">
          Загрузите одну квитанцию и получите разбор за секунды. Оценка носит рекомендательный
          характер и не гарантирует одобрение кредита или субсидии.
        </p>
        <Link
          href="/register"
          className="mt-6 inline-flex rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
        >
          Начать бесплатно
        </Link>
      </section>
    </main>
  );
}
