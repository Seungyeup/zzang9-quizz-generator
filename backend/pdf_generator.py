"""
PDF and HTML generation — WeasyPrint + Jinja2.
NanumGothic font is auto-downloaded on first use.
"""

import urllib.request
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

_DIR = Path(__file__).parent
_FONT_PATH = _DIR / "static" / "fonts" / "NanumGothic.ttf"
_FONT_URL = "https://github.com/google/fonts/raw/main/ofl/nanumgothic/NanumGothic-Regular.ttf"

_env = Environment(loader=FileSystemLoader(str(_DIR / "templates")), autoescape=True)


def _font_uri() -> str:
    if not _FONT_PATH.exists():
        _FONT_PATH.parent.mkdir(parents=True, exist_ok=True)
        try:
            urllib.request.urlretrieve(_FONT_URL, _FONT_PATH)
        except Exception:
            return ""
    return _FONT_PATH.as_uri()


def render_html(questions: list[dict], settings: dict, preview_mode: bool = False) -> str:
    n = len(questions)
    mid = (n + 1) // 2
    return _env.get_template("worksheet.html").render(
        questions=questions,
        left_questions=questions[:mid],
        right_questions=questions[mid:],
        left_count=mid,
        settings=settings,
        font_path=_font_uri(),
        preview_mode=preview_mode,
    )


def render_pdf(questions: list[dict], settings: dict) -> bytes:
    html = render_html(questions, settings, preview_mode=False)
    return HTML(string=html, base_url=str(_DIR)).write_pdf()
