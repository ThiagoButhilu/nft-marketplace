# Lighthouse

Auditoria de **Início** (`/`) e **Detalhe do NFT** (`/nft/emerald-ape-042`) nos perfis
mobile e desktop, com mediana de 3 execuções por página e perfil.

| Arquivo | Conteúdo |
| --- | --- |
| [`summary.md`](summary.md) | Tabela de medianas (notas, LCP, CLS, TBT), ambiente e notas de cada execução |
| [`results.json`](results.json) | Os mesmos dados em JSON (medianas, notas por execução, throttling, versões) |
| `reports/<perfil>/<pagina>-runN.{html,json}` | Relatório completo de cada execução |
| `lighthouserc.mobile.json` / `lighthouserc.desktop.json` | Configuração versionada (Lighthouse CI) |
| [`../scripts/lighthouse-summary.mjs`](../scripts/lighthouse-summary.mjs) | Copia os relatórios, calcula medianas e gera o `summary.md` |

## Como executar

```bash
npm run lighthouse
```

O comando faz o `vite build`, sobe o `vite preview` na porta 4180, roda 3 execuções por
página em cada perfil e regenera `summary.md`, `results.json` e `reports/`. Também é possível
rodar um perfil só: `npm run lighthouse:mobile` ou `npm run lighthouse:desktop` (os dois
precisam de um build já feito).

- **Mobile**: emulação padrão do Lighthouse (Moto G Power), throttling simulado (lantern):
  RTT 150 ms, 1,6 Mbps, CPU 4×.
- **Desktop**: preset `desktop` (RTT 40 ms, 10 Mbps, CPU 1×).
- Build de produção com o **cenário padrão dos mocks** (latência de 120–450 ms por requisição,
  igual à que um usuário vê no deploy). Não existe um cenário "rápido" para o Lighthouse.
- `lhci assert` avisa (sem falhar) quando uma categoria fica abaixo da meta.

## Resultado

Medianas da última execução completa. O detalhe está em [`summary.md`](summary.md).

| Página | Perfil | Perf. | A11y | BP | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Início | mobile | **88** ⚠️ | 100 | 100 | 100 | 3,5 s | 0 | 10 ms |
| Detalhe do NFT | mobile | 90 | 100 | 100 | 100 | 3,5 s | 0 | 52 ms |
| Início | desktop | 100 | 100 | 100 | 100 | 0,7 s | 0 | 0 ms |
| Detalhe do NFT | desktop | 100 | 100 | 100 | 100 | 0,7 s | 0,004 | 0 ms |

Accessibility, Best Practices e SEO ficam em 100 nas 12 execuções. A única métrica abaixo
da meta é **Performance mobile da Início (88)**. A justificativa está mais abaixo.

## Otimizações aplicadas

Problemas encontrados na primeira auditoria: CLS de 0,222 no detalhe (desktop), SEO 92,
Best Practices 96 e Performance mobile abaixo de 90 nas duas páginas.

| Problema | Mudança | Efeito |
| --- | --- | --- |
| Footer empurrado quando o conteúdo chega (CLS 0,222 no detalhe) | `main` com `min-h-dvh` | CLS 0 |
| Pontos do carrossel aparecendo depois dos dados (CLS no mobile) | Placeholder de mesma altura enquanto carrega | CLS 0 |
| `robots.txt` inexistente (SEO 92) | `public/robots.txt` | SEO 100 |
| `favicon.ico` 404 no console (BP 96) | `public/favicon.svg` + `<link rel="icon">` | BP 100 |
| Mock backend só iniciava depois do bundle principal executar | Entrada própria `mock-boot` injetada no `<head>`: o service worker registra em paralelo ao download do app | O mock fica pronto antes de o app precisar dele |
| CSS bloqueando a primeira pintura | App shell com estilo inline no `index.html` + CSS carregado sem bloquear (`preload` + `media` swap, com `<noscript>`) | A primeira pintura não depende de CSS nem de JS |
| `tough-cookie` + `tldts` (lista de sufixos públicos) dentro do MSW, sem uso: a API autentica por header | Alias para um stub mínimo ([`src/mocks/tough-cookie-stub.ts`](../src/mocks/tough-cookie-stub.ts)) | Chunk do mock de 114 → 58 KB gzip |
| Radix Select + Floating UI no bundle principal só para o "Ordenar por" | `<select>` nativo estilizado | Bundle principal de 202 → 174 KB gzip |
| Diálogo de busca, drawer de filtros e central de avisos carregados no início | `React.lazy`, carregados na primeira intenção (hover, foco ou clique), com retorno de foco ao gatilho | Saem do caminho crítico |
| Rotas | Code splitting automático do TanStack Router. A rota `/` fica no bundle principal para evitar uma ida e volta a mais antes do conteúdo | — |
| Imagens de 400 px servidas para cards de 170 px | `srcset` 200w/400w + `sizes` em todos os pontos de uso; `fetchpriority="high"` nas 2 primeiras imagens e `low` + `loading="lazy"` no resto | Menos bytes competindo com a imagem do LCP |
| Carrosséis horizontais aumentando a largura da página | `contain: paint` nos scrollers | Sem overflow horizontal |

### Testado e descartado

- **Preload do chunk do mock** (`<link rel="modulepreload">`): sem ganho mensurável,
  porque a entrada `mock-boot` já o pede no início do carregamento.
- **CSS inline completo no HTML**: não estabilizou o FCP (ver "Variação entre execuções")
  e aumentava o HTML em 15 KB em toda navegação.
- **`content-visibility: auto` nas seções abaixo da dobra** (editorial, footer): em 3
  execuções com e sem ele, as notas e o LCP ficaram iguais (88/88/91 contra 91/89/88).
  Ele ainda exigia um tamanho estimado (`contain-intrinsic-size`) para cada seção, e as
  capturas de página inteira mostravam as seções vazias. Foi removido.
- **Throttling `devtools`** em vez do simulado: notas mais baixas (~84–86 no mobile) e mais
  ruído, por depender do tempo real da máquina. O simulado é o padrão do Lighthouse e do
  PageSpeed Insights.

## Por que a Início mobile fica em 88

O limite é o **LCP (~3,5 s)**. O peso de LCP na nota de Performance é 25%. FCP, TBT, CLS e
Speed Index já estão na faixa verde ou perto dela.

O elemento de LCP é a imagem do primeiro card do catálogo. A imagem em si leva ~30 ms para
baixar. O tempo está no que precede a renderização dela (fases do LCP medidas pelo Lighthouse
nas 3 execuções):

| Fase | Início (mobile) | Detalhe (mobile) |
| --- | --- | --- |
| TTFB | ~455 ms | ~455 ms |
| Load delay (até a imagem ser pedida) | ~460–670 ms | ~2,6 s |
| Load time | ~30 ms | ~115 ms |
| Render delay (até a imagem ser pintada) | **~2,5 s** | ~250 ms |

Esse tempo é estrutural numa SPA renderizada no cliente: a imagem só existe depois de três
passos.

1. O bundle principal (174 KB gzip; react-dom sozinho tem ~200 KB minificado) baixa e
   executa, com a CPU 4× mais lenta.
2. O mock backend inicia no service worker.
3. A API responde `GET /api/nfts`, com latência simulada de 120–450 ms.

No detalhe, o mesmo custo aparece como *load delay*, porque a imagem só é pedida depois da
resposta. Na Início, o arquivo já foi baixado antes por um bloco estático (o editorial usa a
mesma arte), então o custo aparece como *render delay*.

O que daria os ~0,5 s restantes, e por que não foi feito aqui:

- **SSR ou pré-renderização da primeira página do catálogo**: o HTML já viria com a `<img>`, e
  o LCP deixaria de depender do JS e da API. Exige um servidor ou um passo de build com dados
  reais. Fica fora do escopo de uma SPA com mock no navegador.
- **API real no lugar do mock**: o build de produção carrega o MSW (58 KB gzip mais o registro
  do service worker) porque não existe backend. Um deploy real não teria esse custo, e um
  `GET` de catálogo com cache na borda responde bem abaixo da latência simulada.
- **Reduzir a latência simulada só para o Lighthouse** melhoraria a nota sem melhorar a
  experiência. Foi descartado de propósito.

### Variação entre execuções

A nota mobile oscila entre **86 e 92** entre execuções, e a causa é o FCP: ele vai de ~1,3–1,6 s
a ~2,3–2,4 s com o mesmo build (veja os relatórios em `reports/mobile/`). O lantern simula o
FCP a partir de um grafo de dependências. Localmente, o bundle principal às vezes termina de
executar antes do app shell ser pintado. Nesses casos ele entra como dependência do FCP, e a
simulação de rede lenta atrasa o FCP em ~1 s. É uma corrida da coleta local, não do
carregamento real: o app shell é HTML com estilo inline, pintado antes de qualquer JS. Por
isso as metas usam a **mediana de 3 execuções**, como recomenda o Lighthouse.
