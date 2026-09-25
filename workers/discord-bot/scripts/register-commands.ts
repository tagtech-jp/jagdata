// ギルドコマンド登録スクリプト
// 実行前に PowerShell で以下を設定してください:
//   $env:DISCORD_APPLICATION_ID = "your_app_id"
//   $env:DISCORD_BOT_TOKEN      = "your_bot_token"
//   $env:DISCORD_GUILD_ID       = "your_guild_id"
// 実行: npx tsx scripts/register-commands.ts

const APP_ID   = process.env.DISCORD_APPLICATION_ID;
const TOKEN    = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!APP_ID || !TOKEN || !GUILD_ID) {
  console.error(
    'ERROR: DISCORD_APPLICATION_ID / DISCORD_BOT_TOKEN / DISCORD_GUILD_ID を環境変数に設定してください'
  );
  process.exit(1);
}

const url = `https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`;

const commands = [
  {
    name: 'hello',
    description: '動作確認用コマンド',
    type: 1,
  },
];

async function register(): Promise<void> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Discord API エラー ${res.status}: ${body}`);
    process.exit(1);
  }

  const data = (await res.json()) as unknown[];
  console.log(`✅ ${data.length}件のギルドコマンドを登録しました（即時反映）`);
}

register();
