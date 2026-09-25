// マイジャグラーV 設定判定ロジック
// 移植元: D:\jagdata\setting_judger.py (ポアソン対数尤度による最尤推定)

import { BIG_DENOM, REG_DENOM } from './setting_table';

const RANGE_LL_THRESHOLD = 0.5;
const RELIABILITY_THRESHOLD_HIGH = 2500;
const RELIABILITY_THRESHOLD_MID = 1000;
const RANK_MAP: Record<number, string> = { 6: 'S', 5: 'A', 4: 'B', 3: 'C', 2: 'C', 1: 'D' };
const RANK_ORDER = ['S', 'A', 'B', 'C', 'D'];

export const DISCLAIMER =
  '本ツールは設定を断定しません。続行・撤退判断を補助するMVPです。' +
  '実際の遊技判断はご自身の責任でお願いします。';

export interface ExtractedInput {
  total_games?: number | null;
  big_count?: number | null;
  reg_count?: number | null;
}

export interface JudgmentResult {
  best_setting: number;
  setting_range: string;
  reliability: string;
  rank: string;
  continue_recommended: boolean | null;
  reasons: string[];
  disclaimer: string;
}

function llComponent(n: number, k: number, denom: number): number {
  const p = 1.0 / denom;
  if (k === 0) return -n * p;
  return k * Math.log(p) - n * p;
}

function estimateSetting(
  totalGames: number,
  bigCount: number,
  regCount: number
): [number, Record<number, number>] {
  const scores: Record<number, number> = {};
  for (let s = 1; s <= 6; s++) {
    scores[s] =
      llComponent(totalGames, bigCount, BIG_DENOM[s]) +
      llComponent(totalGames, regCount, REG_DENOM[s]);
  }
  let best = 1;
  for (let s = 2; s <= 6; s++) {
    if (scores[s] > scores[best]) best = s;
  }
  return [best, scores];
}

function settingRangeStr(best: number, scores: Record<number, number>): string {
  const bestLl = scores[best];
  const plausible = [1, 2, 3, 4, 5, 6]
    .filter((s) => bestLl - scores[s] < RANGE_LL_THRESHOLD)
    .sort((a, b) => a - b);
  if (plausible.length === 1) return `設定${plausible[0]}`;
  return `設定${plausible[0]}〜${plausible[plausible.length - 1]}寄り`;
}

export function getReliability(totalGames: number): string {
  if (totalGames >= RELIABILITY_THRESHOLD_HIGH) return '高';
  if (totalGames >= RELIABILITY_THRESHOLD_MID) return '中';
  return '低（参考程度）';
}

export function getRank(bestSetting: number, reliability: string): string {
  const base = RANK_MAP[bestSetting];
  if (reliability.startsWith('低')) {
    const idx = RANK_ORDER.indexOf(base);
    return RANK_ORDER[Math.min(idx + 1, RANK_ORDER.length - 1)];
  }
  return base;
}

export function getContinueRecommended(rank: string): boolean | null {
  if (rank === 'S' || rank === 'A') return true;
  if (rank === 'B') return null;
  return false;
}

function buildReasons(
  totalGames: number,
  bigCount: number,
  regCount: number,
  bestSetting: number,
  reliability: string
): string[] {
  const reasons: string[] = [];

  const bigActual = bigCount > 0 ? Math.round((totalGames / bigCount) * 10) / 10 : null;
  const bigTheory = BIG_DENOM[bestSetting];
  if (bigActual !== null) {
    reasons.push(`BIG実績: 1/${bigActual} (設定${bestSetting}理論値 1/${bigTheory})`);
  }

  const regActual = regCount > 0 ? Math.round((totalGames / regCount) * 10) / 10 : null;
  const regTheory = REG_DENOM[bestSetting];
  if (regActual !== null) {
    reasons.push(`REG実績: 1/${regActual} (設定${bestSetting}理論値 1/${regTheory})`);
  }

  if (totalGames < RELIABILITY_THRESHOLD_MID) {
    reasons.push(`ゲーム数 ${totalGames}G — 少なく信頼度が低い`);
  } else if (totalGames < RELIABILITY_THRESHOLD_HIGH) {
    reasons.push(`ゲーム数 ${totalGames}G — 中程度の信頼度`);
  } else {
    reasons.push(`ゲーム数 ${totalGames}G — 十分なサンプル数`);
  }

  return reasons;
}

export function judgeExtracted(
  extracted: ExtractedInput
): JudgmentResult | { error: string } {
  const { total_games: totalGames, big_count: bigCount, reg_count: regCount } = extracted;

  const missing = (
    [
      ['total_games', totalGames],
      ['big_count', bigCount],
      ['reg_count', regCount],
    ] as [string, number | null | undefined][]
  )
    .filter(([, v]) => v === null || v === undefined)
    .map(([f]) => f);

  if (missing.length > 0) {
    return { error: `判定に必要なフィールドが不足: ${JSON.stringify(missing)}` };
  }

  const n = totalGames as number;
  const b = bigCount as number;
  const r = regCount as number;

  const [bestSetting, scores] = estimateSetting(n, b, r);
  const rangeStr = settingRangeStr(bestSetting, scores);
  const reliability = getReliability(n);
  const rank = getRank(bestSetting, reliability);
  const continueRecommended = getContinueRecommended(rank);
  const reasons = buildReasons(n, b, r, bestSetting, reliability);

  return {
    best_setting: bestSetting,
    setting_range: rangeStr,
    reliability,
    rank,
    continue_recommended: continueRecommended,
    reasons,
    disclaimer: DISCLAIMER,
  };
}
