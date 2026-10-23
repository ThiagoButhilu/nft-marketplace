const MONTHS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]
/** Figma format: "29 Jul, 2026". */
export const formatOrderDate = (iso: string) => {
  const date = new Date(iso)
  return `${date.getDate()} ${MONTHS[date.getMonth()]}, ${date.getFullYear()}`
}
