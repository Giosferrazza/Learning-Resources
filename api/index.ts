// Vercel serverless entry: every /api/* request is rewritten here (see vercel.json)
import { createApp } from '../server/src/app.js'

export default createApp()
