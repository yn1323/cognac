/**
 * 開発サーバー起動スクリプト
 * 1. 古いプロセスを kill (port 4000, 5173)
 * 2. server (tsx watch) と client (vite) を並列起動
 *
 * pnpm --parallel + tsx watch が Windows で動かない問題を回避するため、
 * spawn で直接プロセスを起動する。
 */

import { execSync, spawn } from 'node:child_process'

const PORTS = [4000, 5173]

// ── 古いプロセスの kill ──

function findPidsOnPort(port) {
  try {
    const out = execSync(`netstat -ano | findstr "LISTENING" | findstr ":${port} "`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    const pids = new Set()
    for (const line of out.trim().split('\n')) {
      const parts = line.trim().split(/\s+/)
      const pid = Number(parts.at(-1))
      if (pid > 0) pids.add(pid)
    }
    return [...pids]
  } catch {
    return []
  }
}

function killPid(pid) {
  try {
    execSync(`taskkill /PID ${pid} /F`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    return true
  } catch {
    return false
  }
}

let killed = 0
for (const port of PORTS) {
  for (const pid of findPidsOnPort(port)) {
    if (killPid(pid)) {
      console.log(`port ${port} の古いプロセス (PID ${pid}) を終了した`)
      killed++
    }
  }
}
if (killed === 0) {
  console.log('ポート 4000, 5173 に古いプロセスなし — OK')
}

// ── server + client を並列起動 ──

const procs = [
  { name: 'server', cmd: 'pnpm', args: ['--filter', '@cognac/server', 'dev'] },
  { name: 'client', cmd: 'pnpm', args: ['--filter', '@cognac/client', 'dev'] },
]

for (const { name, cmd, args } of procs) {
  const child = spawn(cmd, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  })

  child.stdout.on('data', (d) => {
    for (const line of d.toString().trimEnd().split('\n')) {
      console.log(`[${name}] ${line}`)
    }
  })
  child.stderr.on('data', (d) => {
    for (const line of d.toString().trimEnd().split('\n')) {
      console.error(`[${name}] ${line}`)
    }
  })
  child.on('close', (code) => {
    console.log(`[${name}] 終了 (code ${code})`)
  })
}

// Ctrl+C でグレースフルに終了
process.on('SIGINT', () => process.exit(0))
process.on('SIGTERM', () => process.exit(0))
