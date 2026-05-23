"""
PDF and HTML generation — WeasyPrint + Jinja2.
Noto Serif KR font is auto-downloaded on first use to give the paper a textbook feel.
"""

import urllib.request
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

_DIR = Path(__file__).parent
_FONT_PATH = _DIR / "static" / "fonts" / "NanumMyeongjo-Regular.ttf"
_FONT_URL = (
    "https://github.com/google/fonts/raw/main/ofl/nanummyeongjo/NanumMyeongjo-Regular.ttf"
)

_env = Environment(loader=FileSystemLoader(str(_DIR / "templates")), autoescape=True)


def _font_uri() -> str:
    if not _FONT_PATH.exists():
        _FONT_PATH.parent.mkdir(parents=True, exist_ok=True)
        try:
            urllib.request.urlretrieve(_FONT_URL, _FONT_PATH)
        except Exception:
            return ""
    return _FONT_PATH.as_uri()


def _enrich(questions: list[dict]) -> list[dict]:
    """Split content into (prompt, passage) — Korean exams put the question
    statement first and the supporting passage/data below it."""
    out = []
    for q in questions:
        lines = (q.get("content") or "").split("\n")
        nonempty = [l for l in lines if l.strip()]
        if len(nonempty) >= 2:
            prompt = nonempty[0]
            passage = "\n".join(nonempty[1:])
        else:
            prompt = nonempty[0] if nonempty else ""
            passage = ""
        qtype = q.get("type") or ("객관식" if q.get("choices") else "주관식")
        score = {
            "객관식": 4,
            "주관식": 5,
            "서술형": 6,
        }.get(qtype, 4)
        first_choice_text = None
        if q.get("answer") and q.get("choices"):
            for c in q["choices"]:
                if c.get("choice_no") == q["answer"]:
                    first_choice_text = c.get("content")
                    break
        out.append({
            **q,
            "passage": passage,
            "prompt": prompt,
            "type": qtype,
            "score": score,
            "answer_text": first_choice_text,
        })
    return out


def render_html(questions: list[dict], settings: dict, preview_mode: bool = False) -> str:
    enriched = _enrich(questions)
    total_score = sum(q.get("score", 4) for q in enriched)
    return _env.get_template("worksheet.html").render(
        questions=enriched,
        total_score=total_score,
        settings=settings,
        font_path=_font_uri(),
        preview_mode=preview_mode,
    )


def render_pdf(questions: list[dict], settings: dict) -> bytes:
    html = render_html(questions, settings, preview_mode=False)
    return HTML(string=html, base_url=str(_DIR)).write_pdf()
