# jagdata — ジャグラー画像認識精度評価 Phase 0

> **本ツールは設定を断定しません。続行・撤退判断を補助するMVPです。**

## 変更履歴

- 2026-05-26 PROMPT改善: 確率計算指示と差枚抽出ヒント追加（detection_rate 0.625 → 0.875以上を目標）

## スコープ境界

**Phase 0は精度検証のみ。LINE/Discord連携・判定ランク・確率テーブル照合はPhase 1以降。**

## 留意点

**総ゲーム数2000未満のスクショ判定は精度が大きく低下する可能性があります。**

---

## Phase 0 仕様

| 項目 | 内容 |
|------|------|
| 対象機種 | マイジャグラーV（Phase 0固定） |
| 画像出所 | ホールのデータ表示機（オメガ等）のスクリーンショット |
| 使用モデル | gemini-2.5-flash |
| 抽出フィールド | 8項目（機種名・総ゲーム・BIG・REG・各確率・差枚） |

---

## セットアップ

### 1. APIキーを設定

`.env` ファイルを開き、`your_key_here` を実際のキーに書き換えてください:

```
GEMINI_API_KEY=実際のキーを入力
```

> .env はコミット・共有・ログ出力禁止（.gitignore に設定済み）

### 2. PowerShell 環境設定（パイプ使用時・初回のみ）

Windows PowerShell でパイプ経由の実行（`gemini_vision_test.py | setting_judger.py --pipe`）を行う場合、
Python のデフォルト文字エンコーディングが cp932 となり日本語が文字化けします。
PowerShell プロファイルに以下を追記することで恒久的に解消できます。

```powershell
# プロファイル新規作成（初回のみ）
New-Item -Path $PROFILE -ItemType File -Force

# UTF-8 設定を追記
Add-Content $PROFILE "# UTF-8 default for Python"
Add-Content $PROFILE '$env:PYTHONIOENCODING = ''utf-8'''

# 現セッションに即時反映
. $PROFILE
```

> プロファイルを使いたくない場合の代替（毎回前置）:
> ```powershell
> $env:PYTHONIOENCODING = 'utf-8'
> python gemini_vision_test.py img.png | python setting_judger.py --pipe
> ```

> **ロールバック**: `Remove-Item $PROFILE` → PowerShell 再起動で完全に元通り。

### 3. 依存パッケージ確認

```
pip install google-genai python-dotenv
```

（どちらもインストール済みであれば不要）

---

## 使い方（3ステップ）

### Step 1: テスト画像を配置

`test_images\` フォルダに画像を入れてください。

命名規則: `{機種略称}_{設定}_{連番3桁}.{拡張子}`

- 設定が既知の場合: `myj5_s4_001.png`
- 設定が不明の場合: `myj5_unknown_001.png`

対応形式: PNG / JPEG / WebP

### Step 2: スクリプト実行

```
cd D:\jagdata
python gemini_vision_test.py test_images\myj5_unknown_001.png
```

### Step 3: 結果確認

JSON形式で stdout に出力されます。`evaluation.detection_rate` が精度の目安です。

---

## 出力形式

```
{
  "image_path": "test_images/myj5_unknown_001.png",
  "model": "gemini-2.5-flash",
  "extracted": {
    "machine_name": "マイジャグラーV",
    "total_games": 3500,
    "big_count": 12,
    "reg_count": 15,
    "big_probability": "1/291",
    "reg_probability": "1/233",
    "combined_probability": "1/129",
    "total_diff_coins": -320
  },
  "raw_text": "（Gemini生レスポンス）",
  "evaluation": {
    "fields_detected": 8,
    "fields_total": 8,
    "detection_rate": 1.0,
    "response_seconds": 3.2
  },
  "timestamp": "2026-05-26T12:00:00"
}
```

---

## 精度評価指標と目標値

| 指標 | 定義 | 目標値 |
|------|------|--------|
| 必須項目認識率 (`detection_rate`) | 8フィールド中、nullでない値の割合 | ≥ 0.80 |
| 数値抽出精度 | 正解ラベルと一致した件数 / 非null件数 | ≥ 90% |
| 誤検出率 | 正解と異なる値 / 非null件数 | ≤ 10% |
| 応答時間 | APIコール〜JSON出力 | ≤ 10秒 |

精度の手動評価は `eval_report_template.json` を使用してください。

---

## バッチ実行（複数画像の一括評価）

`test_images/` 内の全画像を順次評価し、集計サマリーと詳細レポートを出力します。
API呼び出し失敗時はスキップして `error_count` に記録し、残りの評価を継続します。

### 実行（1コマンド）

```
cd D:\jagdata
python batch_eval.py
```

### 出力先

| 出力先 | 内容 |
|--------|------|
| stdout | 集計サマリー（JSON） |
| stderr | 進捗ログ（評価中のリアルタイム表示） |
| `reports\batch_YYYYMMDD_HHMMSS.json` | 全画像の詳細結果（git管理外） |

### サマリー出力フォーマット

```
{
  "total_images": 3,
  "success_count": 3,
  "error_count": 0,
  "detection_rate": { "avg": 0.875, "min": 0.750, "max": 1.000 },
  "response_seconds": { "avg": 10.5, "min": 9.0, "max": 12.3 },
  "field_detection_rates": {
    "machine_name": 1.000,
    "total_games": 1.000,
    "big_count": 1.000,
    "reg_count": 1.000,
    "big_probability": 0.667,
    "reg_probability": 0.667,
    "combined_probability": 1.000,
    "total_diff_coins": 0.333
  }
}
```

---

## 判定実行（Phase 1.1）

gemini_vision_test.py または batch_eval.py の出力 JSON を `setting_judger.py` に渡すと、
ポアソン対数尤度による最尤設定推定と続行/撤退判断ヒントを付加した JSON を返します。

```
# 単一画像評価結果を渡す
python gemini_vision_test.py test_images\myj5_unknown_001.png | python setting_judger.py --pipe

# ファイルを直接指定
python setting_judger.py --json reports\batch_20260526_120000.json
```

出力 JSON に `judgment` フィールドが追加されます:

```json
"judgment": {
  "best_setting": 6,
  "setting_range": "設定5〜6寄り",
  "reliability": "中",
  "rank": "A",
  "continue_recommended": true,
  "reasons": [
    "BIG実績: 1/238.1 (設定6理論値 1/240.9)",
    "REG実績: 1/233.3 (設定6理論値 1/268.0)",
    "ゲーム数 1165G — 中程度の信頼度"
  ],
  "disclaimer": "本ツールは設定を断定しません。続行・撤退判断を補助するMVPです。実際の遊技判断はご自身の責任でお願いします。"
}
```

| ランク | 意味 | continue_recommended |
|--------|------|----------------------|
| S | 設定6最尤 + 高信頼度 | true |
| A | 設定5〜6最尤 or 高設定+中/低信頼度 | true |
| B | 判断保留 | null |
| C | 低設定寄り | false |
| D | 設定1最尤 | false |

> 信頼度は「高」(2500G以上)・「中」(1000G以上)・「低（参考程度）」(1000G未満) の3段階。  
> 信頼度が「高」以外の場合、ランクを1段階下げて表示します。

---

## Phase 1以降（Phase 0では実装しない）

- 他機種対応（ファンキージャグラー2 / ハッピージャグラーVIII 等）
- 機種別確率テーブルとの照合
- 判定ランク S/A/B/C/D ロジック
- LINE Bot / Discord Bot 連携
- 追加フィールド（ぶどう数等）
- 法務文書整備（利用規約・特商法・依存症啓発文）
- プロダクト正式名称・正式ドメイン決定
