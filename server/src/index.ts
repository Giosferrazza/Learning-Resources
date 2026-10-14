import 'dotenv/config'
import cors from 'cors'
import express, { type RequestHandler } from 'express'

const app = express()
app.use(cors())
app.use(express.json())

const notImplemented =
  (task: string): RequestHandler =>
  (_req, res) => {
    res.status(501).json({ error: `Not implemented yet (${task})` })
  }

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

// S1-01 Create an account
app.post('/api/auth/register', notImplemented('S1-01-T02'))
// S1-03 Change password
app.post('/api/account/password', notImplemented('S1-03-T02'))
// S1-04 Update profile information
app.get('/api/profile', notImplemented('S1-04-T02'))
app.patch('/api/profile', notImplemented('S1-04-T02'))

const port = Number(process.env.PORT ?? 3001)
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})
