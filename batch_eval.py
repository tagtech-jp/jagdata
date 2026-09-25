#!/usr/bin/env python3
"""
jagdata Phase 0.5 — バッチ精度評価スクリプト
test_images/ 内の全画像を順次評価し、集計サマリーを JSON で出力する。
API呼び出し失敗時はスキップして error_count に記録する。
"""
import json
import sys
from datetime import datetime
from pathlib import Path

from gemini_vision_test import (
    FIELDS_TOTAL,
    MIME_MAP,
    call_gemini,
    evaluate,
    parse_extracted,
)

# Windows PowerShell の cp932 問題対策（pythonw対応: None チェック必須）
for _s in ("stdout", "stderr"):
    _stream = getattr(__import__("sys"), _s, None)
    if _stream and hasattr(_stream, "reconfigure"):
        try:
            _stream.reconfigure(encoding="utf-8")
        except Exception:
            pass

IMAGES_DIR = Path("test_images")
REPORTS_DIR = Path("reports")
MODEL = "gemini-2.5-flash"


def collect_images(images_dir: Path) -> list[Path]:
    exts = set(MIME_MAP.keys())
    return sorted(p for p in images_dir.iterdir() if p.suffix.lower() in exts)


def eval_one(image_path: Path) -> dict:
    try:
        raw_text, elapsed = call_gemini(image_path)
        extracted = parse_extracted(raw_text)
        evaluation = evaluate(extracted, elapsed)
        return {
            "image_path": str(image_path),
            "model": MODEL,
            "status": "ok",
            "extracted": extracted,
            "evaluation": evaluation,
            "timestamp": datetime.now().isoformat(),
        }
    except Exception as e:
        return {
            "image_path": str(image_path),
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat(),
        }


def build_summary(results: list[dict]) -> dict:
    ok = [r for r in results if r["status"] == "ok"]
    if not ok:
        return {
            "total_images": len(results),
            "success_count": 0,
            "error_count": len(results),
            "detection_rate": {"avg": None, "min": None, "max": None},
            "response_seconds": {"avg": None, "min": None, "max": None},
            "field_detection_rates": {},
        }

    rates = [r["evaluation"]["detection_rate"] for r in ok]
    times = [r["evaluation"]["response_seconds"] for r in ok]

    field_keys = [
        "machine_name", "total_games", "big_count", "reg_count",
        "big_probability", "reg_probability", "combined_probability", "total_diff_coins",
    ]
    field_rates = {
        f: round(sum(1 for r in ok if r["extracted"].get(f) is not None) / len(ok), 3)
        for f in field_keys
    }

    return {
        "total_images": len(results),
        "success_count": len(ok),
        "error_count": len(results) - len(ok),
        "detection_rate": {
            "avg": round(sum(rates) / len(rates), 3),
            "min": min(rates),
            "max": max(rates),
        },
        "response_seconds": {
            "avg": round(sum(times) / len(times), 2),
            "min": min(times),
            "max": max(times),
        },
        "field_detection_rates": field_rates,
    }


def main() -> None:
    if not IMAGES_DIR.exists():
        print(f"ERROR: 画像フォルダが見つかりません: {IMAGES_DIR}", file=sys.stderr)
        sys.exit(1)

    images = collect_images(IMAGES_DIR)
    if not images:
        print(
            f"ERROR: {IMAGES_DIR}/ に対応画像 (.png/.jpg/.jpeg/.webp) がありません",
            file=sys.stderr,
        )
        sys.exit(1)

    print(f"評価対象: {len(images)} 枚", file=sys.stderr)

    results = []
    for i, img in enumerate(images, 1):
        print(f"  [{i}/{len(images)}] {img.name} ...", file=sys.stderr)
        result = eval_one(img)
        results.append(result)
        if result["status"] == "ok":
            dr = result["evaluation"]["detection_rate"]
            sec = result["evaluation"]["response_seconds"]
            print(f"    → detection_rate={dr:.3f}, {sec:.2f}s", file=sys.stderr)
        else:
            print(f"    → ERROR: {result['error']}", file=sys.stderr)

    summary = build_summary(results)

    REPORTS_DIR.mkdir(exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = REPORTS_DIR / f"batch_{ts}.json"
    report = {
        "batch_timestamp": datetime.now().isoformat(),
        "images_dir": str(IMAGES_DIR),
        "summary": summary,
        "results": results,
    }
    report_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f"\nレポート保存: {report_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
