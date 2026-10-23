import { createFileRoute } from '@tanstack/react-router'
import { RoutePlaceholder } from '@/components/common/route-placeholder'

export const Route = createFileRoute('/_auth/account/wallets')({
  component: () => <RoutePlaceholder title="Carteiras" />,
})
