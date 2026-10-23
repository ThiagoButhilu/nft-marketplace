/**
 * NFT artwork is published at 400px and 200px (`-200` suffix), see
 * scripts/crop-figma-assets.mjs. Builds `srcset`/`sizes` so small slots
 * (cards, thumbnails, lists) download the small file.
 */
const VARIANT = /^(\/nfts\/[a-z0-9-]+)\.webp$/

export function responsiveImage(url: string, sizes: string) {
  const match = VARIANT.exec(url)
  if (!match) return { src: url }
  return { src: url, srcSet: `${match[1]}-200.webp 200w, ${url} 400w`, sizes }
}

/** Common `sizes` values for the layouts in the app. */
export const IMAGE_SIZES = {
  card: '(min-width: 1024px) 260px, (min-width: 640px) 33vw, 46vw',
  thumb: '90px',
  list: '70px',
  mobileHero: '138px',
} as const
