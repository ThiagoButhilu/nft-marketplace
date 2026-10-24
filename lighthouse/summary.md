# Lighthouse: resultados

Mediana de 3 execuções por página e perfil, no build otimizado (`vite build` + `vite preview`)
com o cenário padrão dos mocks. Metas: Performance ≥ 90, Accessibility ≥ 95,
Best Practices ≥ 95, SEO ≥ 90 (⚠️ = abaixo da meta).

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Início | mobile | 88 ⚠️ | 100 | 100 | 100 | 3528 ms | 0.000 | 10 ms |
| Detalhe do NFT | mobile | 90 | 100 | 100 | 100 | 3507 ms | 0.000 | 52 ms |
| Início | desktop | 100 | 100 | 100 | 100 | 717 ms | 0.000 | 0 ms |
| Detalhe do NFT | desktop | 100 | 100 | 100 | 100 | 719 ms | 0.004 | 0 ms |

## Execução

- Data: 2026-10-23T23:56:29.581Z
- Lighthouse 12.6.1 via @lhci/cli 0.15.1, Node v24.2.0
- Navegador: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/155.0.0.0 Safari/537.36
- Máquina: Apple M1, Darwin 27.0.0 (arm64); benchmarkIndex mediano 2979
- Mobile: emulação de celular intermediário, throttling simulado (RTT 150 ms, 1638.4 Kbps, CPU 4×)
- Desktop: preset `desktop` do Lighthouse (RTT 40 ms, CPU 1×)
- Configuração: `lighthouse/lighthouserc.mobile.json` e `lighthouse/lighthouserc.desktop.json`
- Relatórios completos (HTML e JSON de cada execução): `lighthouse/reports/<perfil>/`

## Notas por execução

- Início / mobile: 86/100/100/100 · 88/100/100/100 · 91/100/100/100
- Detalhe do NFT / mobile: 88/100/100/100 · 90/100/100/100 · 92/100/100/100
- Início / desktop: 100/100/100/100 · 100/100/100/100 · 100/100/100/100
- Detalhe do NFT / desktop: 100/100/100/100 · 100/100/100/100 · 100/100/100/100
