"""Nexus API v1. All tenant routes require a Bearer session token and are
scoped by the authenticated user's organization_id."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_organization, get_current_user
from app.core.config import settings
from app.core.security import generate_session_token, hash_password, verify_password
from app.db.database import get_db
from app.math_engine.costs import effective_rate
from app.math_engine.validation import validate_record
from app.models import (
    ConsumptionRecord,
    EmissionFactor,
    Organization,
    Scenario,
    SessionToken,
    Subscription,
    TariffConfig,
    User,
)
from app.schemas.auth import (
    AuthResponseSchema,
    LoginRequestSchema,
    LogoutResponseSchema,
    OrganizationBriefSchema,
    RegisterRequestSchema,
    UserResponseSchema,
)
from app.schemas.common import HealthResponseSchema
from app.schemas.consumption import (
    BillUploadResponseSchema,
    ConsumptionCreateSchema,
    ConsumptionListSchema,
    ConsumptionRecordSchema,
)
from app.schemas.copilot import (
    CopilotRequestSchema,
    CopilotResponseSchema,
    FaqListResponseSchema,
)
from app.schemas.dashboard import DashboardResponseSchema
from app.schemas.organization import (
    ConfigStateSchema,
    ConstraintsSchema,
    DriverSchema,
    EmissionFactorSchema,
    OrganizationProfileSchema,
    OrganizationProfileUpdateSchema,
    TariffConfigSchema,
    TariffStructureSchema,
)
from app.schemas.scenario import (
    ActionCatalogSchema,
    ActionLevelSchema,
    OptimizationRequestSchema,
    OptimizationResponseSchema,
    ScenarioCreateSchema,
    ScenarioListSchema,
    ScenarioSchema,
    ScenarioUpdateSchema,
    SimulationResultSchema,
)
from app.schemas.subscription import (
    CheckoutRequestSchema,
    CheckoutResponseSchema,
    PlansResponseSchema,
    SubscriptionSchema,
)
from app.services.catalog import catalog_schema
from app.services.copilot import CopilotService
from app.services.demo import ensure_demo_workspace, seed_demo_data
from app.services.entitlements import (
    PLANS,
    ensure_can_add_record,
    ensure_optimizer_enabled,
    get_or_create_subscription,
    plan_for,
)
from app.services.extraction import BillExtractionService
from app.services.scenario_service import run_optimizer, simulate
from app.services.twin import (
    approved_emission_factor,
    approved_tariff,
    build_dashboard,
    record_schema,
)

router = APIRouter(prefix="/api/v1")
extraction_service = BillExtractionService()
copilot_service = CopilotService()

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "image/png",
    "image/jpeg",
    "image/webp",
}
MIME_ALIASES = {"image/jpg": "image/jpeg"}
EXT_TO_MIME = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".doc": "application/msword",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
}


# ---------------------------------------------------------------- helpers


def _user_response(user: User, organization: Organization) -> UserResponseSchema:
    return UserResponseSchema(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        organization=OrganizationBriefSchema(
            id=organization.id,
            name=organization.name,
            onboarding_complete=bool(organization.onboarding_complete),
        ),
    )


def _issue_session(db: Session, user: User) -> tuple[str, datetime]:
    token = generate_session_token()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.session_ttl_hours)
    db.add(SessionToken(token=token, user_id=user.id, expires_at=expires_at))
    db.commit()
    return token, expires_at


def _get_org_record(
    db: Session, organization_id: int, record_id: int
) -> ConsumptionRecord:
    record = db.scalar(
        select(ConsumptionRecord).where(
            ConsumptionRecord.id == record_id,
            ConsumptionRecord.organization_id == organization_id,
        )
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Запись потребления не найдена")
    return record


def resolve_content_type(upload: UploadFile) -> str:
    raw = MIME_ALIASES.get(
        (upload.content_type or "").lower(), (upload.content_type or "").lower()
    )
    if raw in ALLOWED_TYPES:
        return raw
    name = (upload.filename or "").lower()
    for ext, mime in EXT_TO_MIME.items():
        if name.endswith(ext):
            return mime
    return raw


# ---------------------------------------------------------------- health


@router.get("/health", response_model=HealthResponseSchema)
async def health() -> HealthResponseSchema:
    return HealthResponseSchema(status="ok", message="Nexus API is running")


# ---------------------------------------------------------------- auth


@router.post("/auth/register", response_model=AuthResponseSchema)
async def register(
    payload: RegisterRequestSchema, db: Session = Depends(get_db)
) -> AuthResponseSchema:
    email = payload.email.strip().lower()
    existing = db.scalar(select(User).where(User.email == email))
    if existing is not None:
        raise HTTPException(status_code=409, detail="Пользователь с таким email уже существует")

    organization = Organization(name=payload.organization_name.strip())
    db.add(organization)
    db.flush()
    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        name=payload.name.strip(),
        role="owner",
        organization_id=organization.id,
    )
    db.add(user)
    db.add(Subscription(organization_id=organization.id, plan="free"))
    db.commit()
    db.refresh(user)

    token, expires_at = _issue_session(db, user)
    return AuthResponseSchema(
        token=token,
        expires_at=expires_at.isoformat(),
        user=_user_response(user, organization),
    )


@router.post("/auth/login", response_model=AuthResponseSchema)
async def login(
    payload: LoginRequestSchema, db: Session = Depends(get_db)
) -> AuthResponseSchema:
    email = payload.email.strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    organization = db.get(Organization, user.organization_id)
    if organization is None:
        raise HTTPException(status_code=403, detail="Организация не найдена")

    token, expires_at = _issue_session(db, user)
    return AuthResponseSchema(
        token=token,
        expires_at=expires_at.isoformat(),
        user=_user_response(user, organization),
    )


@router.post("/auth/logout", response_model=LogoutResponseSchema)
async def logout(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LogoutResponseSchema:
    for session in db.scalars(select(SessionToken).where(SessionToken.user_id == user.id)):
        db.delete(session)
    db.commit()
    return LogoutResponseSchema(status="logged_out")


@router.get("/auth/me", response_model=UserResponseSchema)
async def me(
    user: User = Depends(get_current_user),
    organization: Organization = Depends(get_current_organization),
) -> UserResponseSchema:
    return _user_response(user, organization)


@router.post("/auth/demo-login", response_model=AuthResponseSchema)
async def demo_login(db: Session = Depends(get_db)) -> AuthResponseSchema:
    if not settings.demo_mode:
        raise HTTPException(status_code=404, detail="Демо-вход отключён.")
    user, organization = ensure_demo_workspace(db)
    token, expires_at = _issue_session(db, user)
    return AuthResponseSchema(
        token=token,
        expires_at=expires_at.isoformat(),
        user=_user_response(user, organization),
    )


# ---------------------------------------------------------------- organization


@router.get("/organization/profile", response_model=OrganizationProfileSchema)
async def get_profile(
    organization: Organization = Depends(get_current_organization),
) -> OrganizationProfileSchema:
    driver = None
    if organization.drivers and organization.drivers.get("type"):
        driver = DriverSchema(**organization.drivers)
    constraints = (
        ConstraintsSchema(**organization.constraints)
        if organization.constraints
        else ConstraintsSchema()
    )
    return OrganizationProfileSchema(
        name=organization.name,
        business_profile=organization.business_profile,  # type: ignore[arg-type]
        region=organization.region,
        currency=organization.currency,
        timezone=organization.timezone,
        driver=driver,
        constraints=constraints,
        onboarding_complete=bool(organization.onboarding_complete),
    )


@router.put("/organization/profile", response_model=OrganizationProfileSchema)
async def update_profile(
    payload: OrganizationProfileUpdateSchema,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> OrganizationProfileSchema:
    if payload.name is not None:
        organization.name = payload.name.strip()
    if payload.business_profile is not None:
        organization.business_profile = payload.business_profile
    if payload.region is not None:
        organization.region = payload.region.strip()
    if payload.currency is not None:
        organization.currency = payload.currency.strip().upper()
    if payload.timezone is not None:
        organization.timezone = payload.timezone.strip()
    if payload.driver is not None:
        organization.drivers = payload.driver.model_dump()
    if payload.constraints is not None:
        organization.constraints = payload.constraints.model_dump()
    if organization.business_profile and organization.constraints is not None:
        organization.onboarding_complete = 1
    db.commit()
    return await get_profile(organization)


@router.get("/organization/config", response_model=ConfigStateSchema)
async def get_config(
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> ConfigStateSchema:
    tariff = approved_tariff(db, organization.id)
    factor = approved_emission_factor(db, organization.id)
    return ConfigStateSchema(
        tariff=TariffConfigSchema(
            id=tariff.id,
            name=tariff.name,
            currency=tariff.currency,
            structure=TariffStructureSchema(**tariff.structure),
            source=tariff.source,
            valid_from=tariff.valid_from,
            valid_to=tariff.valid_to,
            status=tariff.status,  # type: ignore[arg-type]
            version=tariff.version,
        )
        if tariff
        else None,
        emission_factor=EmissionFactorSchema(
            id=factor.id,
            value_kg_per_kwh=factor.value_kg_per_kwh,
            unit=factor.unit,
            source=factor.source,
            valid_from=factor.valid_from,
            valid_to=factor.valid_to,
            status=factor.status,  # type: ignore[arg-type]
            version=factor.version,
        )
        if factor
        else None,
    )


@router.put("/organization/tariff", response_model=TariffConfigSchema)
async def put_tariff(
    payload: TariffConfigSchema,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> TariffConfigSchema:
    latest = db.scalar(
        select(TariffConfig)
        .where(TariffConfig.organization_id == organization.id)
        .order_by(TariffConfig.version.desc())
    )
    version = (latest.version + 1) if latest else 1
    tariff = TariffConfig(
        organization_id=organization.id,
        name=payload.name,
        currency=payload.currency,
        structure=payload.structure.model_dump(exclude_none=True),
        source=payload.source,
        valid_from=payload.valid_from,
        valid_to=payload.valid_to,
        status=payload.status,
        version=version,
    )
    db.add(tariff)
    db.commit()
    db.refresh(tariff)
    return payload.model_copy(update={"id": tariff.id, "version": version})


@router.put("/organization/emission-factor", response_model=EmissionFactorSchema)
async def put_emission_factor(
    payload: EmissionFactorSchema,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> EmissionFactorSchema:
    latest = db.scalar(
        select(EmissionFactor)
        .where(EmissionFactor.organization_id == organization.id)
        .order_by(EmissionFactor.version.desc())
    )
    version = (latest.version + 1) if latest else 1
    factor = EmissionFactor(
        organization_id=organization.id,
        value_kg_per_kwh=payload.value_kg_per_kwh,
        unit=payload.unit,
        source=payload.source,
        valid_from=payload.valid_from,
        valid_to=payload.valid_to,
        status=payload.status,
        version=version,
    )
    db.add(factor)
    db.commit()
    db.refresh(factor)
    return payload.model_copy(update={"id": factor.id, "version": version})


# ---------------------------------------------------------------- bills


@router.post("/bills/upload", response_model=BillUploadResponseSchema)
async def upload_bill(
    file: UploadFile = File(...),
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> BillUploadResponseSchema:
    ensure_can_add_record(db, organization.id)
    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Пустой файл")
    if len(payload) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Файл больше 10 МБ.")
    content_type = resolve_content_type(file)
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Неподдерживаемый формат. Используйте PDF, DOCX, PNG, JPEG или WebP.",
        )
    return await extraction_service.extract(payload, content_type)


# ---------------------------------------------------------------- consumption


@router.post("/consumption", response_model=ConsumptionRecordSchema)
async def create_consumption(
    payload: ConsumptionCreateSchema,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> ConsumptionRecordSchema:
    ensure_can_add_record(db, organization.id)
    period_days = (payload.period_end - payload.period_start).days + 1
    check = validate_record(
        payload.kwh, payload.cost_kzt, payload.fixed_charges_kzt, period_days
    )
    if not check.ok:
        raise HTTPException(status_code=422, detail="; ".join(check.issues))

    record = ConsumptionRecord(
        organization_id=organization.id,
        period_start=payload.period_start,
        period_end=payload.period_end,
        kwh=payload.kwh,
        cost_kzt=payload.cost_kzt,
        fixed_charges_kzt=payload.fixed_charges_kzt,
        effective_rate=effective_rate(payload.cost_kzt, payload.fixed_charges_kzt, payload.kwh),
        data_quality=payload.data_quality,
        source=payload.source,
        status="confirmed",
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record_schema(record)


@router.get("/consumption", response_model=ConsumptionListSchema)
async def list_consumption(
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> ConsumptionListSchema:
    records = db.scalars(
        select(ConsumptionRecord)
        .where(ConsumptionRecord.organization_id == organization.id)
        .order_by(ConsumptionRecord.period_start.desc())
    )
    return ConsumptionListSchema(records=[record_schema(r) for r in records])


@router.get("/consumption/{record_id}", response_model=ConsumptionRecordSchema)
async def get_consumption(
    record_id: int,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> ConsumptionRecordSchema:
    return record_schema(_get_org_record(db, organization.id, record_id))


# ---------------------------------------------------------------- dashboard


@router.get("/dashboard", response_model=DashboardResponseSchema)
async def dashboard(
    record_id: int | None = None,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> DashboardResponseSchema:
    if record_id is not None:
        record = _get_org_record(db, organization.id, record_id)
    else:
        record = db.scalar(
            select(ConsumptionRecord)
            .where(
                ConsumptionRecord.organization_id == organization.id,
                ConsumptionRecord.status == "confirmed",
            )
            .order_by(ConsumptionRecord.period_start.desc())
        )
        if record is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Нет подтверждённых периодов. Загрузите счёт или введите данные "
                    "вручную, чтобы построить цифровой двойник."
                ),
            )
    return build_dashboard(db, organization, record)


# ---------------------------------------------------------------- scenarios


@router.get("/scenarios/catalog", response_model=ActionCatalogSchema)
async def get_catalog(
    organization: Organization = Depends(get_current_organization),
) -> ActionCatalogSchema:
    return catalog_schema(organization.business_profile)


def _scenario_schema(scenario: Scenario) -> ScenarioSchema:
    return ScenarioSchema(
        id=scenario.id,
        name=scenario.name,
        base_record_id=scenario.base_record_id,
        actions=[ActionLevelSchema(**a) for a in scenario.actions],
        result=SimulationResultSchema(**scenario.result) if scenario.result else None,
    )


@router.post("/scenarios", response_model=ScenarioSchema)
async def create_scenario(
    payload: ScenarioCreateSchema,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> ScenarioSchema:
    _get_org_record(db, organization.id, payload.base_record_id)
    scenario = Scenario(
        organization_id=organization.id,
        base_record_id=payload.base_record_id,
        name=payload.name,
        actions=[a.model_dump() for a in payload.actions],
    )
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    return _scenario_schema(scenario)


@router.get("/scenarios", response_model=ScenarioListSchema)
async def list_scenarios(
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> ScenarioListSchema:
    scenarios = db.scalars(
        select(Scenario)
        .where(Scenario.organization_id == organization.id)
        .order_by(Scenario.created_at.desc())
    )
    return ScenarioListSchema(scenarios=[_scenario_schema(s) for s in scenarios])


@router.put("/scenarios/{scenario_id}", response_model=ScenarioSchema)
async def update_scenario(
    scenario_id: int,
    payload: ScenarioUpdateSchema,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> ScenarioSchema:
    scenario = db.scalar(
        select(Scenario).where(
            Scenario.id == scenario_id, Scenario.organization_id == organization.id
        )
    )
    if scenario is None:
        raise HTTPException(status_code=404, detail="Сценарий не найден")
    if payload.name is not None:
        scenario.name = payload.name
    if payload.actions is not None:
        scenario.actions = [a.model_dump() for a in payload.actions]
        scenario.result = None
    db.commit()
    db.refresh(scenario)
    return _scenario_schema(scenario)


@router.post("/scenarios/{scenario_id}/simulate", response_model=SimulationResultSchema)
async def simulate_scenario(
    scenario_id: int,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> SimulationResultSchema:
    scenario = db.scalar(
        select(Scenario).where(
            Scenario.id == scenario_id, Scenario.organization_id == organization.id
        )
    )
    if scenario is None:
        raise HTTPException(status_code=404, detail="Сценарий не найден")
    record = _get_org_record(db, organization.id, scenario.base_record_id)
    try:
        result = simulate(
            db, organization, record, [ActionLevelSchema(**a) for a in scenario.actions]
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    scenario.result = result.model_dump()
    db.commit()
    return result


@router.post("/scenarios/optimize", response_model=OptimizationResponseSchema)
async def optimize_scenarios(
    payload: OptimizationRequestSchema,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> OptimizationResponseSchema:
    ensure_optimizer_enabled(db, organization.id)
    record = _get_org_record(db, organization.id, payload.base_record_id)
    return run_optimizer(db, organization, record)


# ---------------------------------------------------------------- subscription


@router.get("/subscription/plans", response_model=PlansResponseSchema)
async def plans() -> PlansResponseSchema:
    return PlansResponseSchema(plans=list(PLANS.values()))


def _subscription_schema(subscription: Subscription) -> SubscriptionSchema:
    return SubscriptionSchema(
        plan=subscription.plan,  # type: ignore[arg-type]
        cycle=subscription.cycle,  # type: ignore[arg-type]
        status=subscription.status,
        activated_at=subscription.activated_at.isoformat(),
        entitlements=plan_for(subscription),
    )


@router.get("/subscription", response_model=SubscriptionSchema)
async def get_subscription(
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> SubscriptionSchema:
    return _subscription_schema(get_or_create_subscription(db, organization.id))


@router.post("/subscription/checkout", response_model=CheckoutResponseSchema)
async def checkout(
    payload: CheckoutRequestSchema,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> CheckoutResponseSchema:
    # Mock checkout for the MVP: server-side plan switch, no payment provider,
    # no card data accepted anywhere in the contract.
    subscription = get_or_create_subscription(db, organization.id)
    subscription.plan = payload.plan
    subscription.cycle = payload.cycle
    subscription.status = "active"
    subscription.activated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(subscription)
    return CheckoutResponseSchema(
        status="success",
        subscription=_subscription_schema(subscription),
        note="Демо-оплата: платёжный провайдер не подключён, реквизиты не собираются.",
    )


# ---------------------------------------------------------------- copilot


@router.get("/copilot/faq", response_model=FaqListResponseSchema)
async def copilot_faq() -> FaqListResponseSchema:
    return FaqListResponseSchema(items=copilot_service.get_faq())


@router.post("/copilot/chat", response_model=CopilotResponseSchema)
async def copilot_chat(
    payload: CopilotRequestSchema,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> CopilotResponseSchema:
    return await copilot_service.chat(payload.message, db, organization)


# ---------------------------------------------------------------- demo


@router.post("/demo/seed")
async def demo_seed(
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> dict:
    created = seed_demo_data(db, organization)
    return {
        "status": "ok",
        "created": created,
        "note": "Демо-данные: синтетический fixture, помечен source=demo.",
    }
