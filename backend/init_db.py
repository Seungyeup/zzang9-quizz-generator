"""
Initialize QuizCraft database with pre-parsed sample data.

Loads all JSON files from the data/ directory into SQLite.
Safe to run multiple times — skips already-loaded sources.

Usage:
    python3 init_db.py
"""

import asyncio
import json
from pathlib import Path

from sqlalchemy import select

from models import AsyncSessionLocal, Base, Choice, Question, Source, engine

DATA_DIR = Path(__file__).parent / "data"


async def load_json(db, json_file: Path) -> int:
    data = json.loads(json_file.read_text(encoding="utf-8"))
    source_name = data.get("source_file", json_file.name)

    existing = (
        await db.execute(select(Source).where(Source.filename == source_name))
    ).scalar_one_or_none()
    if existing:
        print(f"  건너뜀 (이미 로드됨): {source_name}")
        return 0

    source = Source(filename=source_name, subject=None)
    db.add(source)
    await db.flush()

    questions = data.get("questions", [])
    for qd in questions:
        q = Question(
            source_id=source.id,
            question_no=qd.get("question_no", ""),
            content=qd.get("content", ""),
            answer=qd.get("answer"),
            explanation=qd.get("explanation"),
            difficulty=qd.get("difficulty"),
            unit=qd.get("unit"),
        )
        db.add(q)
        await db.flush()

        for cd in qd.get("choices", []):
            db.add(Choice(
                question_id=q.id,
                choice_no=cd.get("no", cd.get("choice_no", "")),
                content=cd.get("content", ""),
            ))

    await db.commit()
    return len(questions)


async def main():
    print("QuizCraft DB 초기화")
    print("=" * 40)

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("테이블 생성 완료")

    json_files = sorted(DATA_DIR.glob("*.json"))
    if not json_files:
        print(f"\n데이터 파일이 없습니다: {DATA_DIR}")
        print("backend/data/ 폴더에 파싱된 JSON 파일을 넣어주세요.")
        return

    async with AsyncSessionLocal() as db:
        total = 0
        for jf in json_files:
            print(f"\n로드 중: {jf.name}")
            n = await load_json(db, jf)
            if n:
                print(f"  → {n}개 문제 저장 완료")
            total += n

    print(f"\n{'=' * 40}")
    print(f"완료: 총 {total}개 문제가 DB에 저장되었습니다.")


if __name__ == "__main__":
    asyncio.run(main())
