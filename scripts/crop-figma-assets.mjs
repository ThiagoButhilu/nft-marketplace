// Interim NFT artwork cropped from Figma frame screenshots (docs/figma).
// Replace with the original exports from Figma `download_assets` when available.
import sharp from 'sharp'

const catalog = 'docs/figma/desktop-06-login.png'
const detail = 'docs/figma/desktop-02-detalhe.png'

const crops = {
  'emerald-ape': { source: detail, left: 282, top: 166, width: 374, height: 374 },
  'ivory-baron': { source: catalog, left: 1081, top: 1084, width: 230, height: 230 },
  'golden-beat': { source: catalog, left: 790, top: 1084, width: 230, height: 230 },
  'sage-nomad': { source: catalog, left: 790, top: 1509, width: 230, height: 230 },
}

for (const [name, { source, ...box }] of Object.entries(crops)) {
  await sharp(source)
    .extract(box)
    .resize(400, 400, { fit: 'cover', kernel: 'lanczos3' })
    .webp({ quality: 82 })
    .toFile(`public/nfts/${name}.webp`)
  console.log(`public/nfts/${name}.webp`)
}
