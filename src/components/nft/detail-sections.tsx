import { useQueries } from '@tanstack/react-query'
import { Tabs as TabsPrimitive } from 'radix-ui'
import type { NftDetail } from '@/api/contracts'
import { NftCard, NftCardSkeleton } from '@/components/catalog/nft-card'
import { NETWORK_LABELS } from '@/components/catalog/search'
import { nftDetailQuery } from '@/queries/catalog'

const shortAddress = (address: string) =>
  `${address.slice(0, 6)}...${address.slice(-4)}`

const triggerClass =
  'relative pb-2 text-[15px] text-text-primary transition-colors hover:text-brand-accent data-[state=active]:font-bold data-[state=active]:text-brand-accent data-[state=active]:after:absolute data-[state=active]:after:inset-x-0 data-[state=active]:after:-bottom-px data-[state=active]:after:h-0.5 data-[state=active]:after:bg-brand-accent'

/** "Detalhes do NFT" / "Avaliações" tabs (Radix: arrow-key navigation). */
export function DetailTabs({ nft }: { nft: NftDetail }) {
  const network = NETWORK_LABELS[nft.network]
  return (
    <TabsPrimitive.Root
      defaultValue="details"
      className="page-container mt-16 md:mt-24"
    >
      <TabsPrimitive.List
        aria-label="Informações do NFT"
        className="flex gap-8 border-b border-line"
      >
        <TabsPrimitive.Trigger value="details" className={triggerClass}>
          Detalhes do NFT
        </TabsPrimitive.Trigger>
        <TabsPrimitive.Trigger value="reviews" className={triggerClass}>
          Avaliações de colecionadores ({nft.rating.count})
        </TabsPrimitive.Trigger>
      </TabsPrimitive.List>
      <TabsPrimitive.Content
        value="details"
        className="mt-5 space-y-5 text-sm leading-6 text-brand-accent/90"
      >
        {nft.longDescription.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <dl className="space-y-3">
          <div>
            <dt className="font-bold text-text-primary">Rede:</dt>
            <dd>
              Cunhado na {network} com procedência imutável e metadados
              armazenados no IPFS.
            </dd>
          </div>
          <div>
            <dt className="font-bold text-text-primary">Contrato:</dt>
            <dd>
              Direitos autorais do criador: {nft.royaltyPercent}% nas vendas
              secundárias, pagos automaticamente pelos mercados compatíveis.
            </dd>
          </div>
          <div>
            <dt className="font-bold text-text-primary">Direitos autorais:</dt>
            <dd>
              <span title={nft.contractAddress}>
                {shortAddress(nft.contractAddress)}
              </span>{' '}
              · Contrato inteligente ERC-721 verificado.
            </dd>
          </div>
        </dl>
      </TabsPrimitive.Content>
      <TabsPrimitive.Content
        value="reviews"
        className="mt-5 text-sm leading-6 text-text-secondary"
      >
        Nota média {nft.rating.average.toLocaleString('pt-BR')} de 5, com{' '}
        {nft.rating.count} avaliações. A leitura das avaliações completas não
        faz parte desta demonstração.
      </TabsPrimitive.Content>
    </TabsPrimitive.Root>
  )
}

/** "Mais desta coleção": related NFTs, also warming the detail cache. */
export function RelatedNfts({ nft }: { nft: NftDetail }) {
  const results = useQueries({
    queries: nft.relatedIds.map((id) => nftDetailQuery(id)),
  })
  return (
    <section
      aria-labelledby="related-title"
      className="page-container mt-16 md:mt-24"
    >
      <h2
        id="related-title"
        className="border-b border-line pb-2 text-lg font-bold text-brand-accent"
      >
        Mais desta coleção
      </h2>
      <ul className="-mx-4 mt-8 flex snap-x snap-mandatory [contain:paint] gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-5 lg:gap-6 lg:overflow-visible">
        {results.map((result, index) => (
          <li
            key={nft.relatedIds[index]}
            className="w-[46%] shrink-0 snap-start sm:w-[30%] lg:w-auto"
          >
            {result.data ? (
              <NftCard nft={result.data} />
            ) : result.isError ? null : (
              <NftCardSkeleton />
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
