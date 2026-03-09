import { defineConfig } from '@yn1323/cognac'

export default defineConfig({
  port: 4000,
  provider: "codex",
  git: {
    defaultBranch: "main",
    commitMessageLanguage: "ja",
  },
  ci: {
    maxRetries: 5,
  },
  discussion: {
    maxRounds: 3,
    minPersonas: 2,
    maxPersonas: 4,
    skipDiscussion: false,
  },
  claude: {
    maxTurnsExecution: 30,
    maxTurnsDiscussion: 1,
    stdoutTimeoutMs: 600000,
    processMaxRetries: 2,
  },
})
