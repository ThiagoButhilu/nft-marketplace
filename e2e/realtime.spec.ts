import { expect, test } from './fixtures'

/**
 * Real-time behaviour. Events are published by the mock server and reach the
 * app through socket.io-client (MSW WebSocket interception); nothing here
 * touches the app's state directly.
 */
test.describe('Tempo real (Socket.IO)', () => {
  test('nft.updated atualiza o catálogo sem recarregar', async ({
    app,
    page,
  }) => {
    await app.open('/')
    const card = page
      .locator('#catalogo li')
      .filter({ hasText: 'Sage Nomad #009' })
    await expect(card).toContainText('1.69 ETH')
    await app.mock('updateNft', 'sage-nomad-009', { price: '2.10' })
    await expect(card).toContainText('2.10 ETH')
  })

  test('eventos duplicados ou antigos não regridem o estado', async ({
    app,
    page,
  }) => {
    await app.open('/nft/emerald-ape-042')
    const article = page
      .getByRole('article')
      .filter({ has: page.locator('#nft-title') })
    await app.mock('updateNft', 'emerald-ape-042', { price: '1.49' })
    await expect(article.getByText('1.49 ETH').first()).toBeVisible()

    // Duplicate delivery of the same event id.
    await app.mock('replayEvent')
    // A stale event (older version, new id) with a different price.
    const [latest] = await app
      .mock<Array<Record<string, unknown>>>('recentEvents')
      .then((events) => events.slice(-1))
    await app.mock('deliverRawEvent', {
      ...latest,
      id: 'evt_stale_e2e',
      version: 1,
      data: { ...(latest.data as object), price: '0.01' },
    })
    await page.waitForTimeout(500)
    await expect(article.getByText('1.49 ETH').first()).toBeVisible()
    await expect(article.getByText('0.01 ETH')).toHaveCount(0)
  })

  test('preço alterado durante o checkout bloqueia a confirmação @main', async ({
    app,
    page,
  }) => {
    await app.startCheckout()
    await app.connectWallet()
    await app.mock('updateNft', 'ivory-baron-088', { price: '1.89' })

    await expect(
      page.getByText('O preço de Ivory Baron #088 mudou').first(),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Aceitar novos preços' }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(
      page.getByText('Aceite os novos preços antes de confirmar.'),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Aceitar novos preços' }).click()
    await expect(page.getByText('3.796 ETH').first()).toBeVisible()
    await app.openReview()
    await app
      .reviewDialog()
      .getByRole('button', { name: /Confirmar e pagar 3.796 ETH/ })
      .click()
    await expect(page).toHaveURL(/\/orders\//)
  })

  test('evento de pedido de outro usuário é ignorado', async ({
    app,
    page,
  }) => {
    await app.startCheckout({ overrides: { paymentDelayMs: 60_000 } })
    await app.connectWallet()
    await app.openReview()
    await app
      .reviewDialog()
      .getByRole('button', { name: /Confirmar e pagar/ })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Aguardando confirmação da rede' }),
    ).toBeVisible()
    const orderId = page.url().split('/').pop()

    await app.mock('deliverRawEvent', {
      id: 'evt_foreign_e2e',
      type: 'order.updated',
      resource: { type: 'order', id: orderId },
      userId: 'usr_bruno',
      version: 99,
      occurredAt: new Date().toISOString(),
      data: {
        status: 'confirmed',
        transactionHash: '0xdead',
        failureReason: null,
      },
    })
    await page.waitForTimeout(500)
    await expect(
      page.getByRole('heading', { name: 'Aguardando confirmação da rede' }),
    ).toBeVisible()
  })

  test('desconexão com pedido pendente: refresh e reconexão retomam o pedido', async ({
    app,
    page,
  }) => {
    await app.startCheckout({ overrides: { paymentDelayMs: 60_000 } })
    await app.connectWallet()
    await app.openReview()
    await app
      .reviewDialog()
      .getByRole('button', { name: /Confirmar e pagar/ })
      .click()
    const pendingHeading = page.getByRole('heading', {
      name: 'Aguardando confirmação da rede',
    })
    await expect(pendingHeading).toBeVisible()

    await page.reload()
    await app.waitForMocks()
    await expect(pendingHeading).toBeVisible()

    await app.setScenario('offline')
    await app.mock('dropConnections')
    await expect(page.getByText(/Sem conexão em tempo real/)).toBeVisible()
    await expect(
      page.getByRole('banner').getByText(/Reconectando|Sem atualizações/),
    ).toBeVisible()

    // The order settles while the client is disconnected.
    await app.mock('settlePendingOrders')
    await app.setScenario('fast')
    await expect(
      page.getByRole('heading', {
        name: 'Seus NFTs agora estão na sua carteira',
      }),
    ).toBeVisible({
      timeout: 15_000,
    })
    const orders = await app.api<{ items: unknown[] }>('/orders')
    expect(orders.items).toHaveLength(1)
  })

  test('reconexão reconcilia mudanças perdidas via REST', async ({
    app,
    page,
  }) => {
    await app.open('/')
    const card = page
      .locator('#catalogo li')
      .filter({ hasText: 'Golden Beat #207' })
    await expect(card).toContainText('0.99 ETH')

    await app.setScenario('offline')
    await app.mock('dropConnections')
    await app.mock('updateNft', 'golden-beat-207', { price: '1.11' }) // published while disconnected
    await page.waitForTimeout(300)
    await expect(card).toContainText('0.99 ETH')

    await app.setScenario('fast')
    await expect(card).toContainText('1.11 ETH', { timeout: 15_000 })
  })
})
