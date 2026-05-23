"""
File parsing — HWPML (.hwp XML), HWPX (.hwpx ZIP), and pre-parsed JSON.

All parsing logic is self-contained in this module; no src/ imports needed.
Claude API is used automatically when ANTHROPIC_API_KEY is set.

Image extraction is bolted on top: every question can carry a list of images
that were embedded in the corresponding paragraph block in the original file.
"""

import base64
import io
import json
import os
import re
import xml.etree.ElementTree as ET
import zipfile
import zlib
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


# ── Image extraction ──────────────────────────────────────────────────────────
# A document yields an ordered stream of "events":
#   ("text", offset_or_index, text)
#   ("image", offset_or_index, bytes, mime_type)
# We then match each image to the question whose first prompt line appears just
# before the image's position. Images that show up before the first question
# (typically a page-header/logo) and obvious duplicates are dropped.

# Known image media-type → safe extension we serve from /api/images/.
_MIME_EXT = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/bmp": "bmp",
}


def _hwpml_image_events(content: str) -> tuple[list[tuple], dict[str, tuple[bytes, str]]]:
    """For a .hwp HWPML XML string, return (events, blobs).
    events: ordered list of ('text', off, text) | ('image', off, bin_id) tuples in body order.
    blobs: {bin_id: (raw_bytes, mime_type)} decoded from <BINDATASTORAGE>.
    """
    # Format declared in HEAD's BINDATALIST.
    formats: dict[str, str] = {}
    for m in re.finditer(r'<BINITEM BinData="(\d+)" Format="(\w+)"', content):
        formats[m.group(1)] = m.group(2).lower()

    # Binary blobs in TAIL's BINDATASTORAGE (base64). Each <BINDATA> can be
    # marked Compress="true" — in that case the base64-decoded payload is
    # raw zlib deflate that we need to inflate before getting the actual
    # image bytes.
    blobs: dict[str, tuple[bytes, str]] = {}
    for m in re.finditer(r"<BINDATA\b([^>]*)>([^<]+)</BINDATA>", content):
        attrs, payload = m.group(1), m.group(2)
        id_m = re.search(r'Id="(\d+)"', attrs)
        enc_m = re.search(r'Encoding="(\w+)"', attrs)
        if not id_m or not enc_m or enc_m.group(1).lower() != "base64":
            continue
        bin_id = id_m.group(1)
        compressed = bool(re.search(r'Compress="true"', attrs, re.IGNORECASE))
        try:
            raw = base64.b64decode(payload.strip(), validate=False)
        except Exception:
            continue
        if compressed:
            try:
                raw = zlib.decompress(raw, -15)  # raw DEFLATE (no zlib header)
            except Exception:
                try:
                    raw = zlib.decompress(raw)
                except Exception:
                    continue
        fmt = formats.get(bin_id, "bin")
        mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
                "bmp": "image/bmp", "gif": "image/gif"}.get(fmt, "application/octet-stream")
        blobs[bin_id] = (raw, mime)

    # Events from BODY only.
    body_start = content.find("<BODY>")
    body_end = content.find("</BODY>", body_start) if body_start >= 0 else -1
    if body_start < 0 or body_end < 0:
        return [], blobs

    events: list[tuple] = []
    for m in re.finditer(r"<CHAR>([^<]*)</CHAR>", content):
        if not (body_start <= m.start() < body_end):
            continue
        text = (m.group(1)
                .replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")
                .strip())
        if text:
            events.append(("text", m.start(), text))
    for m in re.finditer(r'<IMAGE[^>]*BinItem="(\d+)"', content):
        if body_start <= m.start() < body_end:
            events.append(("image", m.start(), m.group(1)))

    events.sort(key=lambda e: e[1])
    return events, blobs


def _hwpx_image_events(zip_path: str) -> tuple[list[tuple], dict[str, tuple[bytes, str]]]:
    """For a .hwpx file, return (events, blobs).
    Uses content.hpf manifest to resolve binaryItemIDRef → BinData/imageN.{ext}."""
    with zipfile.ZipFile(zip_path) as z:
        names = z.namelist()
        hpf = z.read("Contents/content.hpf").decode("utf-8", errors="replace")
        # id → (href, mime)
        manifest: dict[str, tuple[str, str]] = {}
        for m in re.finditer(
            r'<opf:item\s+id="([^"]+)"\s+href="([^"]+)"\s+media-type="([^"]+)"',
            hpf,
        ):
            mid, href, mt = m.group(1), m.group(2), m.group(3).strip()
            manifest[mid] = (href, mt)

        blobs: dict[str, tuple[bytes, str]] = {}
        for mid, (href, mt) in manifest.items():
            if href.startswith("BinData/") and href in names:
                blobs[mid] = (z.read(href), mt)

        events: list[tuple] = []
        section_files = sorted(n for n in names
                               if n.startswith("Contents/section") and n.endswith(".xml"))
        # We give each event a synthetic ascending offset across sections.
        offset_base = 0
        for sec in section_files:
            xml = z.read(sec).decode("utf-8", errors="replace")
            for m in re.finditer(r"<hp:t[^>]*>([^<]*)</hp:t>", xml):
                text = (m.group(1)
                        .replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")
                        .strip())
                if text:
                    events.append(("text", offset_base + m.start(), text))
            for m in re.finditer(r'binaryItemIDRef="([^"]+)"', xml):
                events.append(("image", offset_base + m.start(), m.group(1)))
            offset_base += len(xml) + 1

    events.sort(key=lambda e: e[1])
    return events, blobs


def _normalize_image_bytes(raw: bytes, mime: str) -> tuple[bytes, str, str]:
    """Convert BMP/oddball formats to PNG; otherwise pass through.
    Returns (bytes, mime, extension)."""
    if mime in ("image/png", "image/jpeg"):
        return raw, mime, _MIME_EXT[mime]
    try:
        from PIL import Image as PILImage
        with PILImage.open(io.BytesIO(raw)) as im:
            if im.mode in ("P", "RGBA"):
                im = im.convert("RGBA")
            else:
                im = im.convert("RGB")
            buf = io.BytesIO()
            im.save(buf, format="PNG", optimize=True)
        return buf.getvalue(), "image/png", "png"
    except Exception:
        return raw, mime, _MIME_EXT.get(mime, "bin")


def _attach_images(
    questions: list[dict],
    events: list[tuple],
    blobs: dict[str, tuple[bytes, str]],
    output_dir: Path,
    source_stem: str,
) -> int:
    """Locate each question's first prompt line in `events`, then attach any
    image events that fall between that question and the next.
    Writes blob files into output_dir; mutates `questions[i]['images']`.
    Returns the number of images attached.
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    text_events = [e for e in events if e[0] == "text"]

    def _strip(s: str) -> str:
        return re.sub(r"\s+", "", s)[:30]

    # 1. find anchor offset for each question
    q_offsets: list[tuple[int, int]] = []  # (offset, q_index)
    used = set()
    for qi, q in enumerate(questions):
        first_line = (q.get("content") or "").split("\n")[0].strip()
        if not first_line:
            continue
        needle = _strip(first_line)
        if not needle:
            continue
        for ti, (_kind, off, text) in enumerate(text_events):
            if ti in used:
                continue
            if needle in _strip(text):
                q_offsets.append((off, qi))
                used.add(ti)
                break

    if not q_offsets:
        return 0
    q_offsets.sort()
    first_q_off = q_offsets[0][0]

    # 2. write each *referenced* image blob to disk once. Skip blobs that
    # are declared in the HWPML/HWPX metadata but never used by the body —
    # they only inflate the static image directory.
    referenced_ids = {bid for kind, _off, bid in events if kind == "image"}
    saved_files: dict[str, tuple[str, str]] = {}  # bin_id → (filename, mime)
    for bin_id, (raw, mime) in blobs.items():
        if bin_id not in referenced_ids:
            continue
        norm_bytes, norm_mime, ext = _normalize_image_bytes(raw, mime)
        safe_stem = re.sub(r"[^\w가-힣\-]", "_", source_stem).strip("_") or "img"
        fname = f"{safe_stem}_{bin_id}.{ext}"
        (output_dir / fname).write_bytes(norm_bytes)
        saved_files[bin_id] = (fname, norm_mime)

    # 3. de-dup image references that appear more than once in the body
    # (headers/footers/logos). A bin_id that's referenced 3+ times almost
    # always is a header/logo — drop it.
    image_events = [(off, bid) for k, off, bid in events if k == "image"]
    ref_counts: dict[str, int] = {}
    for _off, bid in image_events:
        ref_counts[bid] = ref_counts.get(bid, 0) + 1
    suppressed = {bid for bid, c in ref_counts.items() if c >= 3}

    # The gap from each question's anchor to the *next* question's anchor
    # gives us the "valid range" for images belonging to that question. For
    # the last known question we fall back to 1.5× the median gap so that an
    # image that's clearly beyond the document segment we know about
    # (i.e. trailing questions our JSON didn't capture) is dropped instead
    # of being dumped on whatever question happened to be matched last.
    anchors = [o for o, _ in q_offsets]
    next_anchor = {}
    for i, (o, qi) in enumerate(q_offsets):
        next_anchor[qi] = q_offsets[i + 1][0] if i + 1 < len(q_offsets) else None
    if len(anchors) >= 2:
        diffs = [b - a for a, b in zip(anchors, anchors[1:])]
        diffs.sort()
        median_gap = diffs[len(diffs) // 2]
    else:
        median_gap = 10_000
    last_q_limit = q_offsets[-1][0] + int(median_gap * 1.5)

    attached = 0
    seen_per_q: dict[int, set] = {}
    for img_off, bid in image_events:
        if bid in suppressed:
            continue
        if img_off < first_q_off:
            continue
        if bid not in saved_files:
            continue
        owner = None
        for off, qi in q_offsets:
            if off <= img_off:
                owner = qi
            else:
                break
        if owner is None:
            continue
        nxt = next_anchor.get(owner)
        if nxt is not None and img_off >= nxt:
            continue
        if nxt is None and img_off >= last_q_limit:
            continue
        seen = seen_per_q.setdefault(owner, set())
        if bid in seen:
            continue
        seen.add(bid)
        fname, mime = saved_files[bid]
        questions[owner].setdefault("images", []).append({
            "filename": fname, "mime_type": mime,
        })
        attached += 1

    return attached


def attach_images_from_source(source_file: str, questions: list[dict], output_dir: Path) -> int:
    """Pull images out of a source .hwp/.hwpx file and attach to the matching
    questions in-place. Returns the count of attached images."""
    path = Path(source_file)
    ext = path.suffix.lower()
    stem = path.stem
    if ext in (".hwp", ".hwpml"):
        try:
            content = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            content = path.read_text(encoding="utf-8", errors="replace")
        events, blobs = _hwpml_image_events(content)
    elif ext == ".hwpx":
        events, blobs = _hwpx_image_events(str(path))
    else:
        return 0
    return _attach_images(questions, events, blobs, output_dir, stem)


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
