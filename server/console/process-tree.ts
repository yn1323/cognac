import { type ChildProcess, spawnSync } from 'node:child_process'

export function requestGracefulStop(child: ChildProcess): void {
  if (child.pid == null) return

  if (process.platform === 'win32') {
    try {
      child.kill('SIGTERM')
    } catch {
      // noop
    }
    return
  }

  try {
    process.kill(-child.pid, 'SIGINT')
  } catch {
    try {
      child.kill('SIGINT')
    } catch {
      // noop
    }
  }
}

export function requestTerminate(child: ChildProcess): void {
  if (child.pid == null) return

  if (process.platform === 'win32') {
    try {
      child.kill('SIGTERM')
    } catch {
      // noop
    }
    return
  }

  try {
    process.kill(-child.pid, 'SIGTERM')
  } catch {
    try {
      child.kill('SIGTERM')
    } catch {
      // noop
    }
  }
}

export function requestForceKill(child: ChildProcess): void {
  if (child.pid == null) return

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
      stdio: 'ignore',
      windowsHide: true,
    })
    return
  }

  try {
    process.kill(-child.pid, 'SIGKILL')
  } catch {
    try {
      child.kill('SIGKILL')
    } catch {
      // noop
    }
  }
}
