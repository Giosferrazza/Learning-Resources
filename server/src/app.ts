import cors from 'cors'
import express from 'express'
import { accountRouter } from './routes/account'
import { adminRouter } from './routes/admin'
import { listsRouter } from './routes/lists'
import { recommendationsRouter } from './routes/recommendations'
import { resourcesRouter } from './routes/resources'

// Built separately from index.ts so tests can import the app without listening.
export function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json())

  // S1-29 Monitor uptime: scheduled checks (S1-29-T02) hit this
  // TODO(S1-29-T01): include a database check and response-time baseline
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true })
  })

  // TODO(S1-30-T01): record key usage events (see supabase/migrations/0007_operations.sql)
  app.use('/api', accountRouter)
  app.use('/api', recommendationsRouter)
  app.use('/api', listsRouter)
  app.use('/api', resourcesRouter)
  app.use('/api/admin', adminRouter)

  // TODO(S1-31-T01): error middleware that writes to error_logs without secrets
  // TODO(S1-32-T01, S1-32-T02): raise outage/critical-error alerts from here
  return app
}
