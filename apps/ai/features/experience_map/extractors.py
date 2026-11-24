"""첨부 파일 텍스트 추출 (에이전트 문서 5-2)

두 경로가 있다.

| 처리 | 형식 |
| --- | --- |
| 파일 파서 | TXT, DOCX, PPTX, PDF 텍스트 레이어 |
| OCR 모델 | 텍스트 레이어가 없거나 깨진 PDF 페이지, PNG, JPG/JPEG |

PDF는 텍스트 레이어를 먼저 쓰고 쓸 수 없는 페이지만 OCR한다(`_extract_pdf`).
`EXPMAP_FILE_PIPELINE=0`이면 예전처럼 모든 페이지를 OCR한다.

**두 실패를 구분하는 것이 이 모듈의 핵심이다.**

- `FileUnreadableError` — 파일 상태·품질 문제. 재시도해도 같은 결과다.
  노드 실패가 아니라 **Fallback** 으로 간다
- 그 밖의 예외 — 타임아웃·API 실패 같은 시스템 오류. **노드 실패**이며 자동
  재시도 대상이다

손상된 PDF 를 올린 사용자에게 재시도 버튼을 보여주면 몇 번을 눌러도 같은
결과다.
"""

import asyncio
import base64
import io
import logging
import math
import re
import threading
import zipfile
import zlib
from xml.etree import ElementTree

from defusedxml import DefusedXmlException
from defusedxml.ElementTree import fromstring as defused_fromstring

from common.llm.client import get_file_processor_llm
from features.experience_map.config import (
    MAX_FILE_TEXT_CHARS,
    MAX_OFFICE_XML_BYTES,
    MAX_PDF_PAGES,
    MAX_PDF_RENDER_PIXELS,
    OCR_MIME_TYPES,
    PARSER_MIME_TYPES,
    PDF_OCR_CONCURRENCY,
    PDF_RENDER_SCALE,
    get_settings,
)

logger = logging.getLogger(__name__)

_PDFIUM_LOCK = threading.Lock()
"""PDFium은 스레드 안전하지 않다. 추출을 스레드로 옮겼으므로 PDFium 호출은 한 번에 하나만 한다."""

TRUNCATION_NOTE = "\n\n[내용이 길어 앞부분만 사용했습니다.]"
# 페이지 수 상한으로 뒤쪽을 버렸을 때 붙이는 안내문. 접두사(PAGE_TRUNCATION_NOTE_MARKER)를
# 따로 두는 이유는 file_processor가 최종 텍스트에 이 안내가 있는지 부분 문자열로
# 감지해야 하는데, `{limit}`·`{total}` 값은 파일마다 달라 통째로는 못 찾기 때문이다.
PAGE_TRUNCATION_NOTE_MARKER = "[페이지가 많아"
PAGE_TRUNCATION_NOTE = f"\n\n{PAGE_TRUNCATION_NOTE_MARKER} 앞 {{limit}}페이지만 사용했습니다. 전체 {{total}}페이지 중 일부입니다.]"

OCR_INSTRUCTION = """\
첨부한 문서나 이미지에 있는 **텍스트를 그대로 옮겨** 주세요.

- 요약하거나 다시 쓰지 마세요. 보이는 글자를 그대로 옮깁니다.
- 표는 읽는 순서대로 풀어서 적습니다.
- 읽을 수 없는 부분은 건너뜁니다. 추측해서 채우지 마세요.
- 텍스트가 전혀 없으면 빈 문자열만 반환합니다.
"""


class FileUnreadableError(Exception):
    """파일 상태·품질 문제로 추출할 수 없다.

    **노드 실패가 아니다.** Fallback 으로 가야 한다 (5-2).
    """


def _truncate(text: str, limit: int = MAX_FILE_TEXT_CHARS) -> str:
    """파일 하나가 프롬프트를 독차지하지 않게 자른다."""
    if len(text) <= limit:
        return text
    logger.info("추출 텍스트가 길어 자릅니다 (%d → %d자)", len(text), limit)
    return text[:limit] + TRUNCATION_NOTE


def _extract_text_plain(data: bytes) -> str:
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise FileUnreadableError("텍스트 파일을 읽을 수 없습니다.") from exc


def _require_valid_zip(data: bytes) -> None:
    """DOCX·PPTX 가 온전한 zip 컨테이너인지 확인한다.

    업로드 단계의 파일 signature 검사에 더해 zip 목록이 온전한지 확인한다.
    손상된 문서를 LLM 입력으로 전달하지 않도록 실제 파싱 전에 거절한다.
    본문 항목의 CRC는 `_read_office_parts`가 읽으면서 확인한다.

    모든 항목의 압축을 풀어 CRC를 확인하는 `testzip()`은 쓰지 않는다. 압축 폭탄이
    이 단계에서 바로 터졌다.
    """
    try:
        with zipfile.ZipFile(io.BytesIO(data)):
            pass
    except zipfile.BadZipFile as exc:
        raise FileUnreadableError("문서가 손상되었습니다.") from exc


def _read_office_parts(archive: zipfile.ZipFile, names: list[str]) -> list[bytes]:
    """본문 XML을 읽는다. 압축을 풀기 전에 선언된 크기로 상한을 확인한다.

    zipfile은 선언된 크기(`file_size`)까지만 풀고 CRC를 확인하므로, 크기를 속인 항목은
    `BadZipFile`이 된다.
    """
    declared = sum(archive.getinfo(name).file_size for name in names)
    if declared > MAX_OFFICE_XML_BYTES:
        logger.warning(
            "문서 본문이 처리 상한을 넘어 거절합니다 (본문 %d바이트, 상한 %d바이트)",
            declared,
            MAX_OFFICE_XML_BYTES,
        )
        raise FileUnreadableError("문서 내용이 너무 커서 읽을 수 없습니다.")
    parts: list[bytes] = []
    for name in names:
        with archive.open(name) as entry:
            parts.append(entry.read(MAX_OFFICE_XML_BYTES + 1))
    if sum(len(part) for part in parts) > MAX_OFFICE_XML_BYTES:
        raise FileUnreadableError("문서 내용이 너무 커서 읽을 수 없습니다.")
    return parts


def _extract_office_xml(data: bytes, filename: str) -> str:
    """DOCX·PPTX의 표준 XML에서 텍스트를 문서 순서대로 읽는다.

    Office 파일은 ZIP 안의 XML 문서다. 범용 변환기는 import 또는 변환 과정이
    장시간 멈출 수 있어, 경험정리에 필요한 원문 텍스트만 직접 추출한다.
    """
    _require_valid_zip(data)
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            suffix = _suffix(filename)
            if suffix == ".docx":
                names = ["word/document.xml"]
            elif suffix == ".pptx":
                names = sorted(
                    (
                        name
                        for name in archive.namelist()
                        if re.fullmatch(r"ppt/slides/slide\d+\.xml", name)
                    ),
                    key=_slide_number,
                )
            else:
                raise FileUnreadableError("지원하지 않는 문서 형식입니다.")

            if not names or any(name not in archive.namelist() for name in names):
                raise FileUnreadableError("문서의 본문을 찾을 수 없습니다.")
            parts = [_xml_text(part) for part in _read_office_parts(archive, names)]
    except FileUnreadableError:
        raise
    except (
        KeyError,
        ElementTree.ParseError,
        DefusedXmlException,
        zipfile.BadZipFile,
        zlib.error,
    ) as exc:
        raise FileUnreadableError("문서를 읽을 수 없습니다.") from exc

    text = "\n".join(part for part in parts if part).strip()
    if not text:
        raise FileUnreadableError("문서에서 텍스트를 찾지 못했습니다.")
    return text


def _xml_text(data: bytes) -> str:
    """WordprocessingML/DrawingML의 텍스트 노드를 원래 순서로 합친다.

    Office 본문 XML에는 DTD가 없다. 엔티티 확장 공격을 막으려고 DTD·엔티티를 거절한다.
    """
    root = defused_fromstring(data)
    paragraphs: list[str] = []
    for paragraph in root.iter():
        if paragraph.tag.rsplit("}", maxsplit=1)[-1] != "p":
            continue
        fragments = [
            node.text or ""
            for node in paragraph.iter()
            if node.tag.rsplit("}", maxsplit=1)[-1] == "t"
        ]
        text = "".join(fragments).strip()
        if text:
            paragraphs.append(text)
    return "\n".join(paragraphs)


def _slide_number(path: str) -> int:
    """slide10이 slide2보다 먼저 오지 않도록 숫자로 정렬한다."""
    match = re.search(r"slide(\d+)\.xml$", path)
    return int(match.group(1)) if match else 0


def _suffix(filename: str) -> str:
    _, dot, ext = filename.rpartition(".")
    return f".{ext.lower()}" if dot else ""


def _open_pdf(data: bytes):
    """PDFium 문서를 열고 파일 자체가 손상된 경우 사용자 입력 오류로 구분한다.

    호출자는 `_PDFIUM_LOCK`을 잡은 상태여야 한다.
    """
    import pypdfium2 as pdfium

    try:
        return pdfium.PdfDocument(data)
    except pdfium.PdfiumError as exc:
        raise FileUnreadableError("PDF를 열 수 없습니다.") from exc


def _pdf_page_count(pdf) -> int:
    """처리 상한을 적용한 PDF 페이지 수를 반환한다."""
    page_count = min(len(pdf), MAX_PDF_PAGES)
    if page_count == 0:
        raise FileUnreadableError("PDF에 페이지가 없습니다.")
    return page_count


def _pdf_total_page_count(data: bytes) -> int:
    """상한을 적용하지 않은 실제 PDF 전체 페이지 수를 반환한다.

    `MAX_PDF_PAGES`를 넘겨 뒤 페이지를 조용히 버리는 경우, 그 사실 자체를
    사용자에게 알려야 한다(명세 5-2, 3-2 "모든 페이지 OCR"과 실제 처리
    범위가 다르기 때문) — 이 값과 `_pdf_page_count`를 비교해 잘렸는지
    판단한다.
    """
    with _PDFIUM_LOCK:
        pdf = _open_pdf(data)
        try:
            return len(pdf)
        finally:
            pdf.close()


def _render_pdf_pages(data: bytes, page_indexes: list[int] | None = None) -> list[bytes]:
    """PDF 페이지를 PNG 이미지로 직접 렌더링한다.

    PDF 원본 바이트를 그대로 vision 모델에 `image_url`로 넘기면, 제공자가
    내부적으로 PDF를 이미지로 변환하는 과정에서 한글처럼 폰트가 내장된 텍스트를
    제대로 래스터화하지 못해 **한글만 빈칸으로 사라지는** 사고가 실제로
    있었다(영문·숫자·문장부호는 기본 폰트라 살아남는다). PDFium은 CJK를
    포함한 폰트 렌더링을 자체적으로 처리하므로, 서버가 직접 페이지를 그려
    실제 이미지로 만든 뒤 그 이미지를 모델에 보낸다 — "PDF는 OCR로 처리한다"는
    정책(문서 3-2)은 그대로 지키면서 래스터화 결함만 없앤다.

    페이지가 너무 많으면 비용·시간이 무한정 늘어나므로 앞쪽 `MAX_PDF_PAGES`
    장만 쓴다 — 이력서·포트폴리오류는 뒤로 갈수록 부가 자료인 경우가 많다.

    동기 함수라 호출자는 이벤트 루프 밖(`asyncio.to_thread`)에서 부른다.
    """
    import pypdfium2 as pdfium

    with _PDFIUM_LOCK:
        pdf = _open_pdf(data)
        try:
            page_count = _pdf_page_count(pdf)
            indexes = list(range(page_count)) if page_indexes is None else page_indexes
            if any(index < 0 or index >= page_count for index in indexes):
                raise ValueError("PDF 렌더링 페이지 범위가 올바르지 않습니다.")
            images: list[bytes] = []
            for index in indexes:
                page = pdf[index]
                try:
                    bitmap = page.render(scale=_render_scale(*page.get_size()))
                    buffer = io.BytesIO()
                    bitmap.to_pil().save(buffer, format="PNG")
                    images.append(buffer.getvalue())
                finally:
                    page.close()
            return images
        except pdfium.PdfiumError as exc:
            raise FileUnreadableError("PDF 페이지를 읽을 수 없습니다.") from exc
        finally:
            pdf.close()


def _render_scale(width: float, height: float) -> float:
    """렌더링 픽셀 수가 `MAX_PDF_RENDER_PIXELS`를 넘지 않는 배율. 보통 페이지는 기본 배율이다."""
    area = max(width, 1.0) * max(height, 1.0)
    limit = math.sqrt(MAX_PDF_RENDER_PIXELS / area)
    if limit >= PDF_RENDER_SCALE:
        return PDF_RENDER_SCALE
    logger.warning(
        "PDF 페이지가 커서 배율을 낮춥니다 (%.0f×%.0fpt, 배율 %.3f)", width, height, limit
    )
    # 소수 배율에서 반올림한 픽셀 수가 상한을 살짝 넘지 않게 여유를 둔다.
    return limit * 0.999


async def extract_with_parser(data: bytes, filename: str, content_type: str) -> str:
    """파서로 텍스트를 뽑는다 (TXT·DOCX·PPTX)."""
    if content_type == "text/plain":
        text = _extract_text_plain(data).strip()
        if not text:
            raise FileUnreadableError("빈 파일입니다.")
        return _truncate(text)

    # 압축 해제와 XML 파싱은 동기 CPU 작업이다. 이벤트 루프에서 돌리면 처리하는 동안
    # 서버의 다른 모든 요청이 멈췄다(압축 폭탄 DOCX 1MB: 7.9초).
    text = await asyncio.to_thread(_extract_office_xml, data, filename)
    return _truncate(text)


def _image_blocks(images: list[bytes], mime_type: str) -> list[dict]:
    """PNG/JPEG 바이트 목록을 vision 메시지의 `image_url` 블록으로 바꾼다."""
    blocks = []
    for image in images:
        encoded = base64.b64encode(image).decode("utf-8")
        blocks.append(
            {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{encoded}"}}
        )
    return blocks


def _response_text(content: object) -> str:
    """provider별 텍스트 응답 표현을 하나의 문자열로 정규화한다."""
    if isinstance(content, str):
        return content.strip()
    if not isinstance(content, list):
        return ""

    parts: list[str] = []
    for block in content:
        if isinstance(block, str):
            parts.append(block)
        elif isinstance(block, dict) and block.get("type") == "text":
            text = block.get("text")
            if isinstance(text, str):
                parts.append(text)
    return "\n".join(parts).strip()


async def _ocr_image(llm, image: bytes, mime_type: str, instruction: str) -> str:
    """이미지 하나를 OCR한다."""
    from langchain_core.messages import HumanMessage

    message = HumanMessage(
        content=[{"type": "text", "text": instruction}, *_image_blocks([image], mime_type)]
    )
    response = await llm.ainvoke([message])
    return _response_text(getattr(response, "content", ""))


TEXT_LAYER_MIN_CHARS = 40
"""텍스트 레이어로 믿고 쓸 페이지의 최소 글자 수(공백 제외). 이보다 적으면 스캔본으로 보고 OCR한다."""

_TEXT_LAYER_GARBAGE = re.compile(r"[\ufffd\x00-\x08\x0b\x0c\x0e-\x1f]|\(cid:\d+\)")


def _pdf_text_layer(data: bytes) -> list[str]:
    """처리 상한 안의 페이지별 텍스트 레이어. 읽을 수 없는 페이지는 빈 문자열."""
    import pypdfium2 as pdfium

    with _PDFIUM_LOCK:
        pdf = _open_pdf(data)
        try:
            texts: list[str] = []
            for index in range(_pdf_page_count(pdf)):
                page = pdf[index]
                try:
                    textpage = page.get_textpage()
                    texts.append(
                        textpage.get_text_range().replace("\r\n", "\n").replace("\r", "\n")
                    )
                    textpage.close()
                except pdfium.PdfiumError:
                    texts.append("")
                finally:
                    page.close()
            return texts
        finally:
            pdf.close()


def _usable_text_layer(text: str) -> bool:
    """텍스트 레이어를 그대로 써도 되는지 본다. 글자가 적거나 깨진 글자가 많으면 OCR한다."""
    compact = re.sub(r"\s", "", text)
    if len(compact) < TEXT_LAYER_MIN_CHARS:
        return False
    return len(_TEXT_LAYER_GARBAGE.findall(text)) <= len(compact) * 0.02


async def _extract_pdf(data: bytes) -> str:
    """PDF는 텍스트 레이어를 먼저 쓰고, 쓸 수 없는 페이지만 OCR한다.

    모든 페이지를 OCR하면 페이지당 수 초가 걸리고 OCR이 글자를 조금씩 바꿔 적었다.
    텍스트 레이어가 있는 PDF(노션·워드·한글 내보내기)는 0.1초 안에 원문 그대로 읽힌다
    (로컬 측정: 1쪽 OCR 6.1초 → 텍스트 레이어 0.08초, 내용 동일). 스캔본·이미지 PDF
    페이지만 예전처럼 OCR한다.
    """
    if not get_settings().file_pipeline_enabled:
        return await _extract_pdf_with_ocr(data)
    layer = await asyncio.to_thread(_pdf_text_layer, data)
    ocr_indexes = [index for index, text in enumerate(layer) if not _usable_text_layer(text)]
    logger.info(
        "PDF 텍스트 레이어 %d쪽 사용, OCR %d쪽 (전체 처리 %d쪽)",
        len(layer) - len(ocr_indexes),
        len(ocr_indexes),
        len(layer),
    )
    if ocr_indexes:
        ocr_texts = await _ocr_pdf_pages(data, ocr_indexes)
        for index, text in zip(ocr_indexes, ocr_texts, strict=True):
            layer[index] = text
    text = "\n\n".join(page for page in layer if page.strip()).strip()
    if not text:
        raise FileUnreadableError("파일에서 텍스트를 찾지 못했습니다.")
    try:
        total_pages = await asyncio.to_thread(_pdf_total_page_count, data)
    except FileUnreadableError:
        total_pages = len(layer)
    if total_pages > len(layer):
        text += PAGE_TRUNCATION_NOTE.format(limit=len(layer), total=total_pages)
    return _truncate(text)


async def _ocr_pdf_pages(data: bytes, page_indexes: list[int]) -> list[str]:
    """지정한 페이지만 렌더링해 동시에 OCR한다. 반환 순서는 `page_indexes`와 같다."""
    images = await asyncio.to_thread(_render_pdf_pages, data, page_indexes)
    llm = get_file_processor_llm()
    semaphore = asyncio.Semaphore(PDF_OCR_CONCURRENCY)

    async def _run(index: int, image: bytes) -> str:
        async with semaphore:
            try:
                return await asyncio.wait_for(
                    _ocr_image(
                        llm,
                        image,
                        "image/png",
                        f"{OCR_INSTRUCTION}\n- PDF의 {index + 1}페이지입니다. "
                        "이 페이지만 옮겨 적습니다.\n",
                    ),
                    timeout=get_settings().timeouts.file,
                )
            except Exception:
                logger.exception("PDF %d페이지 OCR 실패 (image_bytes=%d)", index + 1, len(image))
                raise

    rounds = math.ceil(len(images) / PDF_OCR_CONCURRENCY) if images else 1
    return await asyncio.wait_for(
        asyncio.gather(*(_run(i, img) for i, img in zip(page_indexes, images, strict=True))),
        timeout=get_settings().timeouts.file * rounds,
    )


async def _extract_pdf_with_ocr(data: bytes) -> str:
    """PDF의 텍스트 레이어를 사용하지 않고 모든 페이지를 이미지 OCR한다."""
    images = await asyncio.to_thread(_render_pdf_pages, data)
    # 실제 전체 페이지 수는 안내 문구에만 쓰는 부가 정보다 — 이미 렌더링에
    # 성공한 뒤이므로 여기서 다시 못 열더라도(예: 테스트가 렌더링만
    # 대역으로 바꾼 경우) 안내를 생략할 뿐 추출 자체를 실패시키지 않는다.
    try:
        total_pages = await asyncio.to_thread(_pdf_total_page_count, data)
    except FileUnreadableError:
        total_pages = len(images)
    if total_pages > len(images):
        logger.info(
            "PDF 페이지 상한 초과, 앞 %d페이지만 처리합니다 (전체 %d페이지)",
            len(images),
            total_pages,
        )
    logger.info("PDF 전체 페이지 OCR 준비 완료 (pages=%d)", len(images))
    llm = get_file_processor_llm()
    semaphore = asyncio.Semaphore(PDF_OCR_CONCURRENCY)

    async def _run(index: int, image: bytes) -> tuple[int, str]:
        async with semaphore:
            logger.info(
                "PDF %d페이지 OCR 시작 (image_bytes=%d)",
                index + 1,
                len(image),
            )
            try:
                # 페이지 하나당 예산은 timeouts.file 그대로 유지한다 — 이 값이
                # 원래 "OCR 호출 하나"를 기준으로 정해졌기 때문이다. 아래
                # _run_all 전체를 감싸는 wait_for가 이 값을 그대로 다시 쓰면
                # 페이지 수·동시성에 따라 여러 라운드가 걸리는 지금 구조에서는
                # 페이지가 전부 정상 처리돼도 총 시간이 그 예산을 넘겨 통째로
                # 실패할 수 있다.
                text = await asyncio.wait_for(
                    _ocr_image(
                        llm,
                        image,
                        "image/png",
                        f"{OCR_INSTRUCTION}\n- PDF의 {index + 1}페이지입니다. "
                        "이 페이지만 옮겨 적습니다.\n",
                    ),
                    timeout=get_settings().timeouts.file,
                )
            except Exception:
                logger.exception(
                    "PDF %d페이지 OCR 실패 (image_bytes=%d)",
                    index + 1,
                    len(image),
                )
                raise
            logger.info("PDF %d페이지 OCR 완료 (text_chars=%d)", index + 1, len(text))
            return index, text

    async def _run_all() -> list[tuple[int, str]]:
        tasks: list[asyncio.Task[tuple[int, str]]] = []
        async with asyncio.TaskGroup() as group:
            for index, image in enumerate(images):
                tasks.append(group.create_task(_run(index, image)))
        return [task.result() for task in tasks]

    # 페이지별 타임아웃은 위 _run 안에서 이미 강제한다. 여기서는 동시성
    # 라운드 수에 비례해 전체 예산을 늘려서, 개별 페이지는 모두 제 시간 안에
    # 끝났는데도 라운드가 여러 번 돌았다는 이유만으로 전체가 타임아웃되는
    # 것을 막는다 — 그래도 바깥쪽 wait_for를 두는 건 TaskGroup 자체가 어떤
    # 이유로든 끝나지 않는 극단적인 경우를 막는 안전망이다.
    rounds = math.ceil(len(images) / PDF_OCR_CONCURRENCY) if images else 1
    results = await asyncio.wait_for(_run_all(), timeout=get_settings().timeouts.file * rounds)
    results.sort(key=lambda result: result[0])
    text = "\n\n".join(text for _, text in results if text.strip()).strip()
    if not text:
        raise FileUnreadableError("파일에서 텍스트를 찾지 못했습니다.")
    if total_pages > len(images):
        text += PAGE_TRUNCATION_NOTE.format(limit=len(images), total=total_pages)
    return _truncate(text)


async def extract_with_ocr(data: bytes, filename: str, content_type: str) -> str:
    """OCR 모델로 텍스트를 뽑는다 (PDF·PNG·JPEG).

    PDF는 텍스트 레이어 유무와 관계없이 모든 페이지를 PNG로 렌더링해 페이지별
    OCR 요청으로 나눈다. PDF 원본이나 최대 10페이지의 이미지를 한 요청에
    몰아넣지 않는다. PNG·JPEG는 그대로 한 번 OCR한다.

    Raises:
        FileUnreadableError: 모델이 읽을 내용을 찾지 못함, 또는 PDF 자체를 열 수 없음
        Exception: 시스템 오류 (타임아웃·API 실패) — 노드 실패로 올라간다
    """
    if content_type == "application/pdf":
        return await _extract_pdf(data)

    llm = get_file_processor_llm()
    text = await asyncio.wait_for(
        _ocr_image(llm, data, content_type, OCR_INSTRUCTION),
        timeout=get_settings().timeouts.file,
    )
    if not text:
        # 모델은 정상 응답했는데 읽을 글자가 없다. 스캔 품질 문제이거나 빈 문서다.
        raise FileUnreadableError("파일에서 텍스트를 찾지 못했습니다.")

    return _truncate(text)


async def extract(data: bytes, filename: str, content_type: str) -> str:
    """형식에 맞는 경로로 텍스트를 뽑는다.

    Raises:
        FileUnreadableError: 파일 품질 문제 (Fallback 대상)
    """
    if content_type in PARSER_MIME_TYPES:
        return await extract_with_parser(data, filename, content_type)
    if content_type in OCR_MIME_TYPES:
        return await extract_with_ocr(data, filename, content_type)

    # 업로드 검증(3.07)을 통과했다면 여기 오지 않는다.
    raise FileUnreadableError(f"지원하지 않는 형식입니다: {content_type}")


def extractor_kind(content_type: str) -> str:
    """`parser` 또는 `ocr`"""
    return "parser" if content_type in PARSER_MIME_TYPES else "ocr"
