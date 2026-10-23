import { createFileRoute } from '@tanstack/react-router'
import { RoutePlaceholder } from '@/components/common/route-placeholder'
import { Button } from '@/components/ui/button'
import { useLogout } from '@/queries/session'

export const Route = createFileRoute('/_auth/account/profile')({
  component: ProfilePlaceholder,
})

function ProfilePlaceholder() {
  const logout = useLogout()
  return (
    <>
      <RoutePlaceholder title="Perfil do colecionador" />
      <div className="page-container">
        <Button variant="outline" onClick={() => logout.mutate()}>
          Sair
        </Button>
      </div>
    </>
  )
}
