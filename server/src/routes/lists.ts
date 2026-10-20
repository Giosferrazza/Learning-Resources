import { Router } from 'express'
import { notImplemented } from '../lib/notImplemented'

export const listsRouter = Router()

// S1-08 Favorite and unfavorite, S1-36 View My Favorites
listsRouter.get('/favorites', notImplemented('S1-36-T01'))
listsRouter.post('/favorites', notImplemented('S1-08-T02'))
listsRouter.delete('/favorites/:id', notImplemented('S1-08-T02'))
// S1-13 Name and edit a saved resource list
listsRouter.get('/lists', notImplemented('S1-13-T01'))
listsRouter.post('/lists', notImplemented('S1-13-T01'))
listsRouter.get('/lists/:id', notImplemented('S1-13-T01'))
listsRouter.patch('/lists/:id', notImplemented('S1-13-T02'))
listsRouter.post('/lists/:id/items', notImplemented('S1-13-T02'))
// S1-14 Remove resources from a curated list
listsRouter.delete('/lists/:id/items/:resourceId', notImplemented('S1-14-T01'))
// S1-15 Share a curated list with students (read-only, no sign-in needed)
listsRouter.post('/lists/:id/share', notImplemented('S1-15-T01'))
listsRouter.get('/shared/:token', notImplemented('S1-15-T01'))
