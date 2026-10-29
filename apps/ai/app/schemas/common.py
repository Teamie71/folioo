"""API 공통 응답 스키마."""

from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    """API 오류의 상세 메시지."""

    detail: str = Field(..., description="에러 상세 메시지")
