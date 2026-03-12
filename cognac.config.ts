import { defineConfig } from '@yn1323/cognac'

export default defineConfig({
  port: 4000,
  provider: "claude",
  git: {
    defaultBranch: "main",
    commitMessageLanguage: "ja",
  },
  ci: {
    maxRetries: 5,
    steps: [
      { name: "Format", command: "pnpm format" },
      { name: "Lint", command: "pnpm lint" },
      { name: "Test", command: "pnpm test" },
      { name: "Build", command: "pnpm build" },
    ],
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
