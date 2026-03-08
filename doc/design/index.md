## design.penと画面名の対応付け

各ページ名とdesign.penのIDの紐づけを定義
IDはpencilのFrameを指しています。

あくまでもPoCの初期イメージです。
pencilでデザイン作成後、コード側で微調整しており、細部は実際のコードと異なる可能性があります。
コードが正です。

1. タスク画面 `@doc/design/TaskPage.pen`
   1. Dashboardページ
      - PC：Node ID: aHosa
      - SP： Node ID: Z3VRU
   1. タスク詳細ページ（概要タブ）
      - PC：Node ID: tD5iL
      - SP：Node ID: IX5jH
   1. タスク詳細ページ（ディスカッションタブ）
      - PC：Node ID: MNIPN
      - SP：Node ID: ZMKpf
   1. タスク詳細ページ（プランタブ）
      - PC：Node ID: 3N4Rc
      - SP：Node ID: D0x6N
   1. タスク詳細ページ（CIタグ）
      - PC：Node ID: bzY1z
      - SP：Node ID: ekKkC
   1. タスク詳細ページ（ログタグ）
      - PC：Node ID: v2Lmx
      - SP：Node ID: O1f8P
   1. 新規タスク作成モーダル
      - PC：Node ID: Pq0Cs
      - SP：Node ID: jub5X

1. 設定画面 `@doc/design/SettingPage.pen`
   - PC：Node ID: vHG2Z
   - SP：Node ID: k01OP

1. Git画面 `@doc/design/GitPage.pen`
   - PC：Node ID: elYDX
   - SP：Node ID: Vc82Z
   1. Git画面（AIコミット実行中）
      - PC：Node ID: r9Nig
   1. マージモーダル
      - Node ID: bTqDq
   1. 新規ブランチ作成モーダル
      - Node ID: VI1kb

## コンポーネント

`@doc/design/common.pen`

1. デザインシステム
   - Node ID: MzSDs

1. コンポーネント
   - Node ID: fjZSi
