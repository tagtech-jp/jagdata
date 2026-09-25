#!/usr/bin/env python3
"""
jagdata Phase 1.1 — マイジャグラーV 設定判定スクリプト

gemini_vision_test.py または batch_eval.py の出力 JSON を受け取り、
ポアソン対数尤度による最尤設定推定と続行/撤退判断ヒントを返す。
"""
import argparse
import json
import math
import sys
from pathlib import Path
from typing import Optional

from setting_table import BIG_DENOM, REG_DENOM

# Windows PowerShell の cp932 問題対策（pythonw対応: None チェック必須）
for _s in ("stdin", "stdout", "stderr"):
    _stream = getattr(__import__("sys"), _s, None)
    if _stream and hasattr(_stream, "reconfigure"):
        try:
            _stream.reconfigure(encoding="utf-8")
        except Exception:
            pass

DISCLAIMER = (
    "本ツールは設定を断定しません。続行・撤退判断を補助するMVPです。"
    "実際の遊技判断はご自身の責任でお願いします。"
)

RANGE_LL_THRESHOLD = 0.5

RELIABILITY_THRESHOLD_HIGH = 2500
RELIABILITY_THRESHOLD_MID = 1000

_RANK_MAP = {6: "S", 5: "A", 4: "B", 3: "C", 2: "C", 1: "D"}
_RANK_ORDER = ["S", "A", "B", "C", "D"]


def _ll_component(n: int, k: int, denom: float) -> float:
    """ポアソン対数尤度の1成分: k×ln(p) - n×p  (p = 1/denom)"""
    p = 1.0 / denom
    if k == 0:
        return -n * p
    return k * math.log(p) - n * p


def estimate_setting(
    total_games: int, big_count: int, reg_count: int
) -> tuple[int, dict[int, float]]:
    """BIG/REG 出現数から最尤設定とスコア辞書を返す"""
    scores = {
        s: _ll_component(total_games, big_count, BIG_DENOM[s])
        + _ll_component(total_games, reg_count, REG_DENOM[s])
        for s in range(1, 7)
    }
    best = max(scores, key=scores.__getitem__)
    return best, scores


def setting_range_str(best: int, scores: dict[int, float]) -> str:
    """LL差RANGE_LL_THRESHOLD以内の設定を「設定X〜Y寄り」形式で返す"""
    best_ll = scores[best]
    plausible = sorted(s for s, ll in scores.items() if best_ll - ll < RANGE_LL_THRESHOLD)
    if len(plausible) == 1:
        return f"設定{plausible[0]}"
    return f"設定{plausible[0]}〜{plausible[-1]}寄り"


def get_reliability(total_games: int) -> str:
    if total_games >= RELIABILITY_THRESHOLD_HIGH:
        return "高"
    if total_games >= RELIABILITY_THRESHOLD_MID:
        return "中"
    return "低（参考程度）"


def get_rank(best_setting: int, reliability: str) -> str:
    base = _RANK_MAP[best_setting]
    # 信頼度「低」のみランク1段階下げる
    if reliability.startswith("低"):
        idx = _RANK_ORDER.index(base)
        return _RANK_ORDER[min(idx + 1, len(_RANK_ORDER) - 1)]
    return base


def get_continue_recommended(rank: str) -> Optional[bool]:
    if rank in ("S", "A"):
        return True
    if rank == "B":
        return None
    return False


def build_reasons(
    total_games: int,
    big_count: int,
    reg_count: int,
    best_setting: int,
    reliability: str,
) -> list[str]:
    reasons = []

    big_actual = round(total_games / big_count, 1) if big_count > 0 else None
    big_theory = BIG_DENOM[best_setting]
    if big_actual is not None:
        reasons.append(
            f"BIG実績: 1/{big_actual} (設定{best_setting}理論値 1/{big_theory})"
        )

    reg_actual = round(total_games / reg_count, 1) if reg_count > 0 else None
    reg_theory = REG_DENOM[best_setting]
    if reg_actual is not None:
        reasons.append(
            f"REG実績: 1/{reg_actual} (設定{best_setting}理論値 1/{reg_theory})"
        )

    if total_games < RELIABILITY_THRESHOLD_MID:
        reasons.append(f"ゲーム数 {total_games}G — 少なく信頼度が低い")
    elif total_games < RELIABILITY_THRESHOLD_HIGH:
        reasons.append(f"ゲーム数 {total_games}G — 中程度の信頼度")
    else:
        reasons.append(f"ゲーム数 {total_games}G — 十分なサンプル数")

    return reasons


def judge_extracted(extracted: dict) -> Optional[dict]:
    total_games = extracted.get("total_games")
    big_count = extracted.get("big_count")
    reg_count = extracted.get("reg_count")

    missing = [
        f for f, v in [("total_games", total_games), ("big_count", big_count), ("reg_count", reg_count)]
        if v is None
    ]
    if missing:
        return {"error": f"判定に必要なフィールドが不足: {missing}"}

    best_setting, scores = estimate_setting(total_games, big_count, reg_count)
    range_str = setting_range_str(best_setting, scores)
    reliability = get_reliability(total_games)
    rank = get_rank(best_setting, reliability)
    continue_recommended = get_continue_recommended(rank)
    reasons = build_reasons(total_games, big_count, reg_count, best_setting, reliability)

    return {
        "best_setting": best_setting,
        "setting_range": range_str,
        "reliability": reliability,
        "rank": rank,
        "continue_recommended": continue_recommended,
        "reasons": reasons,
        "disclaimer": DISCLAIMER,
    }


def process_single(data: dict) -> dict:
    extracted = data.get("extracted", {})
    data["judgment"] = judge_extracted(extracted)
    return data


def process_batch(data: dict) -> dict:
    for result in data.get("results", []):
        if result.get("status") == "ok":
            extracted = result.get("extracted", {})
            result["judgment"] = judge_extracted(extracted)
        else:
            result["judgment"] = {"error": "APIエラーのためスキップ"}
    return data


def process_json(data: dict) -> dict:
    if "results" in data:
        return process_batch(data)
    return process_single(data)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="マイジャグラーV 設定判定ツール (Phase 1.1)"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--json", metavar="FILE", help="評価結果JSONファイルのパス")
    group.add_argument("--pipe", action="store_true", help="標準入力からJSONを読む")
    args = parser.parse_args()

    if args.pipe:
        raw = sys.stdin.read()
    else:
        raw = Path(args.json).read_text(encoding="utf-8")

    data = json.loads(raw)
    result = process_json(data)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
