import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { NftDetail } from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { notices } from '@/lib/notices'
import { useAddToCart, useCart } from '@/queries/cart'
import { queryKeys } from '@/queries/keys'

/**
 * Purchase state for one NFT edition. The limit is the smaller of the
 * edition stock and the per-order cap, minus what is already in the cart
 * (the server enforces the same rule and has the final word).
 */
export function usePurchase(nft: NftDetail, editionId: string) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const cart = useCart()
  const add = useAddToCart()

  const edition = nft.editions.find((e) => e.id === editionId)
  const inCart =
    cart.data?.lines.find(
      (l) => l.nftId === nft.id && l.editionId === editionId,
    )?.quantity ?? 0
  const limit = edition ? Math.min(edition.available, nft.maxPerOrder) : 0
  const remaining = Math.max(0, limit - inCart)

  const [quantity, setQuantity] = useState(1)
  // Stock can shrink in real time or the edition can change: keep it valid.
  useEffect(() => {
    setQuantity((q) => Math.min(Math.max(q, 1), Math.max(remaining, 1)))
  }, [remaining, editionId])

  const blockedReason = !edition
    ? 'Selecione uma edição.'
    : edition.available === 0
      ? 'Edição indisponível: esta edição está esgotada.'
      : remaining === 0
        ? `Você já tem o máximo desta edição no carrinho (${inCart}).`
        : null

  const buy = (options: { goToCart: boolean }) => {
    if (blockedReason || !edition) return
    add.mutate(
      { nftId: nft.id, editionId, quantity },
      {
        onSuccess: () => {
          notices.push({
            tone: 'success',
            title: `${quantity}× ${nft.name} no carrinho`,
            description: `Edição ${edition.kind === 'open' ? 'aberta' : edition.kind}.`,
          })
          if (options.goToCart) void navigate({ to: '/cart' })
        },
        onError: (error) => {
          const apiError = toApiError(error)
          notices.push({
            tone: 'error',
            title: 'Não foi possível adicionar ao carrinho',
            description: apiError.message,
          })
          // Stock probably changed: refresh what the page shows.
          if (apiError.code === 'AVAILABILITY_CONFLICT') {
            void queryClient.invalidateQueries({
              queryKey: queryKeys.nfts.detail(nft.id),
            })
          }
        },
      },
    )
  }

  return {
    edition,
    inCart,
    limit,
    remaining,
    quantity,
    setQuantity,
    blockedReason,
    buy,
    pending: add.isPending,
    error: add.error ? toApiError(add.error) : null,
  }
}
