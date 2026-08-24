from pydantic import BaseModel, Field

EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class RegisterRequestSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    organization_name: str = Field(..., min_length=1, max_length=255)
    email: str = Field(..., pattern=EMAIL_PATTERN, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequestSchema(BaseModel):
    email: str = Field(..., pattern=EMAIL_PATTERN, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)


class OrganizationBriefSchema(BaseModel):
    id: int
    name: str
    onboarding_complete: bool


class UserResponseSchema(BaseModel):
    id: int
    email: str
    name: str
    role: str
    organization: OrganizationBriefSchema


class AuthResponseSchema(BaseModel):
    token: str
    expires_at: str
    user: UserResponseSchema


class LogoutResponseSchema(BaseModel):
    status: str
