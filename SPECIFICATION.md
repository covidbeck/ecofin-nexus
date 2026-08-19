PRODUCT SPECIFICATION & ARCHITECTURE (EcoFin Nexus)
Target: Future Minds Hackathon 2026 (EcoFin Track).
Role: AI Assistant (Cursor). You are a Senior Full-Stack Engineer and System Architect.
Objective: Build an MVP for a B2B SaaS platform that provides automated ESG-underwriting and predictive resource arbitrage for SMEs in Kazakhstan, reducing CapEx to zero by approximating PDF utility bills into hourly load profiles.

1. STRICT DEVELOPMENT RULES (GOLDEN RULES)
Zero LLM Math: The AI/LLM must NEVER perform mathematical calculations, aggregations, or financial projections. ALL math is strictly deterministic and must live inside backend/app/math_engine/ using pure Python.

AI as Extraction Layer: LLM APIs (OpenAI/Gemini) are used EXCLUSIVELY to parse unstructured data (PDF bills) into strict JSON schemas. All LLM outputs must be validated via Pydantic (backend/app/schemas/).

API-First Design: Before writing any business logic, write the Pydantic request/response schemas. Frontend (Next.js) and Backend (FastAPI) communicate strictly via these contracts.

Scope Control (MVP Only): Do not implement OAuth, complex email verifications, or payment gateways. Use simple JWT auth. Do not over-engineer. Focus on the core Golden Path.

2. TECH STACK
Backend: Python 3.12, FastAPI, SQLAlchemy 2, Alembic, Pydantic 2, PostgreSQL.

Frontend: Next.js (App Router), React 19, TypeScript, Tailwind CSS, React Query.

Infrastructure: Docker Compose (local development).

3. CORE ARCHITECTURE & DIRECTORY STRUCTUREtext
ecofin-nexus/
├── backend/
│   ├── alembic/                 # Database migrations
│   ├── app/
│   │   ├── api/                 # REST endpoints (routes)
│   │   ├── core/                # Config, security, DB session
│   │   ├── db/                  # Fixtures (e.g., KREM tariffs JSON)
│   │   ├── math_engine/         # Pure Python math models (Zero LLM)
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── schemas/             # Pydantic DTOs
│   │   └── services/            # Business logic & AI API wrappers
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/                     # Next.js pages & layout
│   ├── components/              # UI components
│   ├── lib/                     # API clients, React Query, Types
│   ├── package.json
│   └── Dockerfile
├── .gitignore
├── docker-compose.yml
└── README.md
## 4. MATHEMATICAL ENGINE SPECIFICATION
Implement these exact models in `backend/app/math_engine/` using Python.

**Model A: Hourly Approximation from Monthly PDF**
Given monthly consumption $E_{month}$ and days $D_{month}$, approximate hourly load $E_h$ using a predefined weight vector $w_h$ from business fixtures:
$E_h = \frac{E_{month}}{D_{month}} \cdot w_h$

**Model B: Tariff Arbitrage (Peak-Load Shifting)**
Calculate daily savings $\Delta C$ by shifting flexible load $E_{flex,h}$ from Peak to Night tariff zones ($R_{peak}$ and $R_{night}$):
$\Delta C = \sum_{h \in Peak} E_{flex,h} \cdot (R_{peak} - R_{night})$

**Model C: Scope 2 Carbon Emissions (GHG Protocol)**
Convert saved energy $\Delta E_{kWh}$ into avoided $CO_2$ emissions using Kazakhstan's grid factor $EF_{grid}^{KZ} = 0.892$:
$\Delta E_{Scope2} = \Delta E_{kWh} \cdot EF_{grid}^{KZ}$

**Model D: ESG Green Taxonomy Gap**
Calculate efficiency improvement $I_{gap}$ to qualify for Damu Fund green loans (requires $\ge 0.20$):
$I_{gap} = \frac{E_{base} - E_{opt}}{E_{base}}$

## 5. USER GOLDEN PATH (What must work for the Demo)
1. User registers/logs in as "Bakery Owner".
2. User uploads a PDF utility bill.
3. Backend calls AI Service (Extraction) -> gets Pydantic validated JSON (KWh, Costs).
4. Backend runs `math_engine` to approximate hourly load and calculate $\Delta C$ (Arbitrage) and $\Delta E_{Scope2}$.
5. Frontend displays a Dashboard with savings, graphs, and an "ESG Eligibility Status" badge.