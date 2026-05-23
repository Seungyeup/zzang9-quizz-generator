"""
Initialize the database with pre-parsed sample data plus image extraction.

Each JSON file under data/ supplies the textual content (question_no, content,
choices, answer, explanation). If a sibling .hwp/.hwpx exists with the same
source_file name, we additionally parse its embedded images and link them to
the matching questions.

Idempotent — already-loaded sources are skipped.

Usage:
    python3 init_db.py
"""

import asyncio
import json
from pathlib import Path

from sqlalchemy import select

from models import AsyncSessionLocal, Base, Choice, Image, Question, Source, engine
from parser import attach_images_from_source

DATA_DIR = Path(__file__).parent / "data"
IMAGE_DIR = Path(__file__).parent / "static" / "images"


async def load_json(db, json_file: Path) -> tuple[int, int]:
    """Returns (question_count, image_count)."""
    data = json.loads(json_file.read_text(encoding="utf-8"))
    source_name = data.get("source_file", json_file.name)

    existing = (
        await db.execute(select(Source).where(Source.filename == source_name))
    ).scalar_one_or_none()
    if existing:
        print(f"  건너뜀 (이미 로드됨): {source_name}")
        return 0, 0

    questions = data.get("questions", [])

    # Try to find sibling .hwp/.hwpx for image extraction. The JSON's
    # source_file might use spaces while the JSON itself uses underscores —
    # we prefer the exact filename, falling back to a basename search.
    image_count = 0
    src_candidate = DATA_DIR / source_name
    if not src_candidate.exists():
        stem = Path(source_name).stem
        for ext in (".hwp", ".hwpx", ".hwpml"):
            alt = DATA_DIR / f"{stem}{ext}"
            if alt.exists():
                src_candidate = alt
                break
    if src_candidate.exists() and src_candidate.suffix.lower() in (".hwp", ".hwpx", ".hwpml"):
        try:
            image_count = attach_images_from_source(str(src_candidate), questions, IMAGE_DIR)
            if image_count:
                print(f"  · {image_count}개 이미지 추출 from {src_candidate.name}")
        except Exception as exc:
            print(f"  · 이미지 추출 실패 ({src_candidate.name}): {exc}")

    source = Source(filename=source_name, subject=None)
    db.add(source)
    await db.flush()

    for qd in questions:
        q = Question(
            source_id=source.id,
            question_no=qd.get("question_no", ""),
            content=qd.get("content", ""),
            answer=qd.get("answer"),
            explanation=qd.get("explanation"),
        )
        db.add(q)
        await db.flush()

        for cd in qd.get("choices", []):
            db.add(Choice(
                question_id=q.id,
                choice_no=cd.get("no", cd.get("choice_no", "")),
                content=cd.get("content", ""),
            ))
        for pos, img in enumerate(qd.get("images", [])):
            db.add(Image(
                question_id=q.id,
                position=pos,
                filename=img.get("filename"),
                mime_type=img.get("mime_type"),
            ))

    await db.commit()
    return len(questions), image_count


async def main():
    print("9짱 시험지 빌더 DB 초기화")
    print("=" * 40)

    IMAGE_DIR.mkdir(parents=True, exist_ok=True)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("테이블 생성 완료")

    json_files = sorted(DATA_DIR.glob("*.json"))
    if not json_files:
        print(f"\n데이터 파일이 없습니다: {DATA_DIR}")
        print("backend/data/ 폴더에 파싱된 JSON 파일을 넣어주세요.")
        return

    async with AsyncSessionLocal() as db:
        total_q, total_img = 0, 0
        for jf in json_files:
            print(f"\n로드 중: {jf.name}")
            n_q, n_img = await load_json(db, jf)
            if n_q:
                print(f"  → {n_q}개 문항 · {n_img}개 이미지 저장")
            total_q += n_q
            total_img += n_img

    print(f"\n{'=' * 40}")
    print(f"완료: 총 {total_q}개 문항 · {total_img}개 이미지가 DB에 저장되었습니다.")


if __name__ == "__main__":
    asyncio.run(main())
