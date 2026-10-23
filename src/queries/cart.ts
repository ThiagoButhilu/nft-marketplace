import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AddCartItemRequest, Cart, Network } from '@/api/contracts'
import { cartApi } from '@/api/endpoints'
import { useCartOwner } from './session'
import { queryKeys } from './keys'

export function useCart() {
  const owner = useCartOwner()
  return useQuery({
    queryKey: queryKeys.cart.owner(owner),
    queryFn: ({ signal }) => cartApi.get({ signal }),
    staleTime: 10_000,
  })
}

/**
 * Server-calculated summary (subtotal, discount, fee, total, issues). It is
 * the reference for checkout; invalidated by every cart change and by
 * `nft.updated` events touching items in the cart.
 */
export function useQuote(
  network: Network,
  options: { enabled?: boolean } = {},
) {
  const owner = useCartOwner()
  return useQuery({
    queryKey: queryKeys.cart.quote(owner, network),
    queryFn: ({ signal }) => cartApi.quote(network, { signal }),
    staleTime: 0,
    enabled: options.enabled ?? true,
  })
}

/**
 * Every cart mutation answers with the full cart: write it to the cache and
 * invalidate the quote. Mutations share a scope, so responses never apply
 * out of order.
 */
function useCartMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<Cart>,
) {
  const queryClient = useQueryClient()
  const owner = useCartOwner()
  return useMutation({
    scope: { id: 'cart' },
    mutationFn,
    onSuccess: (cart) => {
      queryClient.setQueryData(queryKeys.cart.owner(owner), cart)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.cart.quotes(owner),
      })
    },
    onError: () => {
      // The cart may have changed server-side (e.g. stock): resync it.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.cart.owner(owner),
      })
    },
  })
}

export const useAddToCart = () =>
  useCartMutation((input: AddCartItemRequest) => cartApi.add(input))

export const useUpdateCartItem = () =>
  useCartMutation(
    (input: { nftId: string; editionId: string; quantity: number }) =>
      cartApi.update(input.nftId, input.editionId, input.quantity),
  )

export const useRemoveCartItem = () =>
  useCartMutation((input: { nftId: string; editionId: string }) =>
    cartApi.remove(input.nftId, input.editionId),
  )

export const useApplyCoupon = () =>
  useCartMutation((code: string) => cartApi.applyCoupon(code))

export const useRemoveCoupon = () =>
  useCartMutation(() => cartApi.removeCoupon())

/** Accepts the new prices after a change (required before checkout). */
export const useAcknowledgePrices = () =>
  useCartMutation(() => cartApi.acknowledgePrices())
