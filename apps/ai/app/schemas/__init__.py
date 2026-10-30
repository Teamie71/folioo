"""API 스키마 패키지."""

from .common import ErrorResponse
from .pdf_extraction import PdfExtractionAcceptedResponse

__all__ = ["ErrorResponse", "PdfExtractionAcceptedResponse"]
