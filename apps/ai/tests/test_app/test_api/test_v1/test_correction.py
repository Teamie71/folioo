"""첨삭 API 테스트 (httpx 클라이언트 기반)"""

import pytest
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.api.v1 import correction as correction_api
from common.clients import base_client as base_client_module
from features.portfolio.pdf_extraction.schemas import (
    PdfActivity,
    PdfExtractionResult,
    PdfProblemSolvingItem,
)
from features.portfolio.pdf_extraction.service import PdfExtractionService

CORRECTION_ID = "123"


class DummyCorrectionService:
    """API 테스트용 CorrectionService Mock"""

    def __init__(
        self,
        *,
        rag_error: Exception | None = None,
        gen_error: Exception | None = None,
    ) -> None:
        self.rag_started = False
        self.generation_started = False
        self._rag_error = rag_error
        self._gen_error = gen_error

    async def start_rag(self, correction_id: int, background_tasks) -> None:
        if self._rag_error:
            raise self._rag_error
        self.rag_started = True

    async def start_generation(self, correction_id: int, background_tasks) -> None:
        if self._gen_error:
            raise self._gen_error
        self.generation_started = True


class DummyPdfExtractionClient:
    """PDF 추출 서비스 테스트용 콜백 클라이언트"""

    def __init__(self) -> None:
        self.completed_calls: list[tuple[int, list[dict], str]] = []
        self.failed_calls: list[tuple[int, str]] = []

    async def complete_pdf_extraction(
        self,
        correction_id: int,
        activities: list[dict],
        source_type: str,
    ) -> dict:
        self.completed_calls.append((correction_id, activities, source_type))
        return {"id": correction_id}

    async def fail_pdf_extraction(self, correction_id: int, error_message: str) -> dict:
        self.failed_calls.append((correction_id, error_message))
        return {"id": correction_id}


class DummyPdfExtractionGenerator:
    """PDF 추출 서비스 테스트용 generator"""

    def __init__(
        self,
        result: PdfExtractionResult | None = None,
        exc: Exception | None = None,
    ) -> None:
        self._result = result or PdfExtractionResult(
            activities=[
                PdfActivity(
                    activity_name="프로젝트 A",
                    detail=["상세 설명"],
                    responsibility=["담당 업무"],
                    problem_solving=[
                        PdfProblemSolvingItem(
                            no=3,
                            situation="문제 상황",
                            strategy="대응 전략",
                            reason="선택 이유",
                        )
                    ],
                    learning=["배운 점"],
                )
            ]
        )
        self._exc = exc

    def extract(self, _file_bytes: bytes, _filename: str) -> PdfExtractionResult:
        if self._exc is not None:
            raise self._exc
        return self._result


class RecordingPdfService:
    """라우터 단위 테스트용 PDF 서비스 recorder"""

    def __init__(self) -> None:
        self.calls: list[dict] = []

    async def start_extraction(
        self,
        correction_id: int,
        file_bytes: bytes,
        filename: str,
        content_type: str | None,
        background_tasks: BackgroundTasks,
    ) -> None:
        self.calls.append(
            {
                "correction_id": correction_id,
                "file_bytes": file_bytes,
                "filename": filename,
                "content_type": content_type,
                "background_tasks": background_tasks,
            }
        )


class ChunkedUploadFile:
    """chunk read 동작 검증용 UploadFile 대역"""

    def __init__(self, *, filename: str, content_type: str | None, chunks: list[bytes]) -> None:
        self.filename = filename
        self.content_type = content_type
        self._chunks = list(chunks)
        self.read_sizes: list[int] = []
        self.closed = False

    async def read(self, size: int = -1) -> bytes:
        self.read_sizes.append(size)
        if not self._chunks:
            return b""
        return self._chunks.pop(0)

    async def close(self) -> None:
        self.closed = True


def _create_pdf_extraction_service(
    *,
    generator: DummyPdfExtractionGenerator | None = None,
    correction_client: DummyPdfExtractionClient | None = None,
) -> PdfExtractionService:
    return PdfExtractionService(
        correction_client=correction_client or DummyPdfExtractionClient(),
        generator=generator or DummyPdfExtractionGenerator(),
    )


def _create_client(
    monkeypatch,
    service: DummyCorrectionService | None = None,
    pdf_service: PdfExtractionService | None = None,
) -> TestClient:
    if service is not None:
        monkeypatch.setattr(correction_api, "get_correction_service", lambda: service)
    if pdf_service is not None:
        monkeypatch.setattr(correction_api, "get_pdf_extraction_service", lambda: pdf_service)
    app = FastAPI()
    app.include_router(correction_api.router, prefix="/api/v1")
    return TestClient(app)


def test_invalid_correction_id_returns_404(monkeypatch):
    """유효하지 않은 correction_id는 404를 반환한다."""
    client = _create_client(monkeypatch)

    response = client.post("/api/v1/corrections/not-a-number/generate")

    assert response.status_code == 404


# ------------------------------------------------------------------
# RAG 시작
# ------------------------------------------------------------------


def test_start_rag_returns_202(monkeypatch):
    """RAG 시작이 성공하면 202를 반환한다."""
    service = DummyCorrectionService()
    client = _create_client(monkeypatch, service)

    response = client.post(f"/api/v1/corrections/{CORRECTION_ID}/rag")

    assert response.status_code == 202
    assert service.rag_started is True


def test_start_rag_returns_409_on_invalid_transition(monkeypatch):
    """RAG 시작 시 상태 전이 규칙 위반이면 409를 반환한다."""
    service = DummyCorrectionService(
        rag_error=base_client_module.MainServerError(
            status_code=422,
            detail="유효하지 않은 상태 전이",
            error_code="CORRECTION4221",
        )
    )
    client = _create_client(monkeypatch, service)

    response = client.post(f"/api/v1/corrections/{CORRECTION_ID}/rag")

    assert response.status_code == 409


@pytest.mark.asyncio
async def test_start_pdf_extraction_reads_in_chunks_before_service_call(monkeypatch):
    """PDF 업로드는 chunk 단위로 읽고 누적 bytes를 서비스에 전달한다."""
    service = RecordingPdfService()
    monkeypatch.setattr(correction_api, "get_pdf_extraction_service", lambda: service)
    upload = ChunkedUploadFile(
        filename="portfolio.pdf",
        content_type="application/pdf",
        chunks=[b"%PDF", b"-1.4", b"-body"],
    )

    response = await correction_api.start_pdf_extraction(
        correction_id=CORRECTION_ID,
        background_tasks=BackgroundTasks(),
        file=upload,
    )

    assert response.status == "accepted"
    assert upload.read_sizes == [1024 * 1024, 1024 * 1024, 1024 * 1024, 1024 * 1024]
    assert upload.closed is True
    assert service.calls[0]["file_bytes"] == b"%PDF-1.4-body"


@pytest.mark.asyncio
async def test_start_pdf_extraction_stops_when_chunk_limit_exceeded(monkeypatch):
    """PDF 업로드는 제한 초과 청크에서 즉시 중단하고 서비스를 호출하지 않는다."""
    service = RecordingPdfService()
    monkeypatch.setattr(correction_api, "get_pdf_extraction_service", lambda: service)
    upload = ChunkedUploadFile(
        filename="portfolio.pdf",
        content_type="application/pdf",
        chunks=[b"a" * (10 * 1024 * 1024), b"b"],
    )

    with pytest.raises(HTTPException) as exc_info:
        await correction_api.start_pdf_extraction(
            correction_id=CORRECTION_ID,
            background_tasks=BackgroundTasks(),
            file=upload,
        )

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "PDF 파일 크기는 10MB를 초과할 수 없습니다."
    assert upload.closed is True
    assert service.calls == []


# ------------------------------------------------------------------
# 첨삭 생성
# ------------------------------------------------------------------


def test_start_generation_returns_202(monkeypatch):
    """첨삭 생성 시작이 성공하면 202를 반환한다."""
    service = DummyCorrectionService()
    client = _create_client(monkeypatch, service)

    response = client.post(f"/api/v1/corrections/{CORRECTION_ID}/generate")

    assert response.status_code == 202
    assert service.generation_started is True


def test_start_generation_returns_409_on_invalid_transition(monkeypatch):
    """생성 시작 시 상태 전이 규칙 위반이면 409를 반환한다."""
    service = DummyCorrectionService(
        gen_error=base_client_module.MainServerError(
            status_code=422,
            detail="유효하지 않은 상태 전이",
            error_code="CORRECTION4221",
        )
    )
    client = _create_client(monkeypatch, service)

    response = client.post(f"/api/v1/corrections/{CORRECTION_ID}/generate")

    assert response.status_code == 409


# ------------------------------------------------------------------
# PDF 추출
# ------------------------------------------------------------------


def test_start_pdf_extraction_returns_202(monkeypatch):
    """PDF 추출 요청이 유효하면 202를 반환한다."""
    pdf_service = _create_pdf_extraction_service()
    client = _create_client(monkeypatch, pdf_service=pdf_service)

    response = client.post(
        f"/api/v1/corrections/{CORRECTION_ID}/pdf-extraction",
        files={"file": ("portfolio.txt", b"%PDF-1.4", "application/pdf")},
    )

    assert response.status_code == 202
    assert response.json() == {
        "correction_id": CORRECTION_ID,
        "status": "accepted",
        "message": "PDF 추출 요청이 접수되었습니다.",
    }


def test_start_pdf_extraction_returns_400_for_non_pdf(monkeypatch):
    """PDF가 아닌 파일이면 400을 반환한다."""
    pdf_service = _create_pdf_extraction_service()
    client = _create_client(monkeypatch, pdf_service=pdf_service)

    response = client.post(
        f"/api/v1/corrections/{CORRECTION_ID}/pdf-extraction",
        files={"file": ("portfolio.txt", b"plain text", "text/plain")},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "PDF 파일만 업로드할 수 있습니다."


def test_start_pdf_extraction_returns_400_for_empty_file(monkeypatch):
    """빈 파일이면 400을 반환한다."""
    pdf_service = _create_pdf_extraction_service()
    client = _create_client(monkeypatch, pdf_service=pdf_service)

    response = client.post(
        f"/api/v1/corrections/{CORRECTION_ID}/pdf-extraction",
        files={"file": ("portfolio.pdf", b"", "application/pdf")},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "빈 PDF 파일은 업로드할 수 없습니다."


def test_start_pdf_extraction_returns_400_for_file_too_large(monkeypatch):
    """10MB를 초과한 파일이면 400을 반환한다."""
    pdf_service = _create_pdf_extraction_service()
    client = _create_client(monkeypatch, pdf_service=pdf_service)

    response = client.post(
        f"/api/v1/corrections/{CORRECTION_ID}/pdf-extraction",
        files={
            "file": (
                "portfolio.pdf",
                b"a" * (10 * 1024 * 1024 + 1),
                "application/pdf",
            )
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "PDF 파일 크기는 10MB를 초과할 수 없습니다."


def test_start_pdf_extraction_allows_extension_fallback(monkeypatch):
    """MIME이 일반 바이너리여도 .pdf 확장자면 허용한다."""
    pdf_service = _create_pdf_extraction_service()
    client = _create_client(monkeypatch, pdf_service=pdf_service)

    response = client.post(
        f"/api/v1/corrections/{CORRECTION_ID}/pdf-extraction",
        files={"file": ("portfolio.pdf", b"%PDF-1.4", "application/octet-stream")},
    )

    assert response.status_code == 202
    assert response.json()["status"] == "accepted"


def test_start_pdf_extraction_allows_text_plain_extension_fallback(monkeypatch):
    """MIME이 text/plain이어도 .pdf 확장자면 허용한다."""
    pdf_service = _create_pdf_extraction_service()
    client = _create_client(monkeypatch, pdf_service=pdf_service)

    response = client.post(
        f"/api/v1/corrections/{CORRECTION_ID}/pdf-extraction",
        files={"file": ("portfolio.pdf", b"%PDF-1.4", "text/plain")},
    )

    assert response.status_code == 202
    assert response.json()["status"] == "accepted"
