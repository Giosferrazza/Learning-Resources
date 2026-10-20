import type { RequestHandler } from 'express'

// Placeholder handler for routes whose S1 task hasn't landed yet.
export const notImplemented =
  (task: string): RequestHandler =>
  (_req, res) => {
    res.status(501).json({ error: `Not implemented yet (${task})` })
  }
