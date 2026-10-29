"""폐기 API가 노출되지 않고 첨삭 유지 경로는 등록되는지 검증한다."""

import pytest

from app.main import create_app


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("POST", "/api/v1/interview/sessions"),
        ("POST", "/api/v1/interview/sessions/stream"),
        ("POST", "/api/v1/interview/sessions/{session_id}/chat"),
        ("POST", "/api/v1/interview/sessions/{session_id}/chat/stream"),
        ("POST", "/api/v1/interview/sessions/{session_id}/extend"),
        ("POST", "/api/v1/interview/sessions/{session_id}/extend/stream"),
        ("GET", "/api/v1/interview/sessions/{session_id}/state"),
        ("GET", "/api/v1/interview/sessions/{session_id}/status"),
        ("POST", "/api/v1/portfolio/generate"),
        ("GET", "/api/v1/portfolio/session/{session_id}"),
        ("GET", "/api/v1/portfolio/{portfolio_id}"),
        ("PATCH", "/api/v1/portfolio/{portfolio_id}/contribution-rate"),
        ("GET", "/api/v1/portfolio/{portfolio_id}/status"),
    ],
)
def test_legacy_routes_are_not_registered(method, path):
    """공유 API 계약에서 폐기한 인터뷰·포트폴리오 경로를 노출하지 않는다."""
    routes = {
        (route.path, verb)
        for route in create_app().routes
        for verb in getattr(route, "methods", ())
    }

    assert (path, method) not in routes


@pytest.mark.parametrize("action", ["generate", "rag", "pdf-extraction"])
def test_correction_entrypoints_remain_registered(action):
    """서버가 호출하는 첨삭 생성·RAG·PDF 추출 경로는 유지한다."""
    schema = create_app().openapi()

    assert "post" in schema["paths"][f"/api/v1/corrections/{{correction_id}}/{action}"]
