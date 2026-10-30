"""첨삭 API 라우터"""

import logging
from contextlib import suppress

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile, status

from app.schemas.common import ErrorResponse
from app.schemas.pdf_extraction import PdfExtractionAcceptedResponse
from common.clients.base_client import MainServerError
from features.correction.service import get_correction_service
from features.portfolio.pdf_extraction.service import get_pdf_extraction_service

router = APIRouter(prefix="/corrections", tags=["correction"])
logger = logging.getLogger(__name__)

_MAX_PDF_FILE_SIZE_BYTES = 10 * 1024 * 1024
_PDF_UPLOAD_CHUNK_SIZE_BYTES = 1024 * 1024


def _validate_correction_id(correction_id: str) -> int:
    """correction_id가 유효한 정수인지 검증하고 int로 반환한다."""
    try:
        return int(correction_id)
    except (ValueError, TypeError) as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"첨삭을 찾을 수 없습니다: {correction_id}",
        ) from e


async def _read_upload_within_limit(file: UploadFile) -> bytes:
    """업로드 파일을 크기 상한 안에서 읽어 바이트로 반환한다."""
    file_bytes_buffer = bytearray()

    while chunk := await file.read(_PDF_UPLOAD_CHUNK_SIZE_BYTES):
        file_bytes_buffer.extend(chunk)
        if len(file_bytes_buffer) > _MAX_PDF_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PDF 파일 크기는 10MB를 초과할 수 없습니다.",
            )

    return bytes(file_bytes_buffer)


def _raise_internal_server_error() -> None:
    """내부 서버 에러를 표준 메시지로 반환한다."""
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="내부 서버 오류가 발생했습니다.",
    )


def _handle_main_server_error(exc: MainServerError) -> None:
    """메인 서버 에러를 적절한 HTTP 에러로 변환한다."""
    if exc.status_code == 404:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=exc.detail,
        ) from exc
    if exc.status_code == 422 and exc.error_code == "CORRECTION4221":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=exc.detail,
        ) from exc
    raise HTTPException(
        status_code=exc.status_code,
        detail=exc.detail,
    ) from exc


@router.post(
    "/{correction_id}/rag",
    status_code=status.HTTP_202_ACCEPTED,
    summary="RAG 실행 시작",
    responses={
        404: {"model": ErrorResponse, "description": "첨삭이 없는 경우"},
        409: {"model": ErrorResponse, "description": "상태 전이 규칙 위반"},
        500: {"model": ErrorResponse, "description": "내부 서버 에러"},
    },
)
async def start_rag(correction_id: str, background_tasks: BackgroundTasks) -> dict[str, str]:
    """RAG 실행을 시작한다. 메인 서버가 상태 전이를 검증한다."""
    cid = _validate_correction_id(correction_id)
    service = get_correction_service()
    try:
        await service.start_rag(cid, background_tasks)
        return {"message": "RAG 실행을 시작했습니다."}
    except MainServerError as exc:
        _handle_main_server_error(exc)
    except HTTPException:
        raise
    except Exception:
        _raise_internal_server_error()


@router.post(
    "/{correction_id}/generate",
    status_code=status.HTTP_202_ACCEPTED,
    summary="첨삭 생성 시작",
    responses={
        404: {"model": ErrorResponse, "description": "첨삭이 없는 경우"},
        409: {"model": ErrorResponse, "description": "상태 전이 규칙 위반"},
        500: {"model": ErrorResponse, "description": "내부 서버 에러"},
    },
)
async def start_generation(
    correction_id: str,
    background_tasks: BackgroundTasks,
) -> dict[str, str]:
    """첨삭 생성을 시작한다. 메인 서버가 상태 전이를 검증한다."""
    cid = _validate_correction_id(correction_id)
    service = get_correction_service()
    try:
        await service.start_generation(cid, background_tasks)
        return {"message": "첨삭 생성을 시작했습니다."}
    except MainServerError as exc:
        _handle_main_server_error(exc)
    except HTTPException:
        raise
    except Exception:
        _raise_internal_server_error()


@router.post(
    "/{correction_id}/pdf-extraction",
    response_model=PdfExtractionAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="PDF 추출 시작",
    responses={
        400: {"model": ErrorResponse, "description": "PDF 업로드 검증 실패"},
        404: {"model": ErrorResponse, "description": "첨삭이 없는 경우"},
        409: {"model": ErrorResponse, "description": "상태 전이 규칙 위반"},
        500: {"model": ErrorResponse, "description": "내부 서버 에러"},
    },
)
async def start_pdf_extraction(
    correction_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
) -> PdfExtractionAcceptedResponse:
    """PDF 파일 업로드를 받아 추출 작업을 비동기로 시작한다."""
    cid = _validate_correction_id(correction_id)
    service = get_pdf_extraction_service()

    try:
        file_bytes = await _read_upload_within_limit(file)

        await service.start_extraction(
            correction_id=cid,
            file_bytes=file_bytes,
            filename=file.filename or "",
            content_type=file.content_type,
            background_tasks=background_tasks,
        )
        return PdfExtractionAcceptedResponse(
            correction_id=correction_id,
            status="accepted",
            message="PDF 추출 요청이 접수되었습니다.",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except MainServerError as exc:
        _handle_main_server_error(exc)
    except HTTPException:
        raise
    except Exception:
        _raise_internal_server_error()
    finally:
        with suppress(Exception):
            await file.close()
