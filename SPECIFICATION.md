# PRODUCT SPECIFICATION & SYSTEM ARCHITECTURE

## Platform: Nexus (Predictive Energy Management & ESG Underwriting)

**Target:** Future Minds Hackathon 2026 (EcoFin Track)

**Objective:** B2B SaaS for Kazakhstani SMEs that turns utility bills (PDFs/photos) into zero-CapEx energy savings, automated Scope 2 ESG reports, and subsidised Green Loan applications for Fund "Damu".

## 1. TECH STACK & SYSTEM DIRECTORIES

```
ecofin-nexus/
├── backend/
│   ├── alembic/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── math_engine/          # Zero LLM Math only
│   │   │   ├── load_approximator.py   # Model A
│   │   │   ├── arbitrage.py           # Model B
│   │   │   ├── carbon_engine.py       # Model C
│   │   │   └── esg_scoring.py         # Model D
│   │   ├── models/
│   │   ├── schemas/
│   │   └── services/             # 5 AI agents (Gemini) — text/extraction only
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── package.json
│   └── Dockerfile
├── .cursorrules
├── SPECIFICATION.md
├── docker-compose.yml
└── README.md
```

**Backend:** Python 3.12, FastAPI, SQLAlchemy 2, Alembic, Pydantic 2, PostgreSQL 16  
**Frontend:** Next.js App Router, React 19, TypeScript, Tailwind (emerald / slate), TanStack React Query, Recharts

## 2. DETERMINISTIC MATHEMATICAL ENGINE (Zero LLM Math)

All arithmetic lives in `backend/app/math_engine/` as pure Python. LLMs never compute.

### Model A — Hourly load profile

\[
E_h = \frac{E_{month}}{D_{month}} \cdot w_h
\]

\(w_h\) is a 24-hour industry weight vector from fixtures (sum = 1).

### Model B — Tariff arbitrage (peak → night)

\[
\Delta C = \sum_{h \in Peak} E_{flex,h} \cdot (R_{peak} - R_{night})
\]

### Model C — Scope 2 avoided emissions

Kazakhstan grid factor \(EF_{grid}^{KZ} = 0.892\) t CO₂ / MWh \(= 0.000892\) t CO₂ / kWh:

\[
\Delta E_{Scope2} = \Delta E_{kWh} \cdot EF_{grid}^{KZ}
\]

(Implement as \(\Delta E_{kWh} / 1000 \times 0.892\) tonnes.)

### Model D — ESG gap / Damu eligibility

\[
I_{gap} = \frac{E_{base} - E_{opt}}{E_{base}}
\]

If \(I_{gap} \ge 0.20\), status is **Eligible** (Damu green loan 7–8%).

## 3. MULTI-AGENT AI ARCHITECTURE (5 agents)

LLMs extract, frame, and answer FAQs. They do not calculate.

1. **Data Parser** — PDF / image / DOCX (max 10 MB) → `UtilityBillInputSchema`. Extraction only.
2. **Roadmap Generator** — math JSON (\(\Delta C\), shifted kWh, peak hours) → 3–5 operational steps.
3. **Insights & ESG Framer** — Scope 2 + \(I_{gap}\) → Damu executive summary.
4. **Anomaly Questions** — if night/spike anomalies in math output → clarifying prompt to the user.
5. **Virtual Consultant** — in-app FAQ widget (ROI 15–30%, coal-grid impact, file formats).

Every LLM call: try/except + deterministic fallback (never crash the demo).

## 4. KAZAKHSTAN REGULATORY & TARIFF MATRIX (2026)

- **1 MRP (2026):** 4,325 KZT
- **Astana (AstanaEnergosbyt / Astana-REK):** commercial electricity 31.45–35.72 KZT/kWh excl. VAT; heat 6,324.78 KZT/Gcal (metered) vs 8,222.21 KZT/Gcal (unmetered, excl. VAT)
- **Almaty (AZhK / EnergoSbyt):** commercial electricity 39.87 KZT/kWh excl. VAT / 46.25 KZT/kWh incl. VAT
- **KoAP RK:** 5% surcharge on excess consumption above normative baseline
- **Scope 2 EF:** 0.892 t CO₂/MWh

Time-of-use zones for Model B (fixtures): peak 19:00–23:00, day 07:00–19:00, night 23:00–07:00. Zone rates are derived from the 2026 commercial bands above (peak = high band, day = base, night = discounted night band).

## 5. BUSINESS MODEL (MVP display)

| Tier | Monthly | Annual (−20%) | Quota |
| --- | --- | --- | --- |
| Freemium | 0 ₸ | 0 ₸ | 1 document/month |
| Nexus Pro | 7,500 ₸ | 72,000 ₸ | 15 documents/month |
| ESG Bridge | 50,000 ₸ | 480,000 ₸ | Unlimited + Damu package |

No payment gateway in MVP.

## 6. GOLDEN PATH

1. Onboard: bakery / catering, region Astana or Almaty (loads KREM 2026 fixtures).
2. Upload bill: PDF, PNG, JPG, WebP, DOCX, max 10 MB.
3. Agent 1 extracts DTO → Pydantic validate → math_engine A–D.
4. Agents 2–3 frame roadmap + Damu summary from math JSON only.
5. UI: dropzone, Recharts hourly profile, savings, ESG badge, support widget.
