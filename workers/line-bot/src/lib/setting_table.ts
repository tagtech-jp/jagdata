// マイジャグラーV 設定別確率テーブル定数 (北電子公式値準拠)
// 移植元: D:\jagdata\setting_table.py

export const BIG_DENOM: Record<number, number> = {
  1: 272.6, 2: 264.2, 3: 258.0,
  4: 252.2, 5: 244.5, 6: 240.9,
};

export const REG_DENOM: Record<number, number> = {
  1: 436.0, 2: 400.8, 3: 341.3,
  4: 307.3, 5: 282.5, 6: 268.0,
};

export const COMBINED_DENOM: Record<number, number> = Object.fromEntries(
  [1, 2, 3, 4, 5, 6].map((s) => [
    s,
    Math.round((BIG_DENOM[s] * REG_DENOM[s]) / (BIG_DENOM[s] + REG_DENOM[s]) * 10) / 10,
  ])
);
