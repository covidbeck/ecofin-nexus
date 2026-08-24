from pydantic import BaseModel, Field


class FaqItemSchema(BaseModel):
    id: str
    question: str
    answer: str


class FaqListResponseSchema(BaseModel):
    items: list[FaqItemSchema]


class CopilotRequestSchema(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)


class CopilotResponseSchema(BaseModel):
    reply: str
    source: str = Field(..., description="'faq_cache' | 'llm' | 'fallback'")
