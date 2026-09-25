export async function handleText(
  replyToken: string,
  text: string,
  accessToken: string
): Promise<void> {
  if (text.trim().toLowerCase() !== 'hello') return;

  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text: 'Hello! jagdata Bot稼働中' }],
    }),
  });
}
