import type { JudgmentResult } from './setting_judger';

const RANK_LABEL: Record<string, string> = {
  S: '高設定確実', A: '高設定示唆', B: '中設定', C: '低設定示唆', D: '低設定確実',
};

const ACTION_MAP: Record<string, string> = {
  S: '続行強推奨', A: '続行推奨', B: '継続判断保留', C: '撤退検討', D: '撤退推奨',
};

const DISCLAIMER = '⚠️ 本ツールは設定を断定しません。判定結果は確率的推測であり、実際の設定とは異なる場合があります。';

export function formatJudgmentResult(result: JudgmentResult): string {
  const rankLabel = RANK_LABEL[result.rank] ?? '';
  const action = ACTION_MAP[result.rank] ?? '判断保留';

  return [
    '🎰 マイジャグラーV 判定結果',
    '',
    `📊 ランク: ${result.rank} (${rankLabel})`,
    `🎯 最尤設定: ${result.best_setting}`,
    `📈 可能性のある設定: ${result.setting_range}`,
    `🔍 信頼度: ${result.reliability}`,
    '',
    ...result.reasons.map((r) => `・${r}`),
    '',
    `💡 アクション: ${action}`,
    '',
    DISCLAIMER,
  ].join('\n');
}
