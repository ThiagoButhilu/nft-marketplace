import { expect, test, USERS } from './fixtures'

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

async function openAccount(
  app: import('./fixtures').App,
  path: '/account/profile' | '/account/wallets' | '/account/favorites',
  user: keyof typeof USERS = 'bruno',
) {
  await app.open('/')
  await app.loginViaApi(user)
  await app.goto(path)
}

test.describe('Perfil do colecionador', () => {
  test('edição persiste após refresh e atualiza o header @main', async ({
    app,
    page,
    isMobile,
  }) => {
    await openAccount(app, '/account/profile')
    const displayName = page.getByRole('textbox', { name: /^Nome de exibição/ })
    await expect(displayName).toHaveValue('Bruno Costa')

    await displayName.fill('Bruno C. Costa')
    await page.getByRole('textbox', { name: /^Nome ENS/ }).fill('brunocosta')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByText('Perfil atualizado').first()).toBeVisible()

    await page.reload()
    await app.waitForMocks()
    await expect(displayName).toHaveValue('Bruno C. Costa')
    await expect(page.getByRole('textbox', { name: /^Nome ENS/ })).toHaveValue(
      'brunocosta',
    )
    if (!isMobile)
      await expect(
        page.getByRole('link', { name: /Minha conta, Bruno C. Costa/ }),
      ).toBeVisible()
  })

  test('validação no cliente e conflitos retornados pela API', async ({
    app,
    page,
  }) => {
    await openAccount(app, '/account/profile')
    const email = page.getByRole('textbox', { name: /^E-mail/ })
    await email.fill('nao-e-email')
    await page.getByRole('textbox', { name: /^Nome ENS/ }).fill('x')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByText('E-mail inválido')).toBeVisible()
    await expect(
      page.getByText('Use letras, números ou hífen (mín. 3)'),
    ).toBeVisible()
    await expect(email).toBeFocused()

    await email.fill(USERS.ana.email)
    await page.getByRole('textbox', { name: /^Nome ENS/ }).fill('brunocosta')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(
      page.getByText('Este e-mail já está cadastrado.'),
    ).toBeVisible()
    await expect(email).toHaveAttribute('aria-invalid', 'true')

    await email.fill(USERS.bruno.email)
    await page
      .getByRole('textbox', { name: /^Nome de usuário/ })
      .fill('ana.lima')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(
      page.getByText('Este nome de usuário já está em uso.'),
    ).toBeVisible()
  })

  test('avatar: envio, remoção e validação de arquivo', async ({
    app,
    page,
  }) => {
    await openAccount(app, '/account/profile')
    const fileInput = page.locator('input[type=file]')

    await fileInput.setInputFiles({
      name: 'grande.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(600 * 1024, 1),
    })
    await expect(
      page.getByText('A imagem deve ter no máximo 512 KB.'),
    ).toBeVisible()

    await fileInput.setInputFiles({
      name: 'texto.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('oi'),
    })
    await expect(
      page.getByText('Use uma imagem PNG, JPEG ou WebP.'),
    ).toBeVisible()

    await fileInput.setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: PNG_1X1,
    })
    await expect(
      page.getByRole('img', { name: 'Seu avatar atual' }),
    ).toBeVisible()
    await expect(
      page.getByRole('banner').locator('img[src^="data:image/png"]'),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Remover' }).click()
    await expect(page.getByRole('img', { name: 'Sem avatar' })).toBeVisible()
    const profile = await app.api<{ avatarUrl: string | null }>('/profile')
    expect(profile.avatarUrl).toBeNull()
  })

  test('senha: atual incorreta, nova fraca e troca efetiva', async ({
    app,
    page,
  }) => {
    await openAccount(app, '/account/profile')
    const current = page.getByLabel(/^Senha atual/)
    const next = page.getByLabel(/^Nova senha/)
    const confirm = page.getByLabel(/^Confirmar nova senha/)
    const save = page.getByRole('button', { name: 'Salvar', exact: true })
    await page.getByRole('textbox', { name: /^Nome ENS/ }).fill('brunocosta')

    await current.fill(USERS.bruno.password)
    await next.fill('fraca')
    await confirm.fill('fraca')
    await save.click()
    await expect(page.getByText(/Mínimo de 8 caracteres/).first()).toBeVisible()
    await expect(next).toHaveAttribute('aria-invalid', 'true')

    await current.fill('Errada2026')
    await next.fill('NovaSenha2026')
    await confirm.fill('NovaSenha2026')
    await save.click()
    await expect(current).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('Senha atual incorreta.').first()).toBeVisible()
    await expect(
      page.getByText('Dados salvos; a senha não foi alterada').first(),
    ).toBeVisible()

    await current.fill(USERS.bruno.password)
    await save.click()
    await expect(
      page.getByText('Perfil e senha atualizados').first(),
    ).toBeVisible()
    await expect(current).toHaveValue('')

    const login = await page.evaluate(async () => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'bruno@kurio.test',
          password: 'NovaSenha2026',
        }),
      })
      return response.status
    })
    expect(login).toBe(200)
  })

  test('acesso negado (403) mostra erro sem dados', async ({ app, page }) => {
    await app.open('/')
    await app.loginViaApi('bruno')
    await app.setScenario('forbidden')
    await app.goto('/account/profile')
    await expect(
      page.getByText('Você não tem permissão para acessar estes dados'),
    ).toBeVisible()
    await expect(
      page.getByRole('textbox', { name: /^Nome de exibição/ }),
    ).toHaveCount(0)
  })
})

test.describe('Carteiras', () => {
  test('carteira principal: validação e edição persistida @main', async ({
    app,
    page,
  }) => {
    await openAccount(app, '/account/wallets')
    const primary = page.getByRole('form', { name: 'Carteira principal' })
    const address = primary.getByRole('textbox', {
      name: /^Endereço da carteira/,
    })
    await expect(address).toHaveValue(
      '0x1234567890aBcdEF1234567890abCDef12345678',
    )

    const referral = primary.getByRole('textbox', {
      name: /^Código de indicação/,
    })
    await address.fill('0x123')
    await referral.fill('X'.repeat(20))
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(
      primary.getByText('Endereço 0x inválido (40 caracteres hexadecimais)'),
    ).toBeVisible()
    await expect(
      primary.getByText('Use letras, números ou hífen (mín. 3)'),
    ).toBeVisible() // ENS required (fixture has none)
    await expect(primary.getByText('Máximo de 16 caracteres')).toBeVisible()
    // Every message is in Portuguese: no Zod default (English) text leaks.
    await expect(primary).not.toContainText(/expected|too big|invalid/i)

    await referral.fill('KURIO2026')
    await address.fill('0xAbCdEf0123456789aBcDeF0123456789AbCdEf01')
    await primary.getByRole('textbox', { name: /^Nome ENS/ }).fill('brunocosta')
    await primary.getByLabel(/^Rede/).selectOption('polygon')
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(
      page.getByText('Carteira principal atualizada').first(),
    ).toBeVisible()

    await page.reload()
    await app.waitForMocks()
    await expect(address).toHaveValue(
      '0xAbCdEf0123456789aBcDeF0123456789AbCdEf01',
    )
    await expect(primary.getByLabel(/^Rede/)).toHaveValue('polygon')
  })

  test('secundária "igual à principal": conflito de endereço e cadastro', async ({
    app,
    page,
  }) => {
    await openAccount(app, '/account/wallets')
    await page
      .getByRole('checkbox', { name: 'Igual à carteira principal' })
      .check()
    const secondary = page.getByRole('form', { name: 'Carteira secundária' })
    await expect(
      secondary.getByRole('textbox', { name: /^Nome de exibição/ }),
    ).toHaveValue('Bruno Costa')
    await expect(
      secondary.getByRole('textbox', { name: /^Endereço da carteira/ }),
    ).toHaveValue('')

    await secondary
      .getByRole('textbox', { name: /^Endereço da carteira/ })
      .fill('0x1234567890aBcdEF1234567890abCDef12345678')
    await secondary
      .getByRole('textbox', { name: /^Nome ENS/ })
      .fill('brunocosta')
    await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(
      secondary.getByText('Este endereço já está em outra carteira sua.'),
    ).toBeVisible()

    await secondary
      .getByRole('textbox', { name: /^Endereço da carteira/ })
      .fill('0x9999999999aBcdEF1234567890abCDef12345678')
    await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(
      page.getByText('Carteira secundária cadastrada').first(),
    ).toBeVisible()

    const wallets = await app.api<{ items: Array<{ role: string }> }>(
      '/wallets',
    )
    expect(wallets.items.map((w) => w.role).sort()).toEqual([
      'primary',
      'secondary',
    ])

    await app.addToCart([['sage-nomad-009', '1-50', 1]])
    await app.goto('/checkout')
    await expect(
      page.getByRole('radio', { name: /WalletConnect/ }),
    ).toHaveCount(2)
  })
})

test.describe('Lista de interesse', () => {
  test('lista os favoritos do usuário e o estado vazio', async ({
    app,
    page,
  }) => {
    await openAccount(app, '/account/favorites', 'ana')
    await expect(
      page.getByRole('heading', { name: 'Emerald Ape #042' }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Ivory Baron #088' }),
    ).toBeVisible()

    await app.loginViaApi('bruno')
    await app.goto('/account/favorites')
    await expect(
      page.getByText('Você ainda não favoritou nenhum NFT.'),
    ).toBeVisible()
  })
})
