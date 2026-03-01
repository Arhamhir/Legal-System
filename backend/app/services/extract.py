from io import BytesIO
from pathlib import Path
from shutil import which
import pdfplumber
from PIL import Image
import pytesseract
from pytesseract import TesseractNotFoundError
from docx import Document


def _configure_tesseract_path() -> None:
    if which("tesseract"):
        return

    windows_candidates = [
        Path("C:/Program Files/Tesseract-OCR/tesseract.exe"),
        Path("C:/Program Files (x86)/Tesseract-OCR/tesseract.exe"),
    ]

    for candidate in windows_candidates:
        if candidate.exists():
            pytesseract.pytesseract.tesseract_cmd = str(candidate)
            return


_configure_tesseract_path()


def extract_text(file_name: str, content: bytes) -> str:
    suffix = Path(file_name).suffix.lower()
    if suffix == ".pdf":
        return _extract_pdf(content)
    if suffix == ".docx":
        return _extract_docx(content)
    if suffix in {".jpg", ".jpeg", ".png"}:
        return _extract_image_ocr(content)
    raise ValueError("Unsupported file type")


def _extract_pdf(content: bytes) -> str:
    text_parts = []
    try:
        with pdfplumber.open(BytesIO(content)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                text_parts.append(page_text)
    except Exception as error:
        raise RuntimeError("Could not read PDF. Please upload a valid PDF file.") from error

    merged = "\n".join(text_parts).strip()
    if merged:
        return merged
    return _extract_image_ocr(content, is_pdf=True)


def _extract_docx(content: bytes) -> str:
    try:
        document = Document(BytesIO(content))
        return "\n".join(paragraph.text for paragraph in document.paragraphs if paragraph.text.strip())
    except Exception as error:
        raise RuntimeError("Could not read DOCX. Please upload a valid DOCX file.") from error


def _extract_image_ocr(content: bytes, is_pdf: bool = False) -> str:
    if is_pdf:
        return ""
    try:
        image = Image.open(BytesIO(content)).convert("RGB")
        return pytesseract.image_to_string(image)
    except TesseractNotFoundError as error:
        raise RuntimeError(
            "Image OCR requires Tesseract OCR to be installed. Install Tesseract and add it to PATH."
        ) from error
    except Exception as error:
        raise RuntimeError("Could not read image. Please upload a valid JPG or PNG file.") from error
