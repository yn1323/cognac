# PR作成機能 仕様書

## 概要

Git画面から全自動でPull Requestを作成・更新する機能。
「PR作成」ボタン1つで、未コミット変更のステージング → AIコミットメッセージ生成 → Push → PR作成/更新までを一気通貫で実行する。

## APIエンドポイント

### POST /api/git/pull-request

#### リクエスト

```json
{
  "baseBranch": "develop"
}
```

#### レスポンス（成功）

```json
{
  "success": true,
  "steps": [
    { "id": "stage", "label": "変更をステージング", "status": "done" },
    { "id": "commit", "label": "AIコミット", "status": "done" },
    { "id": "push", "label": "リモートにPush", "status": "done" },
    { "id": "create-pr", "label": "PR作成", "status": "done" }
  ],
  "pr": {
    "number": 42,
    "title": "feat: PR作成機能を追加",
    "url": "https://github.com/owner/repo/pull/42"
  },
  "isUpdate": false
}
```

#### レスポンス（失敗）

```json
{
  "success": false,
  "steps": [
    { "id": "stage", "label": "変更をステージング", "status": "done" },
    { "id": "commit", "label": "AIコミット", "status": "in-progress" },
    { "id": "push", "label": "リモートにPush", "status": "pending" },
    { "id": "create-pr", "label": "PR作成", "status": "pending" }
  ],
  "isUpdate": false,
  "error": "コミットメッセージ生成がタイムアウトしました（60秒）"
}
```

## オーケストレーションフロー

### Step 1: ステージング

- `git status --porcelain` で未コミット変更を確認
- 変更がある場合: `git add -A` で全ファイルをステージング
- 変更がない場合: スキップ（`skipped`）

### Step 2: AIコミット

- `git diff --staged` でステージング済みのdiffを取得
- diffがある場合: AIでコミットメッセージを生成し、`git commit` を実行
- diffがない場合: スキップ（`skipped`）
- タイムアウト: 60秒

### Step 3: Push

- `git push -u origin <branch>` でリモートにプッシュ
- upstream未設定の場合も `-u` フラグで自動設定

### Step 4: PR作成/更新

- `gh pr list --head <branch>` で既存のオープンPRを検索
- 既存PRあり: `gh pr edit` でタイトル・本文を更新
- 既存PRなし: `gh pr create` で新規作成
- PRタイトル・本文はAIが差分とコミットログから自動生成
- タイムアウト: 60秒

## エッジケース

| ケース | 挙動 |
|--------|------|
| gh CLI未インストール | 400エラー「gh CLIがインストールされていません」 |
| gh CLI認証切れ | 400エラー「gh CLIの認証が必要です」 |
| detached HEAD | 400エラー「detached HEAD状態ではPRを作成できません」 |
| デフォルトブランチ上 | ボタン非活性、400エラー「デフォルトブランチではPRを作成できません」 |
| 未コミット変更なし | stage/commitをスキップし、pushとPR作成のみ実行 |
| 既存PRあり | PRを更新（`isUpdate: true`） |

## UI仕様

### ボタン配置

- PC版: PageHeaderの右端に「PR作成」ボタン（`variant="primary"`）
- SP版: ヘッダーボタン群の右端にアイコンボタン（`variant="primary"`）
- デフォルトブランチ上では非活性

### モーダル3フェーズ

1. **確認フェーズ**: ブランチ情報を表示し、PR作成の確認を求める
2. **進捗フェーズ**: 4ステップのフェイク進捗をアニメーション表示（処理中は閉じられない）
3. **結果フェーズ**: 成功時はPRカード（番号・タイトル・外部リンク）、失敗時はエラーメッセージとステップ状況を表示
