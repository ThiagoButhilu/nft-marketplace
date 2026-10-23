import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  ChangePasswordRequest,
  Network,
  UpdateProfileRequest,
  WalletInput,
} from '@/api/contracts'
import { profileApi, walletsApi } from '@/api/endpoints'
import { useSession } from './session'
import { queryKeys } from './keys'

function useUserId() {
  return useSession()?.user.id ?? null
}

export function useProfile() {
  const userId = useUserId()
  return useQuery({
    queryKey: queryKeys.user.profile(userId ?? 'anonymous'),
    queryFn: ({ signal }) => profileApi.get({ signal }),
    enabled: !!userId,
  })
}

/** Profile changes also refresh the session (header name and avatar). */
function useProfileMutation<TVariables>(
  mutationFn: (variables: TVariables) => ReturnType<typeof profileApi.get>,
) {
  const queryClient = useQueryClient()
  const session = useSession()
  return useMutation({
    mutationFn,
    onSuccess: (profile) => {
      if (!session) return
      queryClient.setQueryData(queryKeys.user.profile(session.user.id), profile)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.session(session.token),
      })
    },
  })
}

export const useUpdateProfile = () =>
  useProfileMutation((input: UpdateProfileRequest) => profileApi.update(input))
export const useUpdateAvatar = () =>
  useProfileMutation((dataUrl: string) => profileApi.setAvatar(dataUrl))
export const useRemoveAvatar = () =>
  useProfileMutation(() => profileApi.removeAvatar())

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordRequest) =>
      profileApi.changePassword(input),
  })
}

export function useWallets() {
  const userId = useUserId()
  return useQuery({
    queryKey: queryKeys.user.wallets(userId ?? 'anonymous'),
    queryFn: ({ signal }) => walletsApi.list({ signal }),
    enabled: !!userId,
  })
}

export function useSaveWallet() {
  const queryClient = useQueryClient()
  const userId = useUserId()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: WalletInput }) =>
      id ? walletsApi.update(id, input) : walletsApi.create(input),
    onSettled: () => {
      if (userId)
        void queryClient.invalidateQueries({
          queryKey: queryKeys.user.wallets(userId),
        })
    },
  })
}

/** Simulated wallet connection (approve / reject handled by the mock). */
export function useConnectWallet() {
  return useMutation({
    mutationFn: ({
      walletId,
      network,
    }: {
      walletId: string
      network: Network
    }) => walletsApi.connect(walletId, network),
  })
}
