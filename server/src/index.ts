import 'dotenv/config'
import { createApp } from './app.js'
import { logError } from './lib/errorLog.js'
import { startUptimeChecks } from './lib/monitor.js'

const port = Number(process.env.PORT ?? 3001)
createApp().listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})

// S1-29-T02 scheduled uptime checks (every minute by default)
startUptimeChecks()

// S1-31 / S1-32: crashes outside a request are critical and alert the admins
process.on('unhandledRejection', (reason) => {
  void logError('critical', `Unhandled rejection: ${reason instanceof Error ? reason.message : String(reason)}`, { context: { stack: reason instanceof Error ? reason.stack : undefined } })
})
