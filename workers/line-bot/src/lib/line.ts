const PUSH_API = 'https://api.line.me/v2/bot/message/push';

export async function pushMessage(
  userId: string,
  text: string,
  accessToken: string
): Promise<void> {
  await fetch(PUSH_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      to: userId,
      messages: [{ type: 'text', text }],
    }),
  });
}
