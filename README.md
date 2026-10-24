# Kurio · Marketplace de NFTs

Implementação do desafio de front-end "NFT Marketplace" a partir do Figma. Cobre catálogo,
detalhe, carrinho, checkout com pagamento simulado, confirmação, login/cadastro, perfil e
carteiras. Também cobre atualização em tempo real, cenários de falha, acessibilidade e layout
responsivo em 390, 768 e 1440 px.

Não existe backend real: a API REST e o servidor Socket.IO são simulados no navegador com
[MSW](https://mswjs.io), e os dados ficam no `localStorage`. O app não tem dados falsos nos
componentes. Ele fala com a "API" por HTTP e WebSocket como falaria com um servidor real.

| Documento | Conteúdo |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Camadas, cache, sessão, carrinho, idempotência do checkout, tempo real, decisões de UI, testes e performance |
| [docs/api.md](docs/api.md) | Contratos REST, eventos Socket.IO, envelope de erro, fixtures e cenários do mock |
| [docs/design-map.md](docs/design-map.md) | Tokens e telas do Figma mapeados para o código |
| [docs/manual-test-plan.md](docs/manual-test-plan.md) | Roteiro de teste manual E2E |
| [lighthouse/README.md](lighthouse/README.md) | Resultados do Lighthouse, condições e justificativas |

## Stack

React 19 · TypeScript 5.9 (strict) · Vite 6 · TanStack Router (rotas por arquivo, code
splitting) · TanStack Query 5 · Axios + Zod (validação das respostas) · Socket.IO client 4 ·
Tailwind CSS 4 + shadcn/ui (Radix) · React Hook Form · big.js (valores em ETH) · MSW 2 ·
Playwright + axe-core · Lighthouse CI.

## Setup

Requisitos: Node.js 20 ou superior (desenvolvido com Node 24) e npm.

```bash
npm install
```

```bash
npm run dev
```

O app abre em http://localhost:5173 com o mock backend ativo. O service worker do MSW
(`public/mockServiceWorker.js`) já está versionado, então não há passo extra.

Para os testes E2E, instale uma vez o navegador do Playwright:

```bash
npx playwright install chromium
```

## Variáveis de ambiente

Os valores padrão estão versionados em `.env.development` e `.env.production`, e nenhum deles
é segredo. Para sobrescrever localmente, crie um `.env.local` a partir do
[`.env.example`](.env.example).

| Variável | Padrão | Uso |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` | Liga o mock backend (REST + Socket.IO). Fica ligado também no build de produção, porque o deploy de demonstração não tem servidor |
| `VITE_API_URL` | `/api` | URL base da API REST |
| `VITE_SOCKET_URL` | vazio | Origem do servidor Socket.IO. Vazio usa a mesma origem, o que é obrigatório com os mocks ligados |

Para apontar para uma API real, use `VITE_ENABLE_MOCKS=false` e preencha `VITE_API_URL` e
`VITE_SOCKET_URL`. Os contratos esperados estão em [docs/api.md](docs/api.md).

## Credenciais de teste

Contas fictícias, criadas no primeiro carregamento. As senhas são guardadas como hash SHA-256
com salt, nunca em texto puro.

| Usuário | E-mail | Senha | Observações |
| --- | --- | --- | --- |
| Ana Lima | `ana@kurio.test` | `Kurio2026` | 2 carteiras (MetaMask/Ethereum e Coinbase/Polygon) e 2 favoritos |
| Bruno Costa | `bruno@kurio.test` | `Colecao2026` | 1 carteira (WalletConnect/Ethereum), sem favoritos |

O cadastro também funciona: a conta nova fica salva no `localStorage` deste navegador.

| Para testar | Use |
| --- | --- |
| Cupons | `KURIO10` (10%), `GENESIS` (0,05 ETH de desconto), `VERAO2025` (expirado). Qualquer outro código é inválido |
| Edição única indisponível | `/nft/emerald-ape-042` |
| Esgotado | `/nft/golden-signal-160` |
| Item raro com preço riscado | `/nft/neon-vessel-552` |

O pagamento é simulado: conectar a carteira e confirmar a compra não envolve dinheiro nem
chave real. O pedido fica pendente e é liquidado alguns segundos depois. A mudança de status
chega pelo evento `order.updated` do Socket.IO.

## Cenários do mock

Escolha um cenário pela URL com `?scenario=<nome>`, por exemplo
http://localhost:5173/?scenario=slow. O cenário fica salvo no `localStorage` e sobrevive a
recarregamentos. Para voltar ao normal, use `?scenario=default`.

`?mock-reset` faz o reset completo: apaga os dados criados (contas, carrinhos, pedidos,
favoritos), restaura as fixtures e volta ao cenário `default`. Para resetar já num cenário,
combine os dois: `/?mock-reset&scenario=slow`.

| Cenário | Comportamento |
| --- | --- |
| `default` | Caminho feliz, latência de 120–450 ms |
| `fast` | Sem latência |
| `slow` / `variable-latency` | 1,5–3 s / 50 ms–2,5 s |
| `out-of-order` | Buscas mais curtas respondem depois (respostas fora de ordem) |
| `empty` | Catálogo vazio |
| `offline` | Toda requisição falha na rede e o socket é recusado |
| `catalog-error` | `GET /nfts` retorna 500 duas vezes e depois se recupera |
| `catalog-unavailable` | Catálogo e detalhe retornam 503 |
| `network-failure` | A primeira requisição do catálogo falha na rede |
| `favorite-error` | Favoritar retorna 500 (com rollback da atualização otimista) |
| `session-expired` | A sessão expira 20 s depois do login |
| `forbidden` | Perfil e carteiras retornam 403 |
| `price-change` / `sold-out` | Na primeira tentativa de pedido, o preço muda / o primeiro item esgota |
| `order-timeout` | O pedido é criado, mas a primeira resposta nunca chega (recuperado pela chave de idempotência) |
| `payment-declined` | O pagamento é recusado |
| `wallet-rejected` | A conexão da carteira é recusada |
| `live-market` | Os preços dos itens no carrinho mudam a cada 20 s via `nft.updated` |

O console do navegador também controla o lado "servidor" pelo `window.__kurioMock`. Por
exemplo, `__kurioMock.updateNft('sage-nomad-009', { price: '2.5' })` publica um `nft.updated`,
e `__kurioMock.expireSessions()` invalida as sessões. A lista completa está em
[docs/api.md](docs/api.md#control-api-window__kuriomock).

## Reproduzindo os fluxos de falha

Comece cada fluxo com `/?mock-reset` para voltar às fixtures. Quando o fluxo pede login, use
a conta da Ana. O roteiro completo, com cada caso e o resultado esperado, está em
[docs/manual-test-plan.md](docs/manual-test-plan.md).

| Fluxo | Como reproduzir | Esperado |
| --- | --- | --- |
| Carregamento lento | `/?scenario=slow` | Skeletons com shimmer no catálogo, no detalhe e no resumo do carrinho |
| Respostas fora de ordem | `/?scenario=out-of-order` e digite uma busca rápido | A lista mostra o resultado do último termo, nunca o de uma resposta atrasada |
| Catálogo vazio | `/?scenario=empty` | "Nenhum NFT encontrado" (com "Limpar filtros" quando há filtros ativos) |
| Falha transitória (500) | `/?scenario=catalog-error` | Nenhum erro na tela: as duas falhas são repetidas automaticamente e o catálogo carrega |
| Serviço indisponível (503) | `/?scenario=catalog-unavailable` | "Não foi possível carregar o catálogo" com "Tentar novamente". Rode `__kurioMock.setScenario('default')` e clique para recuperar |
| Sem conexão | `/?scenario=offline` | Erro de rede nas telas e indicador "Reconectando…" / "Sem atualizações ao vivo" no header. Volte com `?scenario=default` para ver a reconexão |
| NFT inexistente | `/nft/nao-existe` | Página "NFT não encontrado" |
| Edição indisponível / esgotado | `/nft/emerald-ape-042` / `/nft/golden-signal-160` | "Edição indisponível" e compra bloqueada |
| Favorito com falha | Login, `?scenario=favorite-error` e favorite um NFT | O coração volta ao estado anterior e aparece um aviso de erro |
| Cupom inválido ou expirado | Carrinho com um item, cupom `ERRADO` ou `VERAO2025` | "Código promocional inválido." / "Este código promocional expirou." no campo, sem desconto no resumo |
| Conflito de cadastro | Cadastro com `ana@kurio.test` | Erro no campo de e-mail retornado pela API |
| Sessão expirada | Login, `?scenario=session-expired` e espere 20 s (ou `__kurioMock.expireSessions()`) | Aviso de sessão expirada e login com retorno à tela anterior. No checkout, o formulário é preservado |
| Acesso negado | Login, `?scenario=forbidden` e abra `/account/profile` | Erro 403 sem mostrar dados |
| Preço alterado durante a compra | `?scenario=price-change` e confirme a compra; ou, com o checkout aberto, rode `__kurioMock.updateNft('<id do item>', { price: '9.99' })` | "Os valores do pedido mudaram" com o total antigo e o novo; só segue depois de "Aceitar novos preços" e de confirmar de novo |
| Edição esgotada no envio | `?scenario=sold-out` e confirme a compra | "Algum item ficou indisponível", com orientação para ajustar o carrinho |
| Carteira recusada ou desconectada | `?scenario=wallet-rejected` e conecte a carteira; ou conecte e clique em "Desconectar" | "A carteira recusou a conexão" com "Tentar de novo"; ao desconectar, a compra volta a exigir conexão |
| Pagamento recusado | `?scenario=payment-declined` e confirme a compra | "Pagamento recusado", sem recibo, e os itens continuam no carrinho |
| Timeout após criar o pedido | `?scenario=order-timeout` e confirme a compra | Recupera o mesmo pedido pela chave de idempotência, sem criar outro |
| Queda de conexão com pedido pendente | Confirme a compra, rode `__kurioMock.dropConnections()` ou recarregue a página | O pedido pendente é retomado e chega à confirmação sem duplicar |
| Evento duplicado | Depois de um `updateNft`, rode `__kurioMock.replayEvent()` | Nada muda: o evento repetido é ignorado |

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento (http://localhost:5173) |
| `npm run build` | Gera as rotas, faz o typecheck e o build de produção em `dist/` |
| `npm run preview` | Serve o build de `dist/` (http://localhost:4173) |
| `npm run typecheck` | Só o typecheck |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run test:e2e` | Build + suíte Playwright (desktop 1440 e mobile 390), incluindo axe e regressão visual |
| `npm run test:e2e:ui` | Playwright em modo interativo |
| `npm run test:e2e:update` | Regenera as baselines visuais |
| `npm run lighthouse` | Build + Lighthouse mobile e desktop (3 execuções por página) e atualiza `lighthouse/` |

O relatório HTML do Playwright fica em `playwright-report/`. Testes que falham guardam um
trace, que pode ser aberto com `npx playwright show-trace <arquivo>`.

> As baselines visuais (`e2e/visual.spec.ts-snapshots/*-darwin.png`) foram geradas no macOS.
> Em outro sistema, rode `npm run test:e2e:update` uma vez antes de comparar.

## Deploy

URL pública: _(adicionar após o deploy)_

O deploy foi feito na Vercel de maneira publica, sem enfatizar logs e protocolos de CI. 

## Estrutura

```
src/
  api/          cliente Axios, contratos Zod (src/api/contracts) e uma função por endpoint
  queries/      hooks do TanStack Query (chaves, cache, mutações, invalidação)
  realtime/     cliente Socket.IO e reconciliação com o cache
  routes/       rotas por arquivo do TanStack Router (_auth = rotas privadas)
  components/   UI por domínio (catalog, nft, cart, checkout, order, auth, account, layout) e ui/ (shadcn)
  lib/          sessão, ETH (big.js), redirecionamento seguro, avisos, imagens
  mocks/        MSW: fixtures, servidor de domínio, handlers REST/Socket.IO, cenários
e2e/            testes Playwright e fixtures
lighthouse/     configuração, relatórios e análise do Lighthouse
docs/           API, mapa do design e plano de teste manual
```

## Resultados

- **E2E:** 107 testes nos projetos desktop e mobile, cobrindo os fluxos principais, os
  cenários de falha, o tempo real, a acessibilidade (axe, WCAG 2.1 AA), o layout responsivo e
  a regressão visual.
  A cobertura por arquivo está no [ARCHITECTURE.md](ARCHITECTURE.md#e2e-tests-playwright).
- **Lighthouse** (mediana de 3 execuções): Accessibility, Best Practices e SEO em 100 nas
  duas páginas e nos dois perfis. Performance fica em 100 no desktop, 90 no detalhe mobile e
  88 na Início mobile. A justificativa da Início está em
  [lighthouse/README.md](lighthouse/README.md).
