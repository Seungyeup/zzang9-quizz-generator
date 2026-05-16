"""
File parsing — HWPML (.hwp XML), HWPX (.hwpx ZIP), and pre-parsed JSON.

All parsing logic is self-contained in this module; no src/ imports needed.
Claude API is used automatically when ANTHROPIC_API_KEY is set.
"""

import json
import os
import re
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

# ── HWPML text extraction ─────────────────────────────────────────────────────

def _extract_hwpml_lines(file_path: str) -> list[str]:
    """Extract text lines from HWPML XML file via <CHAR> elements."""
    content = Path(file_path).read_text(encoding="utf-8")
    raw = re.findall(r"<CHAR>([^<]*)</CHAR>", content)
    lines = []
    for item in raw:
        text = (
            item.replace("&lt;", "<").replace("&gt;", ">")
            .replace("&amp;", "&").replace("&quot;", '"').replace("&apos;", "'")
            .strip()
        )
        if text:
            lines.append(text)
    return lines


# ── HWPX text extraction ──────────────────────────────────────────────────────

_HP = "http://www.hancom.co.kr/hwpml/2011/paragraph"


def _parse_section_xml(xml_data: bytes) -> list[str]:
    root = ET.fromstring(xml_data)
    result, seen = [], set()
    for p in root.iter(f"{{{_HP}}}p"):
        parts = [t.text for t in p.iter(f"{{{_HP}}}t") if t.text]
        line = "".join(parts).strip()
        if line and line not in seen:
            seen.add(line)
            result.append(line)
    return result


def _extract_hwpx(file_path: str) -> dict:
    """Returns {"preview_text": str, "paragraphs": list[str]}."""
    with zipfile.ZipFile(file_path) as z:
        names = z.namelist()
        preview = ""
        if "Preview/PrvText.txt" in names:
            preview = z.read("Preview/PrvText.txt").decode("utf-8", errors="replace").strip()
        paragraphs = []
        for sec in sorted(n for n in names if n.startswith("Contents/section") and n.endswith(".xml")):
            paragraphs.extend(_parse_section_xml(z.read(sec)))
    return {"preview_text": preview, "paragraphs": paragraphs}


# ── HWPML answer section parsing ──────────────────────────────────────────────

_HEADER_RE = re.compile(r"^(반|번|이름:|통합사회|※\s*대화를)")

def _is_header(line: str) -> bool:
    return line in {"반", "번", "이름:"} or bool(_HEADER_RE.match(line))


def _find_section_boundary(lines: list[str]) -> int:
    count = 0
    for i, line in enumerate(lines):
        if line == "반":
            count += 1
            if count >= 2:
                return i
    return len(lines)


def _split_answer_section(lines: list[str]) -> tuple[list[str], list[str]]:
    for i, line in enumerate(lines):
        if re.match(r"^\(답\)", line):
            return lines[:i], lines[i:]
    return lines, []


def _extract_answer_pairs(answer_lines: list[str]) -> list[dict]:
    pairs, current = [], None
    for line in answer_lines:
        m_ans = re.match(r"^\(답\)\s*(.+)$", line)
        m_exp = re.match(r"^\(해설\)\s*(.*)$", line)
        if m_ans:
            if current:
                pairs.append(current)
            current = {"answer": m_ans.group(1).strip(), "explanation": ""}
        elif m_exp and current is not None:
            current["explanation"] = m_exp.group(1).strip()
        elif current is not None and not _is_header(line) and line:
            current["explanation"] = (current["explanation"] + " " + line).strip()
    if current:
        pairs.append(current)
    return pairs


# ── Claude API helpers (optional) ─────────────────────────────────────────────

_HWPML_SYSTEM = """당신은 한국 교육 문제지의 텍스트를 파싱하는 전문가입니다.
아래 원시 텍스트에서 모든 문제를 추출하여 JSON 배열로 반환하세요.

각 문제 형식:
{"content": "문제 지시문+지문+<보기>", "choices": [{"no": "①", "content": "선택지"}]}

규칙:
1. ①②③④⑤는 선택지 번호
2. 번호 없이 나열된 5개 문장도 선택지 → ①②③④⑤ 순서로 번호 부여
3. 보기(ㄱ,ㄴ,ㄷ,ㄹ)는 content에 포함
4. (가)(나)(다)(라) 지문 레이블과 내용은 content에 포함
5. 열 헤더 표 선택지: "(가) A / (나) B" 형태로 병합
6. 공유 지문 → 각 하위 문항을 별도 문제로
7. 문제 사이 구분선/헤더는 무시
8. JSON 배열만 반환"""

_HWPX_SYSTEM = """당신은 한국 역사 과제집의 텍스트를 파싱하는 전문가입니다.
문제들을 JSON 배열로 파싱하세요:
[{"question_no":"1","content":"문제 지시문과 본문","choices":[],"answer":null,"explanation":null}]
규칙:
- "다음 ... 하시오." 등이 새 문제의 시작
- 선택지 없음 (choices: [])
- JSON 배열만 반환"""


def _claude_parse_hwpml(q_text: str, expected: int) -> list[dict]:
    import anthropic
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    resp = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=8192,
        system=[{"type": "text", "text": _HWPML_SYSTEM, "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": f"총 {expected}개 문제를 추출하세요.\n\n{q_text}"}],
    )
    text = resp.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


def _claude_parse_hwpx(preview: str, paragraphs: list[str]) -> list[dict]:
    import anthropic
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    combined = f"[Preview]\n{preview}\n\n[Paragraphs]\n" + "\n".join(paragraphs)
    resp = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=[{"type": "text", "text": _HWPX_SYSTEM, "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": f"파싱하세요:\n\n{combined}"}],
    )
    text = resp.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


# ── Rule-based fallback ───────────────────────────────────────────────────────

_CIRCLED = ["①", "②", "③", "④", "⑤"]
_CIRCLED_SET = set(_CIRCLED)


def _starts_with_circled(line: str) -> tuple[str, str]:
    for c in _CIRCLED:
        if line.startswith(c):
            return c, line[len(c):].strip()
    return "", line


def _is_bare_circled(line: str) -> bool:
    return line in _CIRCLED_SET


def _rule_parse_hwpml(q_lines: list[str]) -> list[dict]:
    """Fallback: split on ⑤ boundaries, extract choices."""
    blocks, current = [], []
    wait_fifth_text = False
    last_was_fifth = False

    def flush():
        nonlocal current, wait_fifth_text, last_was_fifth
        if current:
            blocks.append(list(current))
        current, wait_fifth_text, last_was_fifth = [], False, False

    for line in q_lines:
        if _is_header(line):
            continue
        if last_was_fifth:
            flush()
        if wait_fifth_text:
            current.append(line)
            wait_fifth_text, last_was_fifth = False, True
            continue
        if line.startswith("⑤") and line != "⑤":
            current.append(line)
            last_was_fifth = True
            continue
        if line == "⑤":
            current.append(line)
            wait_fifth_text = True
            continue
        current.append(line)
    flush()

    result = []
    for block in blocks:
        choices, content_parts = [], []
        i = 0
        in_choices = False
        while i < len(block):
            line = block[i]
            if _is_bare_circled(line):
                in_choices = True
                text = ""
                if i + 1 < len(block) and not _is_bare_circled(block[i+1]) and not _starts_with_circled(block[i+1])[0]:
                    text = block[i+1]
                    i += 1
                choices.append({"no": line, "content": text})
            else:
                marker, rest = _starts_with_circled(line)
                if marker:
                    in_choices = True
                    choices.append({"no": marker, "content": rest})
                elif not in_choices:
                    content_parts.append(line)
            i += 1
        result.append({"content": "\n".join(content_parts).strip(), "choices": choices})
    return result


# ── Public API ────────────────────────────────────────────────────────────────

def parse_file(file_path: str) -> dict:
    """
    Parse a quiz file → {"source_file": str, "questions": [...]}.
    Accepts .json, .hwp/.hwpml, .hwpx
    """
    path = Path(file_path)
    ext = path.suffix.lower()

    if ext == ".json":
        data = json.loads(path.read_text(encoding="utf-8"))
        for q in data.get("questions", []):
            q["choices"] = [
                {"no": c.get("no", c.get("choice_no", "")), "content": c.get("content", "")}
                for c in q.get("choices", [])
            ]
        return data

    elif ext in (".hwp", ".hwpml"):
        lines = _extract_hwpml_lines(file_path)
        boundary = _find_section_boundary(lines)
        q_lines = lines[:boundary]
        remainder = lines[boundary:]
        q_extra, answer_lines = _split_answer_section(remainder)
        q_lines += q_extra
        answer_pairs = _extract_answer_pairs(answer_lines)

        if os.environ.get("ANTHROPIC_API_KEY"):
            raw = _claude_parse_hwpml("\n".join(q_lines), len(answer_pairs))
        else:
            raw = _rule_parse_hwpml(q_lines)

        questions = []
        for i, rq in enumerate(raw):
            ans = answer_pairs[i] if i < len(answer_pairs) else {}
            questions.append({
                "question_no": str(i + 1),
                "content": rq.get("content", ""),
                "choices": rq.get("choices", []),
                "answer": ans.get("answer"),
                "explanation": ans.get("explanation"),
            })
        return {"source_file": path.name, "questions": questions}

    elif ext == ".hwpx":
        extracted = _extract_hwpx(file_path)
        if os.environ.get("ANTHROPIC_API_KEY"):
            raw = _claude_parse_hwpx(extracted["preview_text"], extracted["paragraphs"])
        else:
            # Minimal rule-based split on question starters
            raw = []
            for i, part in enumerate(re.split(r"\n(?=다음|[①-⑤]|\d+\.)", extracted["preview_text"])):
                part = part.strip()
                if len(part) > 10:
                    raw.append({"question_no": i + 1, "content": part, "choices": []})

        questions = []
        for i, rq in enumerate(raw):
            questions.append({
                "question_no": str(rq.get("question_no", i + 1)),
                "content": rq.get("content", ""),
                "choices": rq.get("choices", []),
                "answer": rq.get("answer"),
                "explanation": rq.get("explanation"),
            })
        return {"source_file": path.name, "questions": questions}

    else:
        raise ValueError(f"지원하지 않는 파일 형식: {ext}")
