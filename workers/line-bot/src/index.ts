import { handleText } from './handlers/text';
import { handleImage } from './handlers/image';

export interface Env {
  LINE_CHANNEL_SECRET: string;
  LINE_CHANNEL_ACCESS_TOKEN: string;
  GEMINI_API_KEY: string;
}

interface LineEvent {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type: string; text?: string; id?: string; contentProvider?: { type: string } };
}

async function verifySignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const bytes = new Uint8Array(sig);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary) === signature;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const signature = request.headers.get('x-line-signature') ?? '';
    const body = await request.text();

    if (!(await verifySignature(body, signature, env.LINE_CHANNEL_SECRET))) {
      return new Response('Unauthorized', { status: 401 });
    }

    const payload = JSON.parse(body) as { events: LineEvent[] };
    for (const event of payload.events ?? []) {
      if (
        event.type === 'message' &&
        event.message?.type === 'text' &&
        event.replyToken &&
        event.message.text
      ) {
        await handleText(event.replyToken, event.message.text, env.LINE_CHANNEL_ACCESS_TOKEN);
      } else if (
        event.type === 'message' &&
        event.message?.type === 'image' &&
        event.replyToken &&
        event.message.id
      ) {
        await handleImage(
          event.replyToken,
          event.message.id,
          event.message.contentProvider?.type ?? 'line',
          env.LINE_CHANNEL_ACCESS_TOKEN,
          event.source?.userId ?? '',
          env.GEMINI_API_KEY,
          ctx
        );
      }
    }

    return new Response('OK', { status: 200 });
  },
};
