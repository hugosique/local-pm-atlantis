import { test, expect } from '@playwright/test'

test('board renders all three columns', async ({ page }) => {
  await page.goto('/board')
  await expect(page.locator('[data-testid="column-TODO"]')).toBeVisible()
  await expect(page.locator('[data-testid="column-IN_PROGRESS"]')).toBeVisible()
  await expect(page.locator('[data-testid="column-DONE"]')).toBeVisible()
})

test('projects page renders', async ({ page }) => {
  const res = await page.goto('/projects')
  expect(res?.status()).toBe(200)
  await page.waitForLoadState('networkidle')
})

test('teams page renders', async ({ page }) => {
  const res = await page.goto('/teams')
  expect(res?.status()).toBe(200)
  await page.waitForLoadState('networkidle')
})

test('the users collection accepts a first-user registration over REST', async ({ request }) => {
  const email = `smoke-${Date.now()}@local-pm.test`
  const res = await request.post('/api/users', {
    data: { email, password: 'LocalPM-smoke-2026', name: 'Smoke', role: 'admin' },
  })

  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  expect(body.doc.email).toBe(email)
  expect(body.doc.role).toBe('admin')
})

test('admin panel renders its login screen', async ({ page }) => {
  const res = await page.goto('/admin')
  expect(res!.status()).toBeLessThan(500)
})

test('custom /login page renders and sidebar exposes account & admin menu', async ({ page }) => {
  const loginRes = await page.goto('/login')
  expect(loginRes?.status()).toBe(200)
  await expect(page.locator('#login-email')).toBeVisible()
  await expect(page.locator('#login-password')).toBeVisible()

  await page.goto('/board')
  const trigger = page.locator('[data-testid="sidebar-account-menu"]')
  await expect(trigger).toBeVisible()
  await trigger.click()
  await expect(page.getByRole('menuitem', { name: 'Admin panel' })).toBeVisible()
})

test('with LOCAL_PM_REQUIRE_AUTH off, anonymous API access still works', async ({ request }) => {
  const res = await request.get('/api/tickets?limit=1&depth=0')
  expect(res.ok()).toBeTruthy()
})

test('no uncaught page errors on the board', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.goto('/board')
  await page.waitForLoadState('networkidle')

  expect(errors).toEqual([])
})
