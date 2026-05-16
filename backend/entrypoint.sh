#!/bin/sh
set -e

echo ">>> DB 초기화..."
python3 init_db.py

echo ">>> 서버 시작 (0.0.0.0:8001)..."
exec uvicorn main:app --host 0.0.0.0 --port 8001
