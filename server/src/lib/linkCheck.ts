export type LinkStatus = 'ok' | 'broken' | 'unknown'

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36'

/**
 * Does the page at this link exist? 'broken' only when we are sure (404/410, unknown host, bad URL).
 * Bot-blocking (403/429), server errors and timeouts are 'unknown': the page may still work for people.
 * YouTube serves 200 for deleted videos, so videos are checked through oEmbed.
 */
export async function checkLink(raw: string, timeoutMs = 5000): Promise<LinkStatus> {
  let url: URL
  try {
    url = new URL(raw)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return 'broken'
  } catch {
    return 'broken'
  }
  try {
    const video = /(^|\.)youtube\.com$/.test(url.hostname) && url.searchParams.has('v') || url.hostname === 'youtu.be'
    const target = video ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url.toString())}` : url.toString()
    const res = await fetch(target, { redirect: 'follow', signal: AbortSignal.timeout(timeoutMs), headers: { 'user-agent': UA, accept: 'text/html,*/*' } })
    await res.body?.cancel()
    if (res.ok) return 'ok'
    if (res.status === 404 || res.status === 410 || (video && (res.status === 400 || res.status === 401))) return 'broken'
    return 'unknown'
  } catch (err) {
    const code = (err as { cause?: { code?: string } }).cause?.code
    return code === 'ENOTFOUND' || code === 'ERR_INVALID_URL' ? 'broken' : 'unknown'
  }
}
