# 共通ステータス仕様

タスクと探索で共通のステータスモデルを使用する。

## ステータス一覧

| ステータス | 説明 |
|:--|:--|
| `pending` | 待機中。実行キューに入っている |
| `discussing` | AI準備・議論中。ペルソナ選定 + ディスカッション + 計画策定 |
| `executing` | メイン作業中。タスク: コード実装 / 探索: コードベース調査 |
| `reviewing` | 検証・出力中。タスク: CI実行 / 探索: レポート生成 |
| `completed` | 正常完了 |
| `paused` | infraエラーにより一時停止（リトライ可能） |
| `stopped` | ユーザーキャンセルまたはリトライ上限到達 |

## 状態遷移

```
pending → discussing → executing → reviewing → completed
              ↓             ↓           ↓
           paused/stopped (エラー発生時)
```

- `paused`: infraエラー（外部サービス障害など）。リトライで `pending` に戻る
- `stopped`: appエラーのリトライ上限到達、またはユーザーによるキャンセル。リトライで `pending` に戻る

## フィルターカテゴリ

ダッシュボード / 探索一覧で使用する4つのフィルターカテゴリ。タスク・探索共通。

| フィルター | 含むステータス |
|:--|:--|
| Pending | `pending` |
| Executing | `discussing`, `executing`, `reviewing` |
| Completed | `completed` |
| Failed | `paused`, `stopped` |

## ステータス別アクション

タスク・探索で共通のルール。

| ステータス | フィルター | 編集 | 停止 | 削除 | リトライ | タスク化 |
|:--|:--|:--:|:--:|:--:|:--:|:--:|
| `pending` | Pending | ✅ | - | ✅ | - | - |
| `discussing` | Executing | - | ✅ | - | - | - |
| `executing` | Executing | - | ✅ | - | - | - |
| `reviewing` | Executing | - | ✅ | - | - | - |
| `completed` | Completed | ✅ | - | ✅ | - | 探索のみ |
| `paused` | Failed | ✅ | - | ✅ | ✅ | - |
| `stopped` | Failed | ✅ | - | ✅ | ✅ | - |

- **編集**: タイトル・本文・画像などの変更
- **停止**: 実行中プロセスのキャンセル（ステータスを `stopped` に変更）
- **削除**: 永続的な削除
- **リトライ**: `pending` に戻して再実行
- **タスク化**: 探索の完了レポートからタスクを自動生成（探索のみ）

## 旧ステータスからの移行

### タスク

| 旧ステータス | 新ステータス |
|:--|:--|
| `pending` | `pending` |
| `discussing` | `discussing` |
| `planned` | `discussing` に統合 |
| `executing` | `executing` |
| `testing` | `reviewing` |
| `completed` | `completed` |
| `paused` | `paused` |
| `stopped` | `stopped` |

### 探索

| 旧モデル | 新ステータス |
|:--|:--|
| `pending` | `pending` |
| `analyzing` + phase=`persona` | `discussing` |
| `analyzing` + phase=`discussion` | `discussing` |
| `analyzing` + phase=`explore` | `executing` |
| `analyzing` + phase=`report` | `reviewing` |
| `completed` | `completed` |
| `paused` | `paused` |
| `failed` | `stopped` |

`current_phase` カラムは廃止し、ステータスで直接表現する。
