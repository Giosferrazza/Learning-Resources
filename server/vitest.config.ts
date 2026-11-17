import { defineConfig } from 'vitest/config'

// Integration suites share one local database and compare totals, so run files one at a time
export default defineConfig({ test: { fileParallelism: false } })
