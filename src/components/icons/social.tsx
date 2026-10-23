import type { SVGProps } from 'react'

/**
 * Simplified social glyphs (lucide-react 1.x no longer ships brand icons).
 * Decorative: the surrounding link carries the accessible name.
 */
type IconProps = SVGProps<SVGSVGElement>

const base = {
  viewBox: '0 0 24 24',
  width: 16,
  height: 16,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export const FacebookIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z" />
  </svg>
)

export const InstagramIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
  </svg>
)

export const TwitterIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M22 5.5c-.7.3-1.5.5-2.3.6.8-.5 1.4-1.2 1.7-2.1-.8.5-1.6.8-2.5 1A3.9 3.9 0 0 0 12.2 8.6 11 11 0 0 1 4 4.5s-4 9 5 13c-2 1.3-4.2 2-6.5 1.9 9 5 20 0 20-11.5V7.4c.6-.5 1.1-1.1 1.5-1.9z" />
  </svg>
)

export const LinkedinIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
)

export const YoutubeIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="2" y="5" width="20" height="14" rx="4" />
    <path d="m10 9 5 3-5 3V9z" fill="currentColor" />
  </svg>
)
