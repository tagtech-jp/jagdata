// Gemini Vision API ローカルテスト
// 実行: $env:GEMINI_API_KEY = '<APIキー>' && npx tsx scripts/test_vision.ts

import { readFileSync } from 'node:fs';
import { callVision } from '../src/lib/gemini';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('ERROR: GEMINI_API_KEY 環境変数が未設定です');
  console.error('  $env:GEMINI_API_KEY = "<APIキー>"  を実行してから再試行してください');
  process.exit(1);
}

const IMAGE_PATH = 'D:\\jagdata\\test_images\\myj5_unknown_001.png';
const MIME_TYPE = 'image/png';

const nodeBuffer = readFileSync(IMAGE_PATH);
const buffer = nodeBuffer.buffer.slice(
  nodeBuffer.byteOffset,
  nodeBuffer.byteOffset + nodeBuffer.byteLength
) as ArrayBuffer;

console.log(`テスト画像: ${IMAGE_PATH}`);
console.log('Gemini Vision API 呼び出し中...\n');

async function main(): Promise<void> {
  const extracted = await callVision(buffer, MIME_TYPE, apiKey);

  console.log('=== 抽出結果 ===');
  console.log(JSON.stringify(extracted, null, 2));

  const detected = Object.values(extracted).filter((v) => v !== null).length;
  console.log(`\n検出率: ${detected}/8 フィールド`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
