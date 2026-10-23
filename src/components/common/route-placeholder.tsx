/** Temporary body for routes whose screens land in the next steps. */
export function RoutePlaceholder({ title }: { title: string }) {
  return (
    <section className="page-container py-16">
      <h1 className="text-heading font-bold">{title}</h1>
      <p className="mt-2 text-sm text-text-secondary">Tela em construção.</p>
    </section>
  )
}
