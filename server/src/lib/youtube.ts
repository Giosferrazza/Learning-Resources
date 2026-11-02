import { levels, subjects } from '../../../shared/vocabulary.js'
import type { Answers } from './recommend.js'

export type YouTubeVideo = {
  id: string
  title: string
  channel: string
  description: string
  thumbnail: string | null
  publishedAt: string
  url: string
}

export type VideoResults = { query: string; querySource: 'rules'; videos: YouTubeVideo[] }

type Fetcher = typeof fetch

const goalHints: Record<NonNullable<Answers['goal']>, string> = {
  class: 'lesson explained',
  exam: 'exam preparation practice',
  career: 'practical job skills',
  curiosity: 'introduction explained',
}

// Free deterministic baseline. Replace this pure function with a free/local interpreter
// in the future; no provider should implicitly enable paid query understanding.
export function buildYouTubeQuery(answers: Answers, focus = ''): string {
  return [
    subjects[answers.topic],
    (answers.learningRequest || focus).trim().replace(/\s+/g, ' ').slice(0, 500),
    levels[answers.level],
    answers.goal ? goalHints[answers.goal] : 'tutorial',
  ].filter(Boolean).join(' ')
}

/** Server-only YouTube Data API lookup. Call after authenticating the user. */
export async function searchYouTube(
  answers: Answers,
  focus: string,
  youtubeKey: string,
  fetcher: Fetcher = fetch,
): Promise<VideoResults> {
  const query = buildYouTubeQuery(answers, focus)
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    q: query,
    maxResults: '8',
    order: 'relevance',
    safeSearch: 'moderate',
    videoEmbeddable: 'true',
    key: youtubeKey,
  })
  const response = await fetcher(`https://www.googleapis.com/youtube/v3/search?${params}`, {
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) throw new Error(`YouTube API returned HTTP ${response.status}`)
  const data = await response.json() as {
    items?: Array<{
      id?: { videoId?: string }
      snippet?: { title?: string; description?: string; channelTitle?: string; publishedAt?: string; thumbnails?: { medium?: { url?: string }; default?: { url?: string } } }
    }>
  }
  const seen = new Set<string>()
  const videos: YouTubeVideo[] = []
  for (const item of data.items ?? []) {
    const id = item.id?.videoId
    const snippet = item.snippet
    if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id) || !snippet?.title || seen.has(id)) continue
    seen.add(id)
    videos.push({
      id,
      title: snippet.title,
      channel: snippet.channelTitle ?? 'Unknown channel',
      description: snippet.description ?? '',
      thumbnail: snippet.thumbnails?.medium?.url ?? snippet.thumbnails?.default?.url ?? null,
      publishedAt: snippet.publishedAt ?? '',
      url: `https://www.youtube.com/watch?v=${id}`,
    })
  }
  return { query, querySource: 'rules', videos }
}
