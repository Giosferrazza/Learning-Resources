// @vitest-environment jsdom
import { StrictMode } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RecommendationsPage from './RecommendationsPage'
import QuestionnairePage from './QuestionnairePage'

const mocks = vi.hoisted(() => ({ api: vi.fn(), toggle: vi.fn(), role: 'student' }))
vi.mock('../lib/api', async (original) => ({ ...await original<object>(), api: mocks.api }))
vi.mock('../lib/supabase', () => ({ supabase: {} }))
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ profile: { id: 'user', role: mocks.role } }) }))
vi.mock('../auth/FavoritesProvider', () => ({ useFavorites: () => ({ toggle: mocks.toggle }) }))
vi.mock('../components/FavoriteButton', () => ({ default: ({ resourceId }: { resourceId: string }) => <button>Favorite {resourceId}</button> }))
vi.mock('../components/AddToList', () => ({ default: ({ resourceId }: { resourceId: string }) => <button>Add {resourceId}</button> }))
const result = (id = 'a') => ({ responseId: id, answers: { topic: 'python', level: 'beginner', media: [], goal: null }, exact: true, libraryEmpty: false,
  items: [{ resource: { id: 'curated', title: `Guide ${id}`, medium: 'article' }, exact: true, reasons: ['Subject: Python'], gaps: [] }] })
const videos = (title = 'Loop video') => ({ query: 'Python loops', querySource: 'rules', videos: [{ id: 'video', title, channel: 'Teacher', description: '', url: 'https://www.youtube.com/watch?v=aB3dE5fG7hI', thumbnail: 'https://i.ytimg.com/example.jpg' }] })
function Navigation() {
  const navigate = useNavigate()
  return <><button onClick={() => navigate('/recommendations?responseId=b')}>Switch questionnaire</button><RecommendationsPage /></>
}
const mount = () => render(<StrictMode><MemoryRouter initialEntries={['/recommendations?responseId=a']}><Navigation /></MemoryRouter></StrictMode>)
beforeEach(() => { vi.resetAllMocks(); mocks.role = 'student' })
afterEach(cleanup)

describe('unified recommendations', () => {
  it('automatically loads videos once, distinguishes sources and filters both formats', async () => {
    mocks.api.mockImplementation(async (path: string) => path.startsWith('/youtube') ? videos() : result())
    mount()
    expect(await screen.findByText('Loop video')).toBeTruthy()
    expect(screen.getByText('Guide a')).toBeTruthy()
    expect(screen.getByText(/Not educator-reviewed/)).toBeTruthy()
    expect(screen.getByText(/Learning Resources.*Educator-approved/)).toBeTruthy()
    expect(screen.getByText('Teacher')).toBeTruthy()
    expect(screen.queryByText('Find YouTube videos')).toBeNull()
    expect(mocks.api.mock.calls.filter(([path]) => path.startsWith('/youtube'))).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Video' }))
    expect(screen.queryByText('Guide a')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Article' }))
    expect(screen.queryByText('Loop video')).toBeNull()
  })
  it('keeps curated resources available while video search is pending and when it fails', async () => {
    let reject!: (error: Error) => void
    mocks.api.mockImplementation((path: string) => path.startsWith('/youtube') ? new Promise((_resolve, no) => { reject = no }) : Promise.resolve(result()))
    mount()
    expect(await screen.findByText('Guide a')).toBeTruthy()
    expect(screen.getByText(/Finding YouTube videos/)).toBeTruthy()
    await act(async () => reject(new Error('YouTube is unavailable')))
    expect(await screen.findByText(/Your library recommendations are still available/)).toBeTruthy()
    expect(screen.getByText('Guide a')).toBeTruthy()
  })
  it('ignores a late video response after switching questionnaires', async () => {
    let finishOld!: (value: unknown) => void
    mocks.api.mockImplementation((path: string) => path.startsWith('/youtube')
      ? path.endsWith('=a') ? new Promise((resolve) => { finishOld = resolve }) : Promise.resolve(videos('New video'))
      : Promise.resolve(result(path.endsWith('=b') ? 'b' : 'a')))
    mount()
    await screen.findByText('Guide a')
    fireEvent.click(screen.getByText('Switch questionnaire'))
    expect(screen.queryByText('Guide a')).toBeNull()
    await screen.findByText('New video')
    await act(async () => finishOld(videos('Stale video')))
    expect(screen.queryByText('Stale video')).toBeNull()
    expect(screen.getByText('Guide b')).toBeTruthy()
  })
  it('ignores a late curated response after switching questionnaires', async () => {
    let finishOld!: (value: unknown) => void
    mocks.api.mockImplementation((path: string) => path.startsWith('/youtube') ? Promise.resolve(videos())
      : path.endsWith('=a') ? new Promise((resolve) => { finishOld = resolve }) : Promise.resolve(result('b')))
    mount()
    fireEvent.click(screen.getByText('Switch questionnaire'))
    await screen.findByText('Guide b')
    await act(async () => finishOld(result('a')))
    expect(screen.queryByText('Guide a')).toBeNull()
    expect(mocks.api.mock.calls.filter(([path]) => path === '/youtube/recommendations?responseId=a')).toHaveLength(0)
  })
  it('preserves professor actions and saves only curated IDs', async () => {
    mocks.role = 'professor'
    mocks.api.mockImplementation(async (path: string) => path === '/lists' ? { list: { id: 'list', name: 'Saved' } } : path.startsWith('/youtube') ? videos() : result())
    mount()
    await screen.findByText('Loop video')
    expect(screen.getByText('Add curated')).toBeTruthy()
    expect(screen.getByText('Favorite curated')).toBeTruthy()
    fireEvent.click(screen.getByText('Save this list'))
    await waitFor(() => expect(mocks.toggle).toHaveBeenCalledWith({ listId: 'list' }))
    expect(mocks.api).toHaveBeenCalledWith('/lists', expect.objectContaining({ body: expect.objectContaining({ resourceIds: ['curated'] }) }))
  })
})

describe('simple questionnaire', () => {
  it.each([null, 'for loops'])('prefills old or new answers and submits optional text: %s', async (learning_request) => {
    mocks.api.mockImplementation(async (path: string) => path.endsWith('/latest') ? { response: { topic: 'python', knowledge_level: 'beginner', preferred_media: ['video'], goal: 'exam', ...(learning_request ? { learning_request } : {}) } } : { id: 'new' })
    render(<MemoryRouter><QuestionnairePage /></MemoryRouter>)
    const field = await screen.findByLabelText(/What specifically do you want to learn/)
    expect((field as HTMLTextAreaElement).value).toBe(learning_request ?? '')
    expect((field as HTMLTextAreaElement).maxLength).toBe(500)
    fireEvent.click(screen.getByRole('button', { name: /Get my recommendations/i }))
    await waitFor(() => expect(mocks.api).toHaveBeenCalledWith('/questionnaire', { method: 'POST', body: { topic: 'python', level: 'beginner', media: ['video'], goal: 'exam', learningRequest: learning_request ?? '' } }))
  })
})
