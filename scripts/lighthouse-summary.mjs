// Collects the Lighthouse runs left by `lhci collect` in .lighthouseci/,
// copies every HTML/JSON report to lighthouse/reports/<profile>/ and computes
// the median of each category and of LCP, CLS and TBT per page.
//
//   node scripts/lighthouse-summary.mjs <mobile|desktop>   → collect one profile
//   node scripts/lighthouse-summary.mjs --render            → write lighthouse/summary.md
import { execSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const RUNS_DIR = path.join(ROOT, '.lighthouseci')
const OUT_DIR = path.join(ROOT, 'lighthouse')
const RESULTS = path.join(OUT_DIR, 'results.json')

const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']
const TARGETS = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 }
const METRICS = {
  lcp: 'largest-contentful-paint',
  cls: 'cumulative-layout-shift',
  tbt: 'total-blocking-time',
  fcp: 'first-contentful-paint',
  si: 'speed-index',
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

const pageName = (url) => (new URL(url).pathname === '/' ? 'Início' : 'Detalhe do NFT')

function collect(profile) {
  const reportsDir = path.join(OUT_DIR, 'reports', profile)
  rmSync(reportsDir, { recursive: true, force: true })
  mkdirSync(reportsDir, { recursive: true })

  const runs = readdirSync(RUNS_DIR)
    .filter((f) => f.startsWith('lhr-') && f.endsWith('.json'))
    .map((file) => ({ file, lhr: JSON.parse(readFileSync(path.join(RUNS_DIR, file), 'utf8')) }))

  const byPage = new Map()
  for (const { file, lhr } of runs) {
    const page = pageName(lhr.finalDisplayedUrl ?? lhr.requestedUrl)
    const slug = page === 'Início' ? 'inicio' : 'detalhe'
    const index = (byPage.get(page)?.length ?? 0) + 1
    copyFileSync(path.join(RUNS_DIR, file), path.join(reportsDir, `${slug}-run${index}.json`))
    const html = file.replace(/\.json$/, '.html')
    if (existsSync(path.join(RUNS_DIR, html))) {
      copyFileSync(path.join(RUNS_DIR, html), path.join(reportsDir, `${slug}-run${index}.html`))
    }
    byPage.set(page, [...(byPage.get(page) ?? []), lhr])
  }

  const results = existsSync(RESULTS) ? JSON.parse(readFileSync(RESULTS, 'utf8')) : {}
  results[profile] = {}
  for (const [page, lhrs] of byPage) {
    results[profile][page] = {
      runs: lhrs.length,
      categories: Object.fromEntries(
        CATEGORIES.map((c) => [c, median(lhrs.map((l) => Math.round((l.categories[c]?.score ?? 0) * 100)))]),
      ),
      perRun: lhrs.map((l) => Object.fromEntries(CATEGORIES.map((c) => [c, Math.round((l.categories[c]?.score ?? 0) * 100)]))),
      metrics: Object.fromEntries(
        Object.entries(METRICS).map(([key, audit]) => [key, median(lhrs.map((l) => l.audits[audit]?.numericValue ?? 0))]),
      ),
      lighthouseVersion: lhrs[0].lighthouseVersion,
      userAgent: lhrs[0].environment?.hostUserAgent,
      benchmarkIndex: median(lhrs.map((l) => l.environment?.benchmarkIndex ?? 0)),
      throttling: lhrs[0].configSettings.throttling,
      formFactor: lhrs[0].configSettings.formFactor,
    }
  }
  results.environment = {
    date: new Date().toISOString(),
    node: process.version,
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    cpu: os.cpus()[0]?.model,
    lhci: execSync('npx lhci --version', { cwd: ROOT }).toString().trim(),
  }
  writeFileSync(RESULTS, JSON.stringify(results, null, 2) + '\n')
  console.log(`[lighthouse] ${profile}: ${runs.length} runs collected`)
}

function render() {
  const results = JSON.parse(readFileSync(RESULTS, 'utf8'))
  const fmtMs = (v) => `${Math.round(v)} ms`
  const rows = []
  for (const profile of ['mobile', 'desktop']) {
    for (const [page, r] of Object.entries(results[profile] ?? {})) {
      const cell = (c) => `${r.categories[c]}${r.categories[c] >= TARGETS[c] ? '' : ' ⚠️'}`
      rows.push(
        `| ${page} | ${profile} | ${CATEGORIES.map(cell).join(' | ')} | ${fmtMs(r.metrics.lcp)} | ${r.metrics.cls.toFixed(3)} | ${fmtMs(r.metrics.tbt)} |`,
      )
    }
  }
  const any = Object.values(results.mobile ?? {})[0] ?? Object.values(results.desktop ?? {})[0]
  const md = `# Lighthouse: resultados

Mediana de 3 execuções por página e perfil, no build otimizado (\`vite build\` + \`vite preview\`)
com o cenário padrão dos mocks. Metas: Performance ≥ 90, Accessibility ≥ 95,
Best Practices ≥ 95, SEO ≥ 90 (⚠️ = abaixo da meta).

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${rows.join('\n')}

## Execução

- Data: ${results.environment.date}
- Lighthouse ${any?.lighthouseVersion} via @lhci/cli ${results.environment.lhci}, Node ${results.environment.node}
- Navegador: ${any?.userAgent}
- Máquina: ${results.environment.cpu}, ${results.environment.os}; benchmarkIndex mediano ${Math.round(any?.benchmarkIndex ?? 0)}
- Mobile: emulação de celular intermediário, throttling simulado (RTT ${results.mobile ? Object.values(results.mobile)[0].throttling.rttMs : '-'} ms, ${results.mobile ? Object.values(results.mobile)[0].throttling.throughputKbps : '-'} Kbps, CPU ${results.mobile ? Object.values(results.mobile)[0].throttling.cpuSlowdownMultiplier : '-'}×)
- Desktop: preset \`desktop\` do Lighthouse (RTT ${results.desktop ? Object.values(results.desktop)[0].throttling.rttMs : '-'} ms, CPU ${results.desktop ? Object.values(results.desktop)[0].throttling.cpuSlowdownMultiplier : '-'}×)
- Configuração: \`lighthouse/lighthouserc.mobile.json\` e \`lighthouse/lighthouserc.desktop.json\`
- Relatórios completos (HTML e JSON de cada execução): \`lighthouse/reports/<perfil>/\`

## Notas por execução

${['mobile', 'desktop']
  .flatMap((profile) =>
    Object.entries(results[profile] ?? {}).map(
      ([page, r]) =>
        `- ${page} / ${profile}: ${r.perRun.map((run) => CATEGORIES.map((c) => run[c]).join('/')).join(' · ')}`,
    ),
  )
  .join('\n')}
`
  writeFileSync(path.join(OUT_DIR, 'summary.md'), md)
  console.log(md)
}

const arg = process.argv[2]
if (arg === '--render') render()
else if (arg === 'mobile' || arg === 'desktop') collect(arg)
else {
  console.error('usage: lighthouse-summary.mjs <mobile|desktop|--render>')
  process.exit(1)
}
