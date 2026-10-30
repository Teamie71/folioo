"""첨삭 클라이언트 callback payload 테스트"""

from collections.abc import Sequence
from typing import Any, get_type_hints
from unittest.mock import AsyncMock, patch

import pytest

from common.clients.correction_client import CorrectionClient
from features.portfolio.pdf_extraction.schemas import PdfActivity


def test_complete_pdf_extraction_type_hint_accepts_model_sequences():
    """complete_pdf_extraction activities는 모델 리스트도 허용하는 시퀀스 타입 힌트여야 한다."""
    activities_hint = get_type_hints(CorrectionClient.complete_pdf_extraction)["activities"]

    assert activities_hint == Sequence[Any]


@pytest.mark.asyncio
async def test_complete_pdf_extraction_sends_camelcase_payload():
    """PDF 추출 성공 callback은 camelCase payload로 전송한다."""
    client = CorrectionClient(base_url="https://example.com", api_key="test-key")

    try:
        with patch.object(client, "post", new_callable=AsyncMock, return_value={}) as mock_post:
            await client.complete_pdf_extraction(
                correction_id=174,
                activities=[
                    PdfActivity.model_validate(
                        {
                            "activity_name": "프로젝트명",
                            "detail": ["상세 설명"],
                            "responsibility": ["담당 업무"],
                            "problem_solving": [
                                {
                                    "no": 1,
                                    "situation": "문제 상황",
                                    "strategy": "대응 전략",
                                    "reason": "선택 이유",
                                },
                            ],
                            "learning": ["배운 점"],
                        }
                    )
                ],
            )

            mock_post.assert_awaited_once_with(
                "/internal/corrections/174/pdf-extraction-result",
                json={
                    "status": "completed",
                    "activities": [
                        {
                            "activityName": "프로젝트명",
                            "detail": ["상세 설명"],
                            "responsibility": ["담당 업무"],
                            "problemSolving": [
                                {
                                    "no": 1,
                                    "situation": "문제 상황",
                                    "strategy": "대응 전략",
                                    "reason": "선택 이유",
                                }
                            ],
                            "learning": ["배운 점"],
                        }
                    ],
                    "sourceType": "EXTERNAL",
                },
            )
    finally:
        await client.close()


@pytest.mark.asyncio
async def test_complete_pdf_extraction_allows_source_type_override():
    """source_type 인자를 전달하면 sourceType 값에 반영한다."""
    client = CorrectionClient(base_url="https://example.com", api_key="test-key")

    try:
        with patch.object(client, "post", new_callable=AsyncMock, return_value={}) as mock_post:
            await client.complete_pdf_extraction(
                correction_id=175,
                activities=[
                    {
                        "activity_name": "다른 프로젝트",
                        "detail": ["상세 설명"],
                        "responsibility": ["담당 업무"],
                        "problem_solving": [
                            {
                                "no": 1,
                                "situation": "문제 상황",
                                "strategy": "대응 전략",
                                "reason": "선택 이유",
                            }
                        ],
                        "learning": ["배운 점"],
                    },
                ],
                source_type="INTERNAL",
            )

            mock_post.assert_awaited_once_with(
                "/internal/corrections/175/pdf-extraction-result",
                json={
                    "status": "completed",
                    "activities": [
                        {
                            "activityName": "다른 프로젝트",
                            "detail": ["상세 설명"],
                            "responsibility": ["담당 업무"],
                            "problemSolving": [
                                {
                                    "no": 1,
                                    "situation": "문제 상황",
                                    "strategy": "대응 전략",
                                    "reason": "선택 이유",
                                }
                            ],
                            "learning": ["배운 점"],
                        }
                    ],
                    "sourceType": "INTERNAL",
                },
            )
    finally:
        await client.close()


@pytest.mark.asyncio
async def test_fail_pdf_extraction_sends_error_message_payload():
    """PDF 추출 실패 callback은 errorMessage payload로 전송한다."""
    client = CorrectionClient(base_url="https://example.com", api_key="test-key")

    try:
        with patch.object(client, "post", new_callable=AsyncMock, return_value={}) as mock_post:
            await client.fail_pdf_extraction(
                correction_id=174,
                error_message="PDF 추출 중 오류가 발생했습니다.",
            )

            mock_post.assert_awaited_once_with(
                "/internal/corrections/174/pdf-extraction-result",
                json={
                    "status": "failed",
                    "sourceType": "EXTERNAL",
                    "errorMessage": "PDF 추출 중 오류가 발생했습니다.",
                },
            )
    finally:
        await client.close()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("client_type", "method", "args", "http_method", "path", "payload"),
    [
        ("correction", "get_correction", (123,), "GET", "/corrections/123", None),
        ("correction", "get_rag_data", (123,), "GET", "/corrections/123/rag-data", None),
        (
            "correction",
            "save_rag_data",
            (123, "query", {"results": []}),
            "POST",
            "/corrections/123/rag-data",
            {"searchQuery": "query", "searchResults": {"results": []}},
        ),
        (
            "correction",
            "update_status",
            (123, "GENERATING"),
            "PATCH",
            "/corrections/123/status",
            {"status": "GENERATING"},
        ),
        (
            "correction",
            "update_company_insight",
            (123, "insight"),
            "PATCH",
            "/corrections/123/company-insight",
            {"companyInsight": "insight"},
        ),
        (
            "correction",
            "update_result",
            (123, [], "review"),
            "PATCH",
            "/corrections/123/result",
            {"result": [], "overallReview": "review"},
        ),
        ("portfolio", "get_portfolio", (123,), "GET", "/internal/portfolios/123", None),
    ],
)
async def test_backend_contracts_remain_available(
    client_type, method, args, http_method, path, payload
):
    """미사용 진입점 제거 후에도 실제 클라이언트의 조회·저장·인증 계약을 유지한다."""
    import json

    import httpx

    from common.clients.portfolio_client import PortfolioClient

    factory = CorrectionClient if client_type == "correction" else PortfolioClient
    client = factory(base_url="https://example.com", api_key="test-key")

    async def respond(request, **kwargs):
        assert request.method == http_method
        assert request.url.path == path
        assert request.headers["X-API-Key"] == "test-key"
        if payload is not None:
            assert json.loads(request.content) == payload
        return httpx.Response(200, json={"result": {"id": 123}}, request=request)

    try:
        with patch.object(client._client, "send", side_effect=respond) as send:
            result = await getattr(client, method)(*args)
            assert result is not None
            send.assert_awaited_once()
    finally:
        await client.close()
