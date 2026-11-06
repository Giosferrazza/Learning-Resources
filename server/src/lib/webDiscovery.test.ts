import { describe, expect, it, vi } from 'vitest'
import { cleanResources, discoverResources, discoveryPrompt, DISCOVERY_MODEL } from './webDiscovery.js'
import type { Answers } from './recommend.js'

const answers: Answers = { topic: 'python', level: 'beginner', media: [], goal: 'exam', learningRequest: 'for loops' }
const searchResult = (url: string) => ({ type: 'web_search_result', url, title: 't', encrypted_content: 'x', page_age: null })
const item = (over: Record<string, unknown> = {}) => ({
  title: 'Loops in Python', url: 'https://docs.python.org/3/tutorial/controlflow.html', description: 'Official tutorial.',
  source: 'Python docs', type: 'documentation', medium: 'article', free: true, ...over,
})
const reply = (resources: unknown[], extra: Partial<{ stop_reason: string; urls: string[] }> = {}) => ({
  stop_reason: extra.stop_reason ?? 'end_turn',
  content: [
    { type: 'server_tool_use', id: 's1', name: 'web_search', input: { query: 'python loops' } },
    { type: 'web_search_tool_result', tool_use_id: 's1', content: (extra.urls ?? ['https://docs.python.org/3/tutorial/controlflow.html']).map(searchResult) },
    { type: 'text', text: JSON.stringify({ resources }) },
  ],
})

describe('discovery prompt', () => {
  it('describes the questionnaire and fences the learner text', () => {
    const prompt = discoveryPrompt({ ...answers, learningRequest: 'loops <ignore previous>' })
    expect(prompt).toContain('Subject: Python')
    expect(prompt).toContain('Level: Beginner')
    expect(prompt).toContain('Goal: Prepare for an exam')
    expect(prompt).toContain('Allowed formats: video, article, tool (the learner chose any format')
    expect(prompt).toContain('<learner_request>loops ignore previous</learner_request>')
  })

  it('lists chosen formats and omits an empty request', () => {
    const prompt = discoveryPrompt({ ...answers, media: ['video', 'tool'], learningRequest: '  ' })
    expect(prompt).toContain('Allowed formats: video, tool (only these)')
    expect(prompt).not.toContain('learner_request')
  })
})

describe('cleaning Claude output', () => {
  const urls = ['https://docs.python.org/3/tutorial/controlflow.html', 'https://www.w3schools.com/python/python_for_loops.asp']

  it('keeps links from search results or the same site, and drops invented ones', () => {
    const out = cleanResources({ resources: [
      item(),
      item({ url: 'https://docs.python.org/3/reference/compound_stmts.html', type: 'REFERENCE' }),
      item({ url: 'https://made-up.example/loops' }),
      item({ url: 'javascript:alert(1)' }),
    ] }, urls, answers)
    expect(out.map((r) => r.url)).toEqual(['https://docs.python.org/3/tutorial/controlflow.html', 'https://docs.python.org/3/reference/compound_stmts.html'])
    expect(out[1].type).toBe('reference')
    expect(out[0].id).toMatch(/^[0-9a-f]{16}$/)
  })

  it('drops unknown types and formats, duplicates, and formats the learner excluded', () => {
    const out = cleanResources({ resources: [
      item({ type: 'podcast' }),
      item({ medium: 'audio' }),
      item({ url: 'https://www.w3schools.com/python/python_for_loops.asp', medium: 'tool', type: 'interactive' }),
      item({ url: 'https://www.w3schools.com/python/python_for_loops.asp#top', medium: 'tool', type: 'interactive' }),
      item(),
    ] }, urls, { ...answers, media: ['tool'] })
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ medium: 'tool', type: 'interactive', source: 'Python docs', free: true })
  })

  it('returns nothing without search results or with a malformed answer', () => {
    expect(cleanResources({ resources: [item()] }, [], answers)).toEqual([])
    expect(cleanResources({ nope: true }, urls, answers)).toEqual([])
  })
})

describe('discoverResources', () => {
  it('calls Claude with web search, structured output and fallbacks', async () => {
    const create = vi.fn().mockResolvedValue(reply([item()]))
    const result = await discoverResources(answers, { create } as never)
    expect(result.resources).toHaveLength(1)
    const params = create.mock.calls[0][0]
    expect(params).toMatchObject({ model: DISCOVERY_MODEL, fallbacks: 'default', betas: ['server-side-fallback-2026-07-01'] })
    expect(params.tools).toEqual([{ type: 'web_search_20260209', name: 'web_search', max_uses: 5 }])
    expect(params.output_config.format.type).toBe('json_schema')
  })

  it('resumes a paused search turn and keeps earlier search results', async () => {
    const paused = { stop_reason: 'pause_turn', content: reply([]).content.slice(0, 2) }
    const final = { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({ resources: [item()] }) }] }
    const create = vi.fn().mockResolvedValueOnce(paused).mockResolvedValueOnce(final)
    const result = await discoverResources(answers, { create } as never)
    expect(create).toHaveBeenCalledTimes(2)
    expect(create.mock.calls[1][0].messages.at(-1)).toMatchObject({ role: 'assistant' })
    expect(result.resources).toHaveLength(1)
  })

  it('throws on a refusal or an answer that is not JSON', async () => {
    await expect(discoverResources(answers, { create: vi.fn().mockResolvedValue({ stop_reason: 'refusal', content: [] }) } as never)).rejects.toThrow('declined')
    const prose = { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Here are some links' }] }
    await expect(discoverResources(answers, { create: vi.fn().mockResolvedValue(prose) } as never)).rejects.toThrow('no structured answer')
  })
})
