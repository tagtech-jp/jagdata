import { pushMessage } from '../lib/line';
import { callVision } from '../lib/gemini';
import { judgeExtracted } from '../lib/setting_judger';
import { formatJudgmentResult } from '../lib/format';

const REPLY_API = 'https://api.line.me/v2/bot/message/reply';
const CONTENT_API = 'https://api-data.line.me/v2/bot/message';

async function replyMessage(
  replyToken: string,
  text: string,
  accessToken: string
): Promise<void> {
  await fetch(REPLY_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text }],
    }),
  });
}

export async function handleImage(
  replyToken: string,
  messageId: string,
  contentProviderType: string,
  accessToken: string,
  userId: string,
  geminiApiKey: string,
  ctx: ExecutionContext
): Promise<void> {
  if (contentProviderType !== 'line') {
    await replyMessage(replyToken, '外部URLの画像は現在対応していません', accessToken);
    return;
  }

  await replyMessage(replyToken, '📸 画像を受信しました。判定中... (約15-25秒)', accessToken);
  ctx.waitUntil(processImageAndPush(messageId, accessToken, userId, geminiApiKey));
}

async function processImageAndPush(
  messageId: string,
  accessToken: string,
  userId: string,
  geminiApiKey: string
): Promise<void> {
  try {
    const res = await fetch(`${CONTENT_API}/${messageId}/content`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const msg =
        res.status === 401 ? '画像の取得に失敗しました(認証エラー)' :
        res.status === 404 ? '画像の取得に失敗しました(画像が見つかりません)' :
        `画像の取得に失敗しました(HTTP ${res.status})`;
      await pushMessage(userId, msg, accessToken);
      return;
    }

    const contentType = res.headers.get('content-type') ?? '不明';
    const buffer = await res.arrayBuffer();

    const mimeType = contentType.split(';')[0].trim();
    const extracted = await callVision(buffer, mimeType, geminiApiKey);
    const judged = judgeExtracted(extracted);
    const message = 'error' in judged
      ? `判定失敗: ${judged.error}`
      : formatJudgmentResult(judged);
    await pushMessage(userId, message, accessToken);
  } catch {
    await pushMessage(userId, '画像処理中にエラーが発生しました', accessToken);
  }
}
