import { Command } from 'commander'
import { runInit } from './commands/init.js'
import { runStart } from './commands/start.js'

const program = new Command()
program.name('cognac').version('0.1.0').description('AI駆動のタスク自動実行ツール')
program.command('init').description('プロジェクトにcognacを初期化する').action(runInit)
program.command('start').description('ダッシュボード起動 + タスクランナー開始').action(runStart)
program.parse()
