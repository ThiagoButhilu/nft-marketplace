import { expect, test, USERS, type App } from './fixtures'
import type { Page } from '@playwright/test'

/** Login/signup render as a dialog on desktop and as a page on mobile. */
function authScope(
  page: Page,
  isMobile: boolean,
  name: 'Entrar' | 'Criar conta',
) {
  return isMobile ? page.locator('main') : page.getByRole('dialog', { name })
}

const password = (scope: ReturnType<typeof authScope>) =>
  scope.getByLabel(/^Senha\*?$/)

async function submitLogin(
  app: App,
  isMobile: boolean,
  user: keyof typeof USERS,
) {
  const scope = authScope(app.page, isMobile, 'Entrar')
  await scope.getByRole('textbox', { name: 'E-mail' }).fill(USERS[user].email)
  await password(scope).fill(USERS[user].password)
  await scope.getByRole('button', { name: 'Entrar', exact: true }).click()
}

test.describe('Cadastro', () => {
  test('validação no cliente, conflito da API e sucesso @main', async ({
    app,
    page,
    isMobile,
  }) => {
    await app.open('/signup?redirect=/cart')
    const scope = authScope(page, isMobile, 'Criar conta')
    const submit = scope.getByRole('button', {
      name: isMobile ? 'Criar perfil' : 'Criar conta',
    })

    await scope.getByRole('textbox', { name: 'Nome de usuário' }).fill('x')
    await scope.getByRole('textbox', { name: 'E-mail' }).fill(USERS.ana.email)
    await password(scope).fill('abc')
    await scope.getByLabel(/^Confirmar senha\*?$/).fill('abd')
    await submit.click()
    await expect(scope.getByText('Mínimo de 3 caracteres')).toBeVisible()
    await expect(scope.getByText('As senhas não coincidem')).toBeVisible()
    await expect(
      scope.getByRole('textbox', { name: 'Nome de usuário' }),
    ).toBeFocused()

    await scope
      .getByRole('textbox', { name: 'Nome de usuário' })
      .fill('novo.colecionador')
    await password(scope).fill('Senha2026')
    await scope.getByLabel(/^Confirmar senha\*?$/).fill('Senha2026')
    await submit.click()
    const email = scope.getByRole('textbox', { name: 'E-mail' })
    await expect(
      scope.getByText('Este e-mail já está cadastrado.'),
    ).toBeVisible()
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    await expect(email).toBeFocused()

    await email.fill('novo@kurio.test')
    await scope
      .getByRole('textbox', { name: 'Nome de usuário' })
      .fill('ana.lima')
    await submit.click()
    await expect(
      scope.getByText('Este nome de usuário já está em uso.'),
    ).toBeVisible()

    await scope
      .getByRole('textbox', { name: 'Nome de usuário' })
      .fill('novo.colecionador')
    await submit.click()
    await expect(page).toHaveURL(/\/cart$/)
    if (!isMobile)
      await expect(
        page.getByRole('link', { name: /Minha conta, novo.colecionador/ }),
      ).toBeVisible()
  })
})

test.describe('Login e rotas privadas', () => {
  test('rota privada redireciona e o login volta ao fluxo @main', async ({
    app,
    page,
    isMobile,
  }) => {
    await app.open('/checkout')
    await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout/)

    const scope = authScope(page, isMobile, 'Entrar')
    await scope.getByRole('button', { name: 'Entrar', exact: true }).click()
    const email = scope.getByRole('textbox', { name: 'E-mail' })
    await expect(scope.getByText('E-mail inválido')).toBeVisible()
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    await expect(email).toHaveAttribute('aria-describedby', /error/)
    await expect(email).toBeFocused()

    await email.fill(USERS.ana.email)
    await password(scope).fill('senha-errada')
    await scope.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(
      scope
        .getByRole('alert')
        .filter({ hasText: 'E-mail ou senha incorretos.' }),
    ).toBeVisible()

    await password(scope).fill(USERS.ana.password)
    await scope.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL((url) => url.pathname === '/checkout')
  })

  test('usuário logado em /login vai direto ao destino', async ({
    app,
    page,
  }) => {
    await app.open('/')
    await app.loginViaApi('ana')
    await app.goto('/login?redirect=/account/wallets')
    await expect(page).toHaveURL(/\/account\/wallets$/)
  })

  test('redirect externo é ignorado (open redirect)', async ({
    app,
    page,
    isMobile,
  }) => {
    await app.open('/login?redirect=https://evil.example/x')
    await submitLogin(app, isMobile, 'ana')
    await expect(page).toHaveURL(
      (url) => url.host === 'localhost:4173' && url.pathname === '/',
    )
  })

  test('sessão sobrevive ao refresh e logout limpa dados privados', async ({
    app,
    page,
  }) => {
    await app.open('/')
    await app.loginViaApi('ana')
    await app.goto('/account/profile')
    await page.reload()
    await app.waitForMocks()
    await expect(
      page.getByRole('link', { name: /Minha conta, Ana Lima/ }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL((url) => url.pathname === '/')
    await expect(
      page.getByRole('link', { name: 'Entrar' }).first(),
    ).toBeVisible()
    expect(
      await page.evaluate(() => localStorage.getItem('kurio.session')),
    ).toBeNull()
  })

  test('troca de usuário não expõe dados do anterior', async ({
    app,
    page,
  }) => {
    await app.open('/')
    await app.loginViaApi('ana')
    await app.addToCart([['sage-nomad-009', '1-50', 2]])
    await app.goto('/cart')
    await expect(
      page.getByRole('heading', { name: /Sage Nomad/ }),
    ).toBeVisible()

    await app.goto('/account/profile')
    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL((url) => url.pathname === '/')
    await app.loginViaApi('bruno')
    await app.goto('/cart')
    await expect(
      page.getByRole('heading', { name: 'Seu carrinho está vazio' }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: /Minha conta, Bruno Costa/ }),
    ).toBeVisible()
  })
})

test.describe('Expiração de sessão', () => {
  test('expira por tempo numa tela privada e retoma após login', async ({
    app,
    page,
    isMobile,
  }) => {
    await page.clock.install()
    await app.open('/')
    await app.setScenario('session-expired') // sessions last 20 s
    await app.loginViaApi('bruno')
    await app.goto('/account/wallets')

    await page.clock.fastForward('00:25')
    await expect(page).toHaveURL(/\/login\?.*motivo=expirada/)
    await expect(
      page.getByText('Sua sessão expirou. Entre novamente'),
    ).toBeVisible()
    await expect(page.getByText('Sua sessão expirou').first()).toBeVisible()

    await app.setScenario('fast')
    await submitLogin(app, isMobile, 'bruno')
    await expect(page).toHaveURL(/\/account\/wallets$/)
  })

  test('401 do servidor durante a navegação também encerra a sessão', async ({
    app,
    page,
  }) => {
    await app.open('/')
    await app.loginViaApi('ana')
    await app.goto('/cart')
    await app.mock('expireSessions')
    await page.reload()
    await app.waitForMocks()
    await expect(
      page.getByRole('link', { name: 'Entrar' }).first(),
    ).toBeVisible()
    await expect(page.getByText('Sua sessão expirou').first()).toBeVisible()
  })
})

test.describe('Favoritos', () => {
  test('visitante é levado ao login', async ({ app, page }) => {
    await app.open('/nft/emerald-ape-042')
    const article = page
      .getByRole('article')
      .filter({ has: page.locator('#nft-title') })
    await article.getByRole('button', { name: 'Favoritar' }).click()
    await expect(page).toHaveURL(/\/login\?redirect=/)
  })

  test('favorito persiste para o usuário autenticado @main', async ({
    app,
    page,
  }) => {
    await app.open('/')
    await app.loginViaApi('bruno')
    await app.goto('/nft/sage-nomad-009')
    const button = page
      .getByRole('button', { name: /Favoritar Sage Nomad|^Favoritar$/ })
      .first()
    await button.click()
    await expect(
      page
        .getByRole('button', {
          name: /Favoritado|Remover Sage Nomad #009 dos favoritos/,
        })
        .first(),
    ).toBeVisible()
    await page.reload()
    await app.waitForMocks()
    await expect(
      page
        .getByRole('button', {
          name: /Favoritado|Remover Sage Nomad #009 dos favoritos/,
        })
        .first(),
    ).toBeVisible()
    const favorites = await app.api<{ nftIds: string[] }>('/favorites')
    expect(favorites.nftIds).toContain('sage-nomad-009')
  })

  test('falha da mutation desfaz a atualização otimista', async ({
    app,
    page,
  }) => {
    await app.open('/')
    await app.loginViaApi('bruno')
    await app.goto('/nft/sage-nomad-009')
    await app.setScenario('favorite-error', { latency: { min: 400, max: 400 } })
    const article = page
      .getByRole('article')
      .filter({ has: page.locator('#nft-title') })

    await article.getByRole('button', { name: 'Favoritar' }).click()
    await expect(
      article.getByRole('button', { name: 'Favoritado' }),
    ).toBeVisible() // optimistic
    await expect(
      page.getByText('Não foi possível atualizar os favoritos').first(),
    ).toBeVisible()
    await expect(
      article.getByRole('button', { name: 'Favoritar' }),
    ).toHaveAttribute('aria-pressed', 'false') // rolled back

    await app.setScenario('fast')
    await article.getByRole('button', { name: 'Favoritar' }).click()
    await expect(
      article.getByRole('button', { name: 'Favoritado' }),
    ).toBeVisible()
  })
})
