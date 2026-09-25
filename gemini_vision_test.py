#!/usr/bin/env python3
"""
jagdata Phase 0 — Gemini Vision 精度評価スクリプト
対象: マイジャグラーV / ホールデータ表示機スクリーンショット
モデル: gemini-2.5-flash (Phase 0固定)
"""
import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# Windows PowerShell の cp932 問題対策（pythonw対応: None チェック必須）
for _s in ("stdout", "stderr"):
    _stream = getattr(__import__("sys"), _s, None)
    if _stream and hasattr(_stream, "reconfigure"):
        try:
            _stream.reconfigure(encoding="utf-8")
        except Exception:
            pass

FIELDS_TOTAL = 8

PROMPT = """\
この画像はパチスロ「マイジャグラーV」のホールデータ表示機（オメガ等）の\
スクリーンショットです。
以下の項目を画像から読み取り、JSON形式のみで返してください。
読み取れない項目は null としてください。
確率は "1/XXX" の形式の文字列で返してください（Xは整数）。
差枚数はプラスマイナスを含む整数で返してください。
説明文やマークダウンは不要です。JSONのみ返してください。

【確率フィールドの補足】
big_probability と reg_probability が画面に直接表示されていない場合は、
抽出した total_games ÷ big_count および total_games ÷ reg_count を計算し、
1/X 形式（Xは整数、四捨五入）で返してください。

【差枚フィールドの補足】
total_diff_coins は「差枚」「累計差枚」「スランプグラフ末尾の数値」
「+XXX」「-XXX」「±XXX枚」など様々な表記で表示される場合があります。

{
  "machine_name": "機種名（文字列）",
  "total_games": 総ゲーム数（整数）,
  "big_count": BIG回数（整数）,
  "reg_count": REG回数（整数）,
  "big_probability": "BIG確率（1/XXX形式）",
  "reg_probability": "REG確率（1/XXX形式）",
  "combined_probability": "合算確率（1/XXX形式）",
  "total_diff_coins": 差枚数（整数、プラスマイナス含む）
}
"""

MIME_MAP = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
}


def load_api_key() -> str:
    key = os.environ.get("GEMINI_API_KEY", "")
    if not key or key == "your_key_here":
        print("ERROR: .env に GEMINI_API_KEY が設定されていません", file=sys.stderr)
        sys.exit(1)
    return key


def call_gemini(image_path: Path) -> tuple[str, float]:
    client = genai.Client(api_key=load_api_key())

    mime_type = MIME_MAP.get(image_path.suffix.lower(), "image/png")
    image_bytes = image_path.read_bytes()

    image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

    start = datetime.now()
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[image_part, PROMPT],
    )
    elapsed = (datetime.now() - start).total_seconds()

    return response.text, elapsed


def parse_extracted(raw_text: str) -> dict:
    text = raw_text.strip()
    # マークダウンコードブロックを除去
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        data = {}

    keys = [
        "machine_name", "total_games", "big_count", "reg_count",
        "big_probability", "reg_probability", "combined_probability", "total_diff_coins",
    ]
    return {k: data.get(k) for k in keys}


def evaluate(extracted: dict, elapsed: float) -> dict:
    detected = sum(1 for v in extracted.values() if v is not None)
    return {
        "fields_detected": detected,
        "fields_total": FIELDS_TOTAL,
        "detection_rate": round(detected / FIELDS_TOTAL, 3),
        "response_seconds": round(elapsed, 2),
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="ジャグラー画像認識精度評価 (Phase 0 / マイジャグラーV / gemini-2.5-flash)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "使い方:\n"
            "  python gemini_vision_test.py test_images\\myj5_unknown_001.png\n\n"
            "画像命名規則:\n"
            "  myj5_s4_001.png    (設定4が既知の場合)\n"
            "  myj5_unknown_001.png  (設定不明の場合)\n\n"
            "出力: JSON (stdout) / エラー: stderr\n"
            "詳細は README.md を参照してください。"
        ),
    )
    parser.add_argument("image", help="評価対象の画像ファイルパス")
    args = parser.parse_args()

    image_path = Path(args.image)
    if not image_path.exists():
        print(f"ERROR: 画像ファイルが見つかりません: {image_path}", file=sys.stderr)
        sys.exit(1)
    if image_path.suffix.lower() not in MIME_MAP:
        print(f"ERROR: 未対応の画像形式です: {image_path.suffix}", file=sys.stderr)
        sys.exit(1)

    raw_text, elapsed = call_gemini(image_path)
    extracted = parse_extracted(raw_text)
    evaluation = evaluate(extracted, elapsed)

    result = {
        "image_path": str(image_path),
        "model": "gemini-2.5-flash",
        "extracted": extracted,
        "raw_text": raw_text,
        "evaluation": evaluation,
        "timestamp": datetime.now().isoformat(),
    }

    out = json.dumps(result, ensure_ascii=False, indent=2).encode("utf-8") + b"\n"
    sys.stdout.buffer.write(out)
    sys.stdout.buffer.flush()


if __name__ == "__main__":
    main()
