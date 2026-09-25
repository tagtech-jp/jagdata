import { InteractionResponseType } from 'discord-interactions';

export function handleHello(): Response {
  return Response.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content: 'Hello! jagdata Bot稼働中' },
  });
}
