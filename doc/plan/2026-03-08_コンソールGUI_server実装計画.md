# コンソール GUI server 実装計画

## Context

`doc/spec/CONSOLE_GUI.md` を元に、コンソール画面の **server 側MVP** を実装する。
今回のスコープは以下に限定する。

- コマンド定義の永続化
- コマンド実行・停止
- 実行状態の管理
- ログファイル保存
- ログのリアルタイム配信
- 実行履歴の取得
- 24時間保持のクリーンアップ

画面実装は別タスクとし、本計画では client から利用しやすい API / SSE / データ構造まで固める。

---

## 仕様要点の整理

`CONSOLE_GUI.md` から、server 実装に直接効く要件を抜き出すと以下。

- 実行ディレクトリは常にリポジトリルート固定
- 同一コマンドは二重起動せず、再実行時は旧 run を停止してから新 run を開始
- 別コマンド同士は同時実行可
- 停止は `Ctrl+C` 的な穏当停止を優先し、必要時のみ強制終了
- run メタデータは SQLite、ログ本文はファイル保存
- ログと run 履歴は 24 時間保持
- サーバー起動時と定期的にクリーンアップ

---

## 現状整理

| レイヤー | 現状 | 今回の判断 |
|---------|------|-----------|
| `server/index.ts` | `tasks` / `settings` / `git` API を登録 | `console` API を独立追加 |
| `server/db/schema.ts` | tasks 系テーブルのみ | `console_commands` / `console_runs` を追加 |
| `server/sse/event-bus.ts` | taskId 単位の TaskEvent 配信 | console 専用バスを新設 |
| `server/api/stream.ts` | task SSE 専用 | console run SSE を別ルーターで追加 |
| `server/runner/task-runner.ts` | 単一キュー前提 | console 実行は載せない |
| `server/runner/providers/*` | AI CLI 実行用 | 一般コマンド実行には流用しない |
| `cli/commands/init.ts` | `.cognac/logs` 生成済み | `logs/console` 配下を使用 |

### なぜ `TaskRunner` に載せないか

task 実行は「単一キューを1件ずつ処理」だが、console は「command ごとの排他 + command 間は並列可」という別の制御モデルになる。
責務を混ぜると状態管理が崩れやすいので、`ConsoleManager` を別サービスとして切り出す。

---

## 実装方針

### 方針1: console 機能は独立した server サービスにする

新規に以下を追加する。

- `ConsoleManager`
- `ConsoleEventBus`
- `console` API router
- `console` DB query 群
- `console` cleanup サービス

### 方針2: ログ本文はファイル、表示用メタ情報は DB に寄せる

長時間常駐コマンドではログ量が大きくなるため、本文全文は DB に持たない。
UI で必要な一覧情報は DB に持ち、本文取得と tail 配信はファイルから行う。

### 方針3: 停止は「穏当停止 → 待機 → 強制停止」の 2 段階

OS ごとの差分は manager に閉じ込める。
API 層は停止要求だけを受け、実際のプロセス操作は `ConsoleManager` に集約する。

### 方針4: server 再起動時の実行中 run は復元せず `killed` 扱いにする

今回の MVP では PID 再接続や orphan process 再捕捉はやらない。
server 側で管理していた run 状態だけを整合させ、前回の `starting|running|stopping` run は起動時に `killed` へ補正する。

---

## データモデル設計

### 1. `console_commands`

```sql
CREATE TABLE console_commands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  command TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)
```

### 2. `console_runs`

```sql
CREATE TABLE console_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  command_id INTEGER NOT NULL,
  status TEXT NOT NULL
    CHECK (status IN ('starting', 'running', 'stopping', 'completed', 'failed', 'killed')),
  pid INTEGER,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  exit_code INTEGER,
  termination_reason TEXT,
  log_file_path TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (command_id) REFERENCES console_commands(id) ON DELETE CASCADE
)
```

### 3. インデックス

- `idx_console_runs_command_id` on `(command_id)`
- `idx_console_runs_status` on `(status)`
- `idx_console_runs_started_at` on `(started_at DESC)`
- `idx_console_commands_updated_at` on `(updated_at DESC)`

### 4. 補足

- `idle` は DB に保持しない。command 一覧で「active run がなければ idle」と解釈する
- `last run` と `active run` は JOIN かサブクエリで組み立てる
- `termination_reason` は `user_stop` / `restart` / `startup_recovery` / `force_kill` などの内部判定に使う

---

## shared 型追加

**対象ファイル**

- `shared/types/console.ts` (CREATE)
- `shared/index.ts` (MODIFY)

### 型案

```ts
export type ConsoleRunStatus =
  | 'starting'
  | 'running'
  | 'stopping'
  | 'completed'
  | 'failed'
  | 'killed'

export interface ConsoleCommand {
  id: number
  name: string
  command: string
  note: string | null
  created_at: string
  updated_at: string
}

export interface ConsoleRun {
  id: number
  command_id: number
  status: ConsoleRunStatus
  pid: number | null
  started_at: string
  ended_at: string | null
  exit_code: number | null
  termination_reason: string | null
  log_file_path: string
  created_at: string
}
```

### API 用型

```ts
export interface ConsoleCommandListItem extends ConsoleCommand {
  latest_run: ConsoleRun | null
  active_run: ConsoleRun | null
  derived_status: 'idle' | ConsoleRunStatus
}

export interface ConsoleLogResponse {
  run: ConsoleRun
  content: string
  truncated: boolean
  size: number
}
```

### SSE 用型

```ts
export type ConsoleStreamEvent =
  | { type: 'run_started'; runId: number; commandId: number; pid: number | null; timestamp: string }
  | { type: 'run_status_changed'; runId: number; commandId: number; status: ConsoleRunStatus; timestamp: string }
  | { type: 'run_output'; runId: number; commandId: number; stream: 'stdout' | 'stderr'; chunk: string; timestamp: string }
  | { type: 'run_exit'; runId: number; commandId: number; status: 'completed' | 'failed' | 'killed'; exitCode: number | null; timestamp: string }
  | { type: 'run_log_truncated'; runId: number; commandId: number; message: string; timestamp: string }
```

---

## API 設計

**対象ファイル**

- `server/api/console.ts` (CREATE)
- `server/index.ts` (MODIFY)

### 1. コマンド定義 API

| Method | Path | 用途 |
|-------|------|------|
| `GET` | `/api/console/commands` | 一覧取得 |
| `POST` | `/api/console/commands` | 定義追加 |
| `PUT` | `/api/console/commands/:id` | 定義更新 |
| `DELETE` | `/api/console/commands/:id` | 定義削除 |

### 2. run 操作 API

| Method | Path | 用途 |
|-------|------|------|
| `POST` | `/api/console/commands/:id/run` | 実行開始 |
| `POST` | `/api/console/commands/:id/stop` | 停止要求 |
| `GET` | `/api/console/commands/:id/runs` | run 履歴取得 |
| `GET` | `/api/console/runs/:id/log` | ログ全文取得 |
| `GET` | `/api/console/runs/:id/stream` | SSE tail 配信 |

### 3. リクエスト / レスポンス詳細

#### `GET /api/console/commands`

返却:

```ts
ConsoleCommandListItem[]
```

一覧カード表示に必要な情報を1回で返す。

#### `POST /api/console/commands`

入力:

```ts
{
  name: string
  command: string
  note?: string
}
```

制約:

- `name`: 1..100
- `command`: 1..1000
- `note`: 0..2000

#### `PUT /api/console/commands/:id`

入力は `POST` と同形。MVP では部分更新ではなく全項目更新でもよいが、実装は部分更新可能にしておく。

ガード:

- active run がある command は編集不可にするか要検討
- MVP では「実行中でも編集可、ただし次回実行から反映」で問題ない

#### `DELETE /api/console/commands/:id`

ガード:

- active run がある場合は 409 を返す

挙動:

- command 定義と run 履歴を削除
- 対応するログファイルも削除

#### `POST /api/console/commands/:id/run`

挙動:

1. command 存在確認
2. 既存 active run を確認
3. active run があれば停止要求
4. 停止完了待ち
5. 新 run 作成
6. 子プロセス起動
7. run 情報返却

レスポンス:

```ts
{
  command: ConsoleCommand
  run: ConsoleRun
}
```

#### `POST /api/console/commands/:id/stop`

レスポンス:

```ts
{
  ok: true
  run: ConsoleRun | null
}
```

仕様:

- active run がなければ `run: null`
- active run があれば非同期で停止処理を開始し、即時に `stopping` 状態を返す

#### `GET /api/console/commands/:id/runs`

返却:

```ts
ConsoleRun[]
```

並び:

- `started_at DESC`

#### `GET /api/console/runs/:id/log`

返却:

```ts
ConsoleLogResponse
```

MVP では全文返却。
将来的に巨大ログが問題化したら `tailLines` / `maxBytes` クエリを追加する。

#### `GET /api/console/runs/:id/stream`

用途:

- 選択中 run のログ tail
- 状態変化通知

イベント:

- `run_output`
- `run_status_changed`
- `run_exit`

接続終了条件:

- `completed` / `failed` / `killed` に達したら SSE を閉じる

---

## server モジュール分割

### 1. Query 層

**対象ファイル**

- `server/db/queries/console-commands.ts` (CREATE)
- `server/db/queries/console-runs.ts` (CREATE)
- `server/db/index.ts` (MODIFY)

#### `console-commands.ts`

- `listCommands(db): ConsoleCommand[]`
- `getCommand(db, id): ConsoleCommand | undefined`
- `createCommand(db, input): ConsoleCommand`
- `updateCommand(db, id, patch): ConsoleCommand | undefined`
- `deleteCommand(db, id): boolean`

#### `console-runs.ts`

- `createRun(db, input): ConsoleRun`
- `getRun(db, id): ConsoleRun | undefined`
- `listRunsByCommandId(db, commandId): ConsoleRun[]`
- `getLatestRunByCommandId(db, commandId): ConsoleRun | undefined`
- `getActiveRunByCommandId(db, commandId): ConsoleRun | undefined`
- `setRunPid(db, runId, pid): ConsoleRun | undefined`
- `setRunStatus(db, runId, status): ConsoleRun | undefined`
- `finishRun(db, runId, status, exitCode, endedAt, terminationReason): ConsoleRun | undefined`
- `markActiveRunsKilledOnBoot(db, now): number`
- `listExpiredRuns(db, olderThanIso): ConsoleRun[]`
- `deleteRuns(db, runIds): number`

### 2. EventBus 層

**対象ファイル**

- `server/sse/console-event-bus.ts` (CREATE)

責務:

- `runId` 単位で subscriber を持つ
- `publish(runId, event)`
- `subscribe(runId, fn)`

必要なら command 一覧更新用に `commandId` 購読もあとから足せるが、MVP は run stream のみで十分。

### 3. ログ I/O 層

**対象ファイル**

- `server/console/log-store.ts` (CREATE)

責務:

- ログディレクトリ生成
- run ごとの log file path 生成
- chunk append
- 全文読み込み
- ファイル削除

配置先:

- `.cognac/logs/console/<commandId>/<runId>.log`

API:

- `ensureConsoleLogDir(cwd)`
- `buildRunLogPath(cwd, commandId, runId)`
- `appendRunLog(path, chunk)`
- `readRunLog(path)`
- `deleteRunLog(path)`

### 4. 実行制御層

**対象ファイル**

- `server/console/console-manager.ts` (CREATE)
- `server/console/process-tree.ts` (CREATE)
- `server/console/types.ts` (CREATE, 必要なら)

責務:

- command 単位の active run 管理
- 同一 command 再実行時の stop-and-restart
- child process 起動
- stdout/stderr 取り込み
- run status 遷移
- stop / force kill
- shutdown 時の一括停止

### 5. cleanup 層

**対象ファイル**

- `server/console/cleanup.ts` (CREATE)

責務:

- 24 時間超の `console_runs` と対応ログを削除
- 起動時 recovery (`starting|running|stopping` → `killed`)
- 定期 cleanup の開始 / 停止

---

## `ConsoleManager` 詳細設計

### 公開インターフェース案

```ts
export interface ConsoleManager {
  listCommands(): ConsoleCommandListItem[]
  getCommand(id: number): ConsoleCommand | undefined
  createCommand(input: CreateConsoleCommandInput): ConsoleCommand
  updateCommand(id: number, patch: UpdateConsoleCommandInput): ConsoleCommand | undefined
  deleteCommand(id: number): Promise<boolean>
  listRuns(commandId: number): ConsoleRun[]
  getRun(runId: number): ConsoleRun | undefined
  startCommand(commandId: number): Promise<{ command: ConsoleCommand; run: ConsoleRun }>
  stopCommand(commandId: number): Promise<ConsoleRun | null>
  readRunLog(runId: number): Promise<ConsoleLogResponse | undefined>
  shutdown(): Promise<void>
}
```

### メモリ上で持つ状態

```ts
type ActiveProcess = {
  commandId: number
  runId: number
  child: ChildProcess
  stopPromise: Promise<void> | null
  resolveStop: (() => void) | null
  forceKillTimer: ReturnType<typeof setTimeout> | null
}
```

`Map<number, ActiveProcess>` を `commandId` キーで保持する。

### `startCommand(commandId)` の流れ

1. command を DB から取得
2. active run があれば `stopCommand(commandId, reason='restart')`
3. 停止完了まで await
4. `console_runs` に `starting` で insert
5. log file path 決定
6. `spawn(command.command, { cwd, shell: true })`
7. `pid` 記録
8. status を `running` に更新
9. stdout/stderr listener を attach
10. close / error イベントで `finishRun`

### `stopCommand(commandId)` の流れ

1. active process を引く
2. なければ `null`
3. status を `stopping` に更新
4. SSE で `run_status_changed`
5. graceful stop を送信
6. 一定秒数待機
7. 生きていたら強制停止
8. close 時に `killed` へ確定

### graceful stop 方式

#### Unix 系

- まずプロセスに `SIGINT`
- タイムアウト後 `SIGTERM`
- 最終的に `SIGKILL`

#### Windows

Node の signal サポート差分があるため、MVP では下記方針にする。

- `shell: true` で起動
- まず `child.kill('SIGTERM')` を試す
- タイムアウト後 `taskkill /pid <pid> /t /f`

補足:

- Windows で「完全に Ctrl+C 同等」は難しいが、仕様上は「実装側で OS 差分吸収」が求められている
- まずは安定して止めることを優先する

### close 時の status 決定ルール

| 条件 | 最終 status |
|------|-------------|
| stop 要求済み | `killed` |
| exit code === 0 | `completed` |
| exit code !== 0 | `failed` |
| 起動途中 error | `failed` |

### run 再実行時の排他

同一 command に対する `/run` が連打された場合を考慮し、`commandId` ごとのミューテックスを持つ。

MVP 実装案:

- `Map<number, Promise<void>>` で簡易直列化
- `withCommandLock(commandId, async () => ...)`

これで二重 insert や stop/start の競合を防ぐ。

---

## SSE / ログ配信設計

### イベントルーター

`server/api/console.ts` 内に `GET /runs/:id/stream` を実装する。

### 配信内容

#### 1. 接続直後

- 必要なら最新 run 状態を 1 イベント流す
- 直前ログの自動再送は MVP ではやらない
- ログ初期表示は `GET /log` を先に叩く前提にする

#### 2. 実行中

- stdout/stderr を受けるたび `run_output`
- status 変化時に `run_status_changed`

#### 3. 終了時

- `run_exit`
- その後 stream close

### UI 前提の利用フロー

1. `GET /commands`
2. command 選択
3. `GET /commands/:id/runs`
4. run 選択
5. `GET /runs/:id/log`
6. 実行中なら `GET /runs/:id/stream`

この2段構成にすると「履歴ログ表示」と「リアルタイム追従」を分離できる。

---

## cleanup / recovery 設計

### 起動時 recovery

server 起動時に以下を実行する。

1. `starting|running|stopping` の `console_runs` を検索
2. `ended_at = now`
3. `status = killed`
4. `termination_reason = 'startup_recovery'`
5. `exit_code = null`
6. ログ末尾に recovery 追記してもよい

### 定期 cleanup

基準:

- `started_at < now - 24h`

処理:

1. 対象 run 一覧取得
2. 対応するログファイル削除
3. run 行削除
4. empty になった command ディレクトリも掃除してよい

### 実行タイミング

- server 起動直後に1回
- 以降 1 時間ごとに定期実行

### shutdown 時

1. `ConsoleManager.shutdown()`
2. 全 active process に stop 要求
3. 一定時間で join
4. DB close

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `shared/types/console.ts` | console 用型定義追加 |
| `shared/index.ts` | console 型 re-export |
| `server/db/schema.ts` | console テーブル / index 追加 |
| `server/db/index.ts` | console query export 追加 |
| `server/db/queries/console-commands.ts` | command CRUD |
| `server/db/queries/console-runs.ts` | run CRUD / recovery / cleanup |
| `server/sse/console-event-bus.ts` | console run SSE バス |
| `server/console/log-store.ts` | ログファイル操作 |
| `server/console/process-tree.ts` | OS別 stop / kill 補助 |
| `server/console/cleanup.ts` | recovery + TTL cleanup |
| `server/console/console-manager.ts` | 実行管理本体 |
| `server/api/console.ts` | console API / SSE |
| `server/index.ts` | router と manager 注入 |
| `server/dev.ts` | manager 初期化 / shutdown 連携 |
| `cli/commands/start.ts` | manager 初期化 / shutdown 連携 |

---

## 実装ステップ

### Step 1: shared 型定義追加

目的:

- server / client 間の契約を先に固定

作業:

- `shared/types/console.ts` 作成
- `shared/index.ts` から export

完了条件:

- `ConsoleCommand`, `ConsoleRun`, `ConsoleStreamEvent` が import できる

### Step 2: DB スキーマ拡張

目的:

- command 定義と run メタデータを永続化

作業:

- `server/db/schema.ts` に table / index 追加
- status の CHECK 制約追加

完了条件:

- 新規 DB でテーブル生成可能
- 既存 DB でも `CREATE TABLE IF NOT EXISTS` で起動可能

### Step 3: Query 層追加

目的:

- API / manager から DB 操作を切り離す

作業:

- `console-commands.ts` 作成
- `console-runs.ts` 作成
- `server/db/index.ts` 更新

完了条件:

- CRUD と active run 判定が query だけで完結

### Step 4: ログストア実装

目的:

- ログファイル生成・追記・読込を単体化

作業:

- path 設計
- append / read / delete 実装
- ディレクトリ作成処理

完了条件:

- runId ごとに一意な log file が生成される

### Step 5: EventBus 実装

目的:

- run 単位のリアルタイム配信基盤を用意

作業:

- `ConsoleEventBus` 作成

完了条件:

- subscribe / unsubscribe / publish が動く

### Step 6: `ConsoleManager` 実装

目的:

- command 実行と停止のユースケースを server 内に閉じ込める

作業:

- start / stop / restart
- stdout/stderr capture
- state transition
- command lock

完了条件:

- 同一 command の再実行で stop-and-restart できる
- 別 command は並列実行できる

### Step 7: cleanup / recovery 実装

目的:

- 24時間保持と起動時整合性を満たす

作業:

- recovery 関数
- TTL cleanup
- periodic timer

完了条件:

- 起動時に orphan run が `killed` へ補正される
- 24時間超の run/log が削除される

### Step 8: API router 実装

目的:

- client 接続面を確定する

作業:

- CRUD endpoint
- run / stop endpoint
- runs list
- log snapshot
- SSE stream
- Zod validation

完了条件:

- 仕様書の API 一式が叩ける

### Step 9: app / start 連携

目的:

- package mode / dev mode の両方で console server を起動できる状態にする

作業:

- `server/index.ts` で manager/router 追加
- `server/dev.ts` で manager 初期化
- `cli/commands/start.ts` で manager 初期化
- shutdown 連携

完了条件:

- `pnpm dev` と `pnpx cognac start` の両方で console API が生える

### Step 10: テスト・検証

目的:

- stop/restart/cleanup のバグを早期に潰す

作業:

- query テスト
- manager テスト
- API テスト

完了条件:

- 主要受け入れ条件に対して自動テストがある

---

## バリデーション / エラーハンドリング方針

### command 定義

- 空文字禁止
- 前後空白は trim
- 文字数上限を設定

### 実行

- command 未存在: `404`
- 削除済み command 実行: `404`
- 停止中に再度 stop: `200` で現在 run を返す
- 実行中 command 削除: `409`

### ログ取得

- run 未存在: `404`
- ファイル欠損: `404` ではなく空文字返却でもよいが、MVP は整合性重視で `404`

### spawn 失敗

- run を `failed`
- `ended_at` 記録
- `termination_reason = 'spawn_error'`
- SSE で `run_exit`

---

## テスト計画

### Query テスト

- command CRUD
- active run 抽出
- latest run 抽出
- recovery 更新
- expired run 抽出と削除

### `ConsoleManager` テスト

- 単発コマンド実行で `completed`
- 失敗コマンド実行で `failed`
- 常駐コマンド停止で `stopping -> killed`
- 同一 command 再実行で旧 run 停止後に新 run 起動
- 別 command 同時実行
- shutdown で全 active run が止まる

### API テスト

- `POST /commands`
- `PUT /commands/:id`
- `DELETE /commands/:id`
- `POST /commands/:id/run`
- `POST /commands/:id/stop`
- `GET /commands/:id/runs`
- `GET /runs/:id/log`

### テスト用 fixture コマンド

`server/test/fixtures/console/` に以下を置く想定。

- `success.js`: 数行出して 0 終了
- `fail.js`: 数行出して 1 終了
- `long-running.js`: interval で出力し続ける
- `trap-stop.js`: SIGINT/SIGTERM を捕捉して終了メッセージ出力

Windows 互換を意識して Node スクリプトで fixture を作る。

---

## 受け入れ条件への対応表

| 受け入れ条件 | server 側の実装ポイント |
|-------------|------------------------|
| コマンド定義を追加・編集・削除できる | command CRUD API + DB |
| 再起動後も保持される | SQLite 永続化 |
| ワンクリックで実行できる | `/run` API |
| 実行ログを GUI で逐次表示 | log file + `/stream` SSE |
| 同一コマンド再実行で上書き再起動 | `ConsoleManager.startCommand()` |
| 別コマンド同時実行 | command 単位の active process 管理 |
| 穏当停止 → 必要時強制終了 | `stopCommand()` + process-tree helper |
| 単発 / 常駐の両対応 | close 時 status 判定 |
| 24時間以内の履歴再表示 | `console_runs` + `GET /runs` + `GET /log` |
| 24時間超過の cleanup | startup cleanup + interval cleanup |

---

## 実装上の論点

### 1. `idle` を DB に持つか

持たない。
一覧表示時に `active_run` がなければ `idle` を導出する。

### 2. 実行中 command の編集を許可するか

MVP では許可する。
既存 run には影響させず、次回実行から反映。

### 3. `GET /log` の全文返却でよいか

MVP は全文返却。
問題が出たら `tail` API を追加する。

### 4. server 再起動時に実プロセスをどう扱うか

MVP では DB 状態のみ `killed` へ補正し、実プロセスの自動回収までは追わない。
必要なら Phase 2 で PID/PGID ベースの orphan cleanup を検討する。

### 5. Windows の `Ctrl+C 的な停止`

完全同等は難しい。
MVP では「まず穏当停止を試す」「ダメならプロセスツリー kill」で UX 要件を満たす。

---

## 実装順序（推奨）

1. `shared/types/console.ts`
2. `server/db/schema.ts`
3. `server/db/queries/console-*.ts`
4. `server/console/log-store.ts`
5. `server/sse/console-event-bus.ts`
6. `server/console/console-manager.ts`
7. `server/console/cleanup.ts`
8. `server/api/console.ts`
9. `server/index.ts`
10. `server/dev.ts`
11. `cli/commands/start.ts`
12. test 追加

この順だと下から積めるので、途中で API 仕様や状態遷移がぶれにくい。

---

## 完了後の確認コマンド

最低限、以下を回す。

```bash
pnpm typecheck
pnpm lint
pnpm test
```

加えて手動で以下を確認する。

1. `pnpm dev` 起動
2. `POST /api/console/commands` で `pnpm dev` 相当の command 登録
3. `/run` 実行でログが増える
4. `/stop` で `stopping -> killed`
5. 同一 command の再実行で旧 run が止まって新 run が開始
6. 別 command を同時実行して両方動く
7. server 再起動で旧 active run が `killed` に補正される

