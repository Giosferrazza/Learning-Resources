import type { Resource } from './types'

export type CuratedMatch = { resource: Resource; exact: boolean; reasons: string[]; gaps: string[] }
export type ExternalResource = {
  id: string; title: string; description: string; url: string
  medium: string; source: string; attribution: string; thumbnail: string | null
}
// Additional providers adapt to this common external shape; only curated IDs can be saved.
export type DiscoveryItem =
  | { key: string; kind: 'curated'; medium: string | null; match: CuratedMatch }
  | { key: string; kind: 'external'; medium: string; resource: ExternalResource }
export type YouTubeResults = {
  query: string; querySource: 'rules'
  videos: Array<{ id: string; title: string; channel: string; description: string; thumbnail: string | null; url: string }>
}
export function discoveryItems(curated: CuratedMatch[], youtube?: YouTubeResults | null): DiscoveryItem[] {
  return [
    ...curated.map((match): DiscoveryItem => ({ key: `library:${match.resource.id}`, kind: 'curated', medium: match.resource.medium, match })),
    ...(youtube?.videos ?? []).map((video): DiscoveryItem => ({
      key: `youtube:${video.id}`, kind: 'external', medium: 'video',
      resource: { ...video, medium: 'video', source: 'YouTube', attribution: video.channel },
    })),
  ]
}
