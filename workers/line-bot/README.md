# jagdata LINE Bot

LINE Messaging API + Cloudflare Workers による jagdata Bot の基盤実装。

## デプロイ手順 (社長手動)

### 1. 依存インストール

```bash
cd D:\jagdata\workers\line-bot
npm install
```

### 2. シークレット登録

```bash
npx wrangler secret put LINE_CHANNEL_SECRET
# → プロンプトに Channel Secret を貼付して Enter

npx wrangler secret put LINE_CHANNEL_ACCESS_TOKEN
# → プロンプトに Channel Access Token を貼付して Enter
```

### 3. デプロイ

```bash
npx wrangler deploy
```

出力された URL (例: `https://jagdata-line-bot.xxxx.workers.dev`) をメモする。

### 4. LINE Developer Console 設定

1. [LINE Developers](https://developers.line.biz/) を開く
2. jagdata チャネル > Messaging API設定 を開く
3. **Webhook URL** に手順3のURLを貼付
4. **「検証」ボタン**をクリック → `200` 成功を確認
5. Webhookの利用: ON であることを確認

### 5. 動作確認

1. 友達追加QRコードを自分のLINEで読み取り → Bot を友達追加
2. トーク画面でテキスト `hello` を送信
3. Bot から `Hello! jagdata Bot稼働中` が返ることを確認

## 応答仕様 (Step 1)

| 入力 | 応答 |
|---|---|
| `hello` (大小文字不問) | `Hello! jagdata Bot稼働中` |
| その他すべて | 無応答 (200 OK のみ) |

## ローカル開発

`.dev.vars` ファイルを作成してシークレットを設定:

```
LINE_CHANNEL_SECRET=実際の値
LINE_CHANNEL_ACCESS_TOKEN=実際の値
```

> `.dev.vars` は `.gitignore` に含まれており、コミットされません。

```bash
npx wrangler dev
```
