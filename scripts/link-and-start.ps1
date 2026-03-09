# cognac CLIをビルドしてサーバー起動
Set-Location $PSScriptRoot\..
pnpm install
pnpm build
pnpm start
