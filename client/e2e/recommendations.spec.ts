import { test, expect } from '@playwright/test'

test('questionnaire to unified results fits the viewport', async ({ page }, testInfo) => {
  let saved: Record<string, unknown> | undefined
  let searches = 0
  await page.addInitScript(() => {
    localStorage.setItem('sb-localhost-auth-token', JSON.stringify({ access_token: 'mock-session', refresh_token: 'mock-refresh', expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user: { id: 'student', aud: 'authenticated', email: 'student@example.test' } }))
  })
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    let json: unknown
    if (path === '/api/me') json = { profile: { id: 'student', display_name: 'Test Student', role: 'student', account_status: 'active', walkthrough_completed_at: '2026-01-01' } }
    else if (path === '/api/favorites') json = { favorites: [] }
    else if (path === '/api/questionnaire/latest') json = { response: null }
    else if (path === '/api/questionnaire') { saved = route.request().postDataJSON(); json = { id: '11111111-1111-4111-8111-111111111111' } }
    else if (path === '/api/recommendations') json = { responseId: '11111111-1111-4111-8111-111111111111', answers: saved, exact: true, libraryEmpty: false, items: [{ resource: { id: 'curated', title: 'Python loops guide', description: 'A reviewed guide to iteration.', subject: 'python', level: 'beginner', medium: 'article' }, exact: true, reasons: ['Subject: Python'], gaps: [] }] }
    else if (path === '/api/discovery/recommendations') { searches++; json = { resources: [{ id: 'aB3dE5fG7hI', title: 'Python for loops and while loops with beginner examples', description: 'Mock video for layout verification.', url: 'https://www.youtube.com/watch?v=aB3dE5fG7hI', source: 'Example Teacher', type: 'tutorial', medium: 'video', free: true }] } }
    else json = { notifications: [] }
    await route.fulfill({ json })
  })
  await page.route('https://i.ytimg.com/**', (route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#dbeafe"/><text x="80" y="90">Mock thumbnail</text></svg>' }))
  await page.goto('/questionnaire')
  await page.getByRole('combobox', { name: 'Subject', exact: true }).selectOption('python')
  await page.getByRole('combobox', { name: 'Your knowledge level', exact: true }).selectOption('beginner')
  await page.getByLabel(/What specifically do you want to learn/).fill('I want to understand for loops and while loops with beginner-friendly examples.')
  await expect(page.locator('textarea')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('questionnaire.png'), fullPage: true })
  await page.getByRole('button', { name: /Get my recommendations/i }).click()
  await expect(page.getByText('Python loops guide', { exact: true })).toBeVisible()
  await expect(page.getByText('Python for loops and while loops with beginner examples', { exact: true })).toBeVisible()
  await expect(page.getByText(/Not educator-reviewed/)).toBeVisible()
  expect(saved?.learningRequest).toContain('while loops')
  expect(searches).toBe(1)
  const video = page.getByRole('link', { name: 'Python for loops and while loops with beginner examples', exact: true })
  await expect(video).toHaveAttribute('href', 'https://www.youtube.com/watch?v=aB3dE5fG7hI')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('recommendations.png'), fullPage: true })
  await page.getByRole('button', { name: 'Video', exact: true }).click()
  await expect(page.getByText('Python loops guide', { exact: true })).toHaveCount(0)
  await expect(video).toBeVisible()
})
