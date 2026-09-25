# jagdata Discord Bot — Cloudflare Workers

Phase 1.5 Step 1: Discord 連携基盤。/hello コマンドで Bot 接続を確認するための MVP。

## 前提: Discord Developer Portal で取得する値

| 値 | 取得場所 |
|----|---------|
| APPLICATION_ID | General Information → Application ID |
| PUBLIC_KEY | General Information → Public Key |
| BOT_TOKEN | Bot → Reset Token |
| GUILD_ID | テストサーバー右クリック → サーバーIDをコピー ※1 |

> ※1 Discord 設定 → 詳細設定 → **開発者モードを ON** にするとサーバー名を右クリックして「サーバーIDをコピー」が表示されます

---

## 社長手動デプロイ手順

### ステップ 1: workers ディレクトリへ移動・依存インストール

```powershell
cd D:\jagdata\workers\discord-bot
npm install
```

### ステップ 2: Cloudflare にログイン

```powershell
npx wrangler login
```

ブラウザが開くので Cloudflare アカウントで認証してください。

### ステップ 3: シークレット登録（3回実行、各回プロンプトに実値を貼り付ける）

```powershell
npx wrangler secret put DISCORD_APPLICATION_ID
npx wrangler secret put DISCORD_PUBLIC_KEY
npx wrangler secret put DISCORD_BOT_TOKEN
```

> シークレット値はターミナルに表示されません（入力後 Enter）。

### ステップ 4: Workers にデプロイ

```powershell
npx wrangler deploy
```

デプロイ成功後に表示される URL（例: `https://jagdata-discord-bot.yourname.workers.dev`）をメモしてください。

### ステップ 5: Discord に Interactions Endpoint URL を登録

1. [Discord Developer Portal](https://discord.com/developers/applications) を開く
2. 該当アプリを選択 → **General Information**
3. **Interactions Endpoint URL** にステップ 4 の URL を貼り付け
4. **Save Changes** をクリック
   - 「All interactions on this application are now sent to the above URL」と表示されれば成功

### ステップ 6: ギルドコマンド登録（即時反映）

PowerShell で一時環境変数を設定してからスクリプトを実行してください（セッション終了で変数は自動消去されます）:

```powershell
$env:DISCORD_APPLICATION_ID = "（実際の APPLICATION ID を入力）"
$env:DISCORD_BOT_TOKEN      = "（実際の BOT TOKEN を入力）"
$env:DISCORD_GUILD_ID       = "（テストサーバーの GUILD ID を入力）"
npx tsx scripts/register-commands.ts
```

`✅ 1件のギルドコマンドを登録しました（即時反映）` と表示されれば成功です。

### ステップ 7: 動作確認

テストサーバーで `/hello` を入力し、Bot が `Hello! jagdata Bot稼働中` と返答すれば完了です。

---

## ファイル構成

```
workers/discord-bot/
├── src/
│   ├── index.ts              # Workers エントリポイント・署名検証・コマンドディスパッチ
│   └── commands/
│       └── hello.ts          # /hello コマンドハンドラ
├── scripts/
│   └── register-commands.ts  # ギルドコマンド登録スクリプト（ローカル実行）
├── package.json
├── tsconfig.json
├── wrangler.toml
├── .env.example
├── .gitignore
└── README.md
```

## シークレット（Cloudflare Workers）

| シークレット名 | 説明 |
|---------------|------|
| `DISCORD_APPLICATION_ID` | Discord アプリケーション ID |
| `DISCORD_PUBLIC_KEY` | 署名検証用公開鍵 |
| `DISCORD_BOT_TOKEN` | Bot トークン（コマンド登録に使用） |

> シークレット実値は `wrangler secret put` でのみ登録。コード・ファイル・ログには含めない。
