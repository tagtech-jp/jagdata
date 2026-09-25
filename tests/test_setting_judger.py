"""
Phase 1.1 — setting_judger 境界値テスト
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from setting_judger import (
    estimate_setting,
    get_rank,
    get_reliability,
    judge_extracted,
)


def test_high_setting():
    """BIG=16/REG=16 @4000G → 設定6最尤、信頼度高 → ランクS (ダウングレードなし)"""
    best, _ = estimate_setting(4000, 16, 16)
    assert best == 6
    reliability = get_reliability(4000)
    assert reliability == "高"
    rank = get_rank(best, reliability)
    assert rank == "S"


def test_low_setting():
    """BIG=10/REG=5 @4000G → 設定1か2最尤、ランクC or D"""
    best, _ = estimate_setting(4000, 10, 5)
    assert best in (1, 2)
    reliability = get_reliability(4000)
    rank = get_rank(best, reliability)
    assert rank in ("C", "D")


def test_shallow_reliability():
    """500G → 信頼度「低（参考程度）」"""
    rel = get_reliability(500)
    assert "低" in rel


def test_reliability_at_1000():
    """1000G境界: 1000G=中, 999G=低"""
    assert get_reliability(1000) == "中"
    assert "低" in get_reliability(999)


def test_reliability_at_2500():
    """2500G境界: 2500G=高, 2499G=中"""
    assert get_reliability(2500) == "高"
    assert get_reliability(2499) == "中"


def test_missing_fields():
    """big_count欠落 → error キーを返す"""
    result = judge_extracted({"total_games": 1000, "big_count": 5})
    assert result is not None
    assert "error" in result


def test_rank_down_on_low_reliability():
    """信頼度「低」でランク1段下げ: 設定6→A, 設定5→B, 設定1→D(下限)"""
    assert get_rank(6, "低（参考程度）") == "A"
    assert get_rank(5, "低（参考程度）") == "B"
    assert get_rank(1, "低（参考程度）") == "D"


def test_rank_no_downgrade_on_mid():
    """信頼度「中」ではダウングレードなし (高と同じ扱い)"""
    assert get_rank(6, "中") == "S"
    assert get_rank(5, "中") == "A"
    assert get_rank(1, "中") == "D"


def test_rank_no_downgrade_on_high():
    """信頼度「高」ではダウングレードなし"""
    assert get_rank(6, "高") == "S"
    assert get_rank(5, "高") == "A"
    assert get_rank(1, "高") == "D"
