// Gemini Vision API クライアント (REST fetch・Workers ネイティブAPI のみ使用)
// 移植元: D:\jagdata\gemini_vision_test.py (PROMPT / parse_extracted)

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// Python版 gemini_vision_test.py PROMPT 定数から逐語移植 (行末 \ 連結を解決)
const PROMPT = `この画像はパチスロ「マイジャグラーV」のホールデータ表示機（オメガ等）のスクリーンショットです。
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
`;

export interface ExtractedData {
  machine_name: string | null;
  total_games: number | null;
  big_count: number | null;
  reg_count: number | null;
  big_probability: string | null;
  reg_probability: string | null;
  combined_probability: string | null;
  total_diff_coins: number | null;
}

interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[];
    };
  }[];
}

// ArrayBuffer → base64 (チャンク分割でスタック安全、大画像対応)
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

// parse_extracted 相当 (Python版と等価ロジック)
function parseExtracted(rawText: string): ExtractedData {
  let text = rawText.trim();
  if (text.startsWith('```')) {
    const lines = text.split('\n');
    const lastLine = lines[lines.length - 1].trim();
    text = (lastLine === '```' ? lines.slice(1, -1) : lines.slice(1)).join('\n');
  }

  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    // JSON parse 失敗時は全フィールド null (Python版と等価)
  }

  const keys: (keyof ExtractedData)[] = [
    'machine_name', 'total_games', 'big_count', 'reg_count',
    'big_probability', 'reg_probability', 'combined_probability', 'total_diff_coins',
  ];
  return Object.fromEntries(
    keys.map((k) => [k, data[k] ?? null])
  ) as unknown as ExtractedData;
}

export async function callVision(
  buffer: ArrayBuffer,
  mimeType: string,
  apiKey: string
): Promise<ExtractedData> {
  const base64 = arrayBufferToBase64(buffer);

  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: mimeType, data: base64 } },
          { text: PROMPT },
        ],
      }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status}`);
  }

  const json = await res.json() as GeminiResponse;
  const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return parseExtracted(rawText);
}
