import { expect, test } from './fixtures'

type Order = {
  id: string
  status: string
  total: string
  lines: Array<{ unitPrice: string }>
}

test.describe('Compra completa', () => {
  test('do catálogo ao recibo confirmado @main', async ({
    app,
    page,
    isMobile,
  }) => {
    await app.open('/')
    await app.loginViaApi('ana')
    await app.setScenario('fast', { paymentDelayMs: 600 })
    await app.goto('/')

    await app.goto('/?q=ivory')
    await page
      .locator('#catalogo')
      .getByRole('link', { name: 'Ivory Baron #088', exact: true })
      .click()
    await expect(page).toHaveURL(/\/nft\/ivory-baron-088/)
    await page
      .getByRole('button', {
        name: isMobile ? 'Comprar NFT' : 'Comprar',
        exact: true,
      })
      .click()
    await expect(page).toHaveURL(/\/cart$/)
    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await expect(page).toHaveURL(/\/checkout$/)

    await app.connectWallet()
    await app.openReview()
    await app
      .reviewDialog()
      .getByRole('button', { name: /Confirmar e pagar 1.806 ETH/ })
      .click()
    await expect(page).toHaveURL(/\/orders\//)
    await expect(
      page.getByRole('heading', {
        name: 'Seus NFTs agora estão na sua carteira',
      }),
    ).toBeVisible()
    await expect(page.getByText('1.79 ETH').first()).toBeVisible()
    await expect(
      page.getByRole('link', { name: /Ver no Etherscan/ }),
    ).toHaveAttribute('href', /etherscan\.io\/tx\/0x/)
    // The receipt has no dedicated mobile frame: it must still fit (390px).
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBe(0)

    const cart = await app.api<{ lines: unknown[] }>('/cart')
    expect(cart.lines).toHaveLength(0)
  })

  test('recibo mantém o snapshot após mudanças no catálogo', async ({
    app,
    page,
  }) => {
    await app.startCheckout()
    await app.connectWallet()
    await app.openReview()
    await app
      .reviewDialog()
      .getByRole('button', { name: /Confirmar e pagar/ })
      .click()
    await expect(
      page.getByRole('heading', {
        name: 'Seus NFTs agora estão na sua carteira',
      }),
    ).toBeVisible()

    await app.mock('updateNft', 'ivory-baron-088', { price: '9.99' })
    await page.reload()
    await app.waitForMocks()
    await expect(page.getByText('3.58 ETH').first()).toBeVisible()
    await expect(page.getByText('9.99')).toHaveCount(0)
  })

  test('só os itens comprados saem do carrinho', async ({ app, page }) => {
    await app.startCheckout({ overrides: { paymentDelayMs: 1_500 } })
    await app.connectWallet()
    await app.openReview()
    await app
      .reviewDialog()
      .getByRole('button', { name: /Confirmar e pagar/ })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Aguardando confirmação da rede' }),
    ).toBeVisible()
    await app.addToCart([['golden-beat-207', '1-50', 1]]) // added while the order is pending
    await expect(
      page.getByRole('heading', {
        name: 'Seus NFTs agora estão na sua carteira',
      }),
    ).toBeVisible()
    const cart = await app.api<{ lines: Array<{ nftId: string }> }>('/cart')
    expect(cart.lines.map((l) => l.nftId)).toEqual(['golden-beat-207'])
  })
})

test.describe('Pagamento: validações e carteira', () => {
  test('campos obrigatórios, conexão exigida e recusa da carteira', async ({
    app,
    page,
  }) => {
    await app.startCheckout()
    const displayName = page.getByRole('textbox', { name: /^Nome de exibição/ })
    await displayName.fill('')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByText('Informe o nome de exibição')).toBeVisible()
    await expect(displayName).toBeFocused()
    await expect(displayName).toHaveAttribute('aria-invalid', 'true')

    await displayName.fill('Ana Lima')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(
      page.getByText('Conecte a carteira selecionada antes de confirmar.'),
    ).toBeVisible()

    await app.setScenario('wallet-rejected')
    await page.getByRole('button', { name: 'Conectar carteira' }).click()
    await expect(page.getByText(/A carteira recusou a conexão/)).toBeVisible()
    await app.setScenario('fast', { paymentDelayMs: 600 })
    await page.getByRole('button', { name: 'Tentar de novo' }).click()
    await expect(page.getByText(/Conectada:/)).toBeVisible()

    await page.getByRole('button', { name: 'Desconectar' }).click()
    await expect(
      page.getByRole('button', { name: 'Conectar carteira' }),
    ).toBeVisible()
  })

  test('trocar a rede refaz a cotação e exige nova conexão', async ({
    app,
    page,
  }) => {
    await app.startCheckout()
    await app.connectWallet()
    await page.getByLabel(/^Rede/).selectOption('polygon')
    await expect(
      page.getByRole('button', { name: 'Conectar carteira' }),
    ).toBeVisible()
    await expect(page.getByText('0.002 ETH')).toBeVisible()
  })
})

test.describe('Pagamento: falhas e recuperação', () => {
  test('pagamento recusado mantém o carrinho', async ({ app, page }) => {
    await app.startCheckout({ scenario: 'payment-declined' })
    await app.connectWallet()
    await app.openReview()
    await app
      .reviewDialog()
      .getByRole('button', { name: /Confirmar e pagar/ })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Pagamento recusado' }),
    ).toBeVisible()
    await expect(
      page.getByText('Seus NFTs agora estão na sua carteira'),
    ).toHaveCount(0)
    const cart = await app.api<{ lines: unknown[] }>('/cart')
    expect(cart.lines).toHaveLength(1)
  })

  test('clique repetido envia um único pedido', async ({ app, page }) => {
    await app.startCheckout()
    const keys: string[] = []
    page.on(
      'request',
      (r) =>
        r.method() === 'POST' &&
        r.url().endsWith('/api/orders') &&
        keys.push(r.headers()['idempotency-key']),
    )
    await app.connectWallet()
    await app.openReview()
    await app
      .reviewDialog()
      .getByRole('button', { name: /Confirmar e pagar/ })
      .dblclick()
    await expect(page).toHaveURL(/\/orders\//)
    expect(keys).toHaveLength(1)
  })

  test('preço alterado no envio exige nova confirmação', async ({ app }) => {
    await app.startCheckout({ scenario: 'price-change' })
    await app.connectWallet()
    await app.openReview()
    const dialog = app.reviewDialog()
    await dialog.getByRole('button', { name: /Confirmar e pagar/ }).click()
    await expect(dialog.getByText('Os valores do pedido mudaram')).toBeVisible()
    await expect(
      dialog.getByText(/O total passou de 3.596 ETH para/),
    ).toBeVisible()
    await dialog.getByRole('button', { name: 'Aceitar novos preços' }).click()
    await dialog
      .getByRole('button', { name: /Confirmar novo total \(3.696 ETH\)/ })
      .click()
    await expect(app.page).toHaveURL(/\/orders\//)
  })

  test('edição esgotada no envio orienta a ajustar o carrinho', async ({
    app,
  }) => {
    await app.startCheckout({ scenario: 'sold-out' })
    await app.connectWallet()
    await app.openReview()
    const dialog = app.reviewDialog()
    await dialog.getByRole('button', { name: /Confirmar e pagar/ }).click()
    await expect(
      dialog.getByText('Algum item ficou indisponível'),
    ).toBeVisible()
    await expect(
      dialog.getByRole('link', { name: 'Ajustar itens no carrinho' }),
    ).toBeVisible()
  })

  test('timeout após criar o pedido recupera o mesmo pedido automaticamente', async ({
    app,
    page,
  }) => {
    await app.startCheckout({
      scenario: 'order-timeout',
      overrides: { paymentDelayMs: 60_000 },
    })
    const keys: string[] = []
    page.on(
      'request',
      (r) =>
        r.method() === 'POST' &&
        r.url().endsWith('/api/orders') &&
        keys.push(r.headers()['idempotency-key']),
    )
    await app.connectWallet()
    await app.openReview()
    await app
      .reviewDialog()
      .getByRole('button', { name: /Confirmar e pagar/ })
      .click()
    // The response never arrives; the checkout finds the order by its key.
    await expect(page).toHaveURL(/\/orders\//, { timeout: 20_000 })
    await expect(
      page.getByRole('heading', { name: 'Aguardando confirmação da rede' }),
    ).toBeVisible()
    const pending = await app.api<{ items: Order[] }>('/orders?status=pending')
    expect(pending.items).toHaveLength(1)
    expect(keys).toHaveLength(1)
  })

  test('nova tentativa segura reenvia a mesma chave quando a recuperação falha', async ({
    app,
    page,
  }) => {
    await app.startCheckout({
      scenario: 'order-timeout',
      overrides: {
        paymentDelayMs: 60_000,
        failures: [
          {
            method: 'GET',
            path: '/orders',
            response: {
              type: 'status',
              status: 503,
              code: 'SERVICE_UNAVAILABLE',
            },
          },
        ],
      },
    })
    // Real time on purpose: axios relies on the native XHR timeout (15 s),
    // which Playwright's fake clock does not drive.
    test.slow()
    const keys: string[] = []
    page.on(
      'request',
      (r) =>
        r.method() === 'POST' &&
        r.url().endsWith('/api/orders') &&
        keys.push(r.headers()['idempotency-key']),
    )
    await app.connectWallet()
    await app.openReview()
    const dialog = app.reviewDialog()
    await dialog.getByRole('button', { name: /Confirmar e pagar/ }).click()
    await expect(
      dialog.getByText('Não conseguimos confirmar o envio'),
    ).toBeVisible({ timeout: 25_000 })
    await app.mock('liveMarketTick') // background noise must not change the retried payload
    await dialog
      .getByRole('button', { name: /Tentar novamente com segurança/ })
      .click()
    await expect(page).toHaveURL(/\/orders\//)
    await app.setScenario('fast', { paymentDelayMs: 60_000 })
    const pending = await app.api<{ items: Order[] }>('/orders?status=pending')
    expect(keys).toHaveLength(2)
    expect(keys[0]).toBe(keys[1])
    expect(pending.items).toHaveLength(1)
  })

  test('expiração durante o checkout preserva o formulário', async ({
    app,
    page,
    isMobile,
  }) => {
    await app.startCheckout()
    await page
      .getByLabel(/Observação do colecionador/)
      .fill('Presente para minha irmã')
    await app.mock('expireSessions')
    await page.getByRole('button', { name: 'Conectar carteira' }).click()
    await expect(page).toHaveURL(/motivo=expirada/)

    const scope = isMobile
      ? page.locator('main')
      : page.getByRole('dialog', { name: 'Entrar' })
    await scope.getByRole('textbox', { name: 'E-mail' }).fill('ana@kurio.test')
    await scope.getByLabel(/^Senha\*?$/).fill('Kurio2026')
    await scope.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL((url) => url.pathname === '/checkout')
    await expect(page.getByLabel(/Observação do colecionador/)).toHaveValue(
      'Presente para minha irmã',
    )
  })
})

test.describe('Pedidos: acesso e estados', () => {
  test('pedido de outra conta e pedido inexistente', async ({ app, page }) => {
    await app.startCheckout()
    await app.connectWallet()
    await app.openReview()
    await app
      .reviewDialog()
      .getByRole('button', { name: /Confirmar e pagar/ })
      .click()
    await expect(page).toHaveURL(/\/orders\//)
    const orderUrl = page.url()

    await app.loginViaApi('bruno')
    await app.goto(orderUrl)
    await expect(
      page.getByRole('heading', { name: 'Este pedido pertence a outra conta' }),
    ).toBeVisible()
    await expect(page.getByText('Ivory Baron')).toHaveCount(0)

    await app.goto('/orders/ord_inexistente')
    await expect(
      page.getByRole('heading', { name: 'Pedido não encontrado' }),
    ).toBeVisible()
  })
})
