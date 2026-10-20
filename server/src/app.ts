import cors from 'cors'
import express, { type ErrorRequestHandler } from 'express'
import { logError } from './lib/errorLog.js'
import { HttpError } from './lib/http.js'
import { recordCheck, runHealthCheck, uptimeSeconds } from './lib/monitor.js'
import { accountRouter } from './routes/account.js'
import { adminRouter } from './routes/admin.js'
import { listsRouter } from './routes/lists.js'
import { recommendationsRouter } from './routes/recommendations.js'
import { resourcesRouter } from './routes/resources.js'

// Built separately from index.ts so tests can import the app without listening.
export function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '100kb' }))

  // S1-29-T01 Health: real database round trip plus response time. 503 when the database is down,
  // so external uptime checkers (and our own scheduled checks) see the outage.
  app.get('/api/health', async (_req, res) => {
    const result = await runHealthCheck()
    res.status(result.ok ? 200 : 503).json({ ok: result.ok, database: result.ok ? 'up' : 'down', responseMs: result.responseMs, uptimeSeconds: uptimeSeconds() })
  })

  // S1-29-T02 scheduled uptime check, called by GitHub Actions (or Vercel Cron) with CRON_SECRET
  app.all('/api/cron/uptime', async (req, res) => {
    const secret = process.env.CRON_SECRET
    if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    const result = await runHealthCheck()
    await recordCheck(result)
    res.status(result.ok ? 200 : 503).json(result)
  })

  app.use('/api', accountRouter)
  app.use('/api', recommendationsRouter)
  app.use('/api', listsRouter)
  app.use('/api', resourcesRouter)
  app.use('/api/admin', adminRouter)

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  // S1-31-T01: expected errors (HttpError) go back to the client as-is; anything else is
  // logged with secrets redacted and the client gets a generic message.
  const handleError: ErrorRequestHandler = async (err, req, res, _next) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message, code: err.code })
      return
    }
    if (err?.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'Request body must be valid JSON.' })
      return
    }
    const message = err instanceof Error ? err.message : String(err)
    console.error(`${req.method} ${req.originalUrl}:`, err)
    // Log before responding: a serverless function can stop as soon as the response is sent
    await logError('error', message, {
      route: `${req.method} ${req.route?.path ?? req.path}`,
      userId: req.user?.id ?? null,
      context: { params: req.params, query: req.query, bodyKeys: Object.keys(req.body ?? {}), stack: err instanceof Error ? err.stack : undefined },
    }).catch(() => {})
    res.status(500).json({ error: 'Something went wrong on our side. Please try again.' })
  }
  app.use(handleError)

  return app
}
