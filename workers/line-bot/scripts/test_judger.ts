// Python版 setting_judger.py との結果比較テスト
// 期待値は Python 実行で事前確認済み (temp_check_py_output.json)

import { judgeExtracted } from '../src/lib/setting_judger';

interface Expected {
  best_setting: number;
  setting_range: string;
  reliability: string;
  rank: string;
  continue_recommended: boolean | null;
}

const testCases: { name: string; input: Parameters<typeof judgeExtracted>[0]; expected: Expected }[] = [
  {
    name: 'DSC_0370',
    input: { total_games: 5750, big_count: 25, reg_count: 19 },
    expected: { best_setting: 5, setting_range: '設定3〜6寄り', reliability: '高', rank: 'A', continue_recommended: true },
  },
  {
    name: 'DSC_0464',
    input: { total_games: 8000, big_count: 26, reg_count: 27 },
    expected: { best_setting: 4, setting_range: '設定3〜6寄り', reliability: '高', rank: 'B', continue_recommended: null },
  },
  {
    name: 'myj5_unknown_001',
    input: { total_games: 1165, big_count: 2, reg_count: 9 },
    expected: { best_setting: 6, setting_range: '設定5〜6寄り', reliability: '中', rank: 'S', continue_recommended: true },
  },
];

let allPassed = true;

for (const tc of testCases) {
  const result = judgeExtracted(tc.input);

  if ('error' in result) {
    console.log(`[FAIL] ${tc.name}: unexpected error: ${result.error}`);
    allPassed = false;
    continue;
  }

  const checks: [string, unknown, unknown][] = [
    ['best_setting',         result.best_setting,         tc.expected.best_setting],
    ['setting_range',        result.setting_range,        tc.expected.setting_range],
    ['reliability',          result.reliability,          tc.expected.reliability],
    ['rank',                 result.rank,                 tc.expected.rank],
    ['continue_recommended', result.continue_recommended, tc.expected.continue_recommended],
  ];

  let casePassed = true;
  for (const [field, actual, expected] of checks) {
    if (actual !== expected) {
      console.log(`  [FAIL] ${tc.name}.${field}: expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`);
      casePassed = false;
      allPassed = false;
    }
  }

  if (casePassed) {
    console.log(
      `[PASS] ${tc.name}: best=${result.best_setting}, range=${result.setting_range}, reliability=${result.reliability}, rank=${result.rank}, continue=${result.continue_recommended}`
    );
  }
}

console.log('');
console.log(allPassed ? '✅ 全3件 PASS (Python版完全一致)' : '❌ 一部 FAIL');
process.exit(allPassed ? 0 : 1);
