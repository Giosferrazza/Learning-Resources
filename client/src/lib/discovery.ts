import { discoveryTypes, type DiscoveryType, type Medium } from '../../../shared/vocabulary'
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
export type WebResults = {
  resources: Array<{ id: string; title: string; description: string; url: string; source: string; type: DiscoveryType; medium: Medium; free: boolean }>
}
export function discoveryItems(curated: CuratedMatch[], web?: WebResults | null): DiscoveryItem[] {
  return [
    ...curated.map((match): DiscoveryItem => ({ key: `library:${match.resource.id}`, kind: 'curated', medium: match.resource.medium, match })),
    ...(web?.resources ?? []).map((found): DiscoveryItem => ({
      key: `web:${found.id}`, kind: 'external', medium: found.medium,
      resource: {
        id: found.id, title: found.title, description: found.description, url: found.url, medium: found.medium,
        source: found.source, attribution: [discoveryTypes[found.type], found.free ? 'Free' : null].filter(Boolean).join(' · '), thumbnail: null,
      },
    })),
  ]
}
