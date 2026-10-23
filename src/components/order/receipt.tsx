import { Link } from '@tanstack/react-router'
import { ExternalLink, X } from 'lucide-react'
import type { Network, Order } from '@/api/contracts'
import { NETWORK_LABELS } from '@/components/catalog/search'
import { PROVIDER_LABELS, shortAddress } from '@/components/checkout/labels'
import { editionLabel } from '@/components/nft/editions'
import { Button } from '@/components/ui/button'
import { formatEth } from '@/lib/eth'
import { formatOrderDate } from './format'

const EXPLORER_NAMES: Record<Network, string> = {
  ethereum: 'Etherscan',
  polygon: 'Polygonscan',
  solana: 'Solscan',
}

function ThankYouIcon() {
  return (
    <svg
      viewBox="0 0 72 86"
      width="66"
      height="80"
      aria-hidden
      className="text-brand-accent"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      >
        <path d="M14 36V8a3 3 0 0 1 3-3h38a3 3 0 0 1 3 3v28" />
        <path d="M30 5c2-4 10-4 12 0" />
        <path d="M4 34l32 24 32-24v46a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V34z" />
        <path d="M4 82l26-24M68 82L42 58" />
      </g>
      <text
        x="36"
        y="21"
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="currentColor"
        fontFamily="inherit"
      >
        THANK
      </text>
      <text
        x="36"
        y="33"
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="currentColor"
        fontFamily="inherit"
      >
        YOU
      </text>
    </svg>
  )
}

/**
 * Receipt of a confirmed order (Figma "Order Confirmation Modal"). Renders
 * the order snapshot only: later catalog changes never alter these values.
 */
export function Receipt({ order }: { order: Order }) {
  return (
    <article
      aria-labelledby="receipt-title"
      className="relative mx-auto w-full max-w-[578px] border-b-[10px] border-brand bg-card pb-12"
    >
      <Link
        to="/"
        aria-label="Fechar recibo e voltar ao início"
        className="absolute top-4 right-4 grid size-8 place-items-center text-brand-accent hover:text-text-primary"
      >
        <X className="size-5" aria-hidden />
      </Link>
      <header className="flex flex-col items-center gap-4 px-6 pt-6 pb-5 text-center">
        <ThankYouIcon />
        <h1
          id="receipt-title"
          tabIndex={-1}
          className="text-[15px] font-bold text-text-secondary outline-none"
        >
          Seus NFTs agora estão na sua carteira
        </h1>
      </header>

      <dl className="grid grid-cols-2 gap-y-3 border-y border-brand px-6 py-3 text-[13px] sm:grid-cols-[auto_auto_auto_auto] sm:justify-between sm:divide-x sm:divide-brand sm:px-9">
        <div className="sm:pr-3">
          <dt className="font-bold text-text-secondary">ID da transação</dt>
          <dd
            className="text-text-secondary"
            title={order.transactionHash ?? undefined}
          >
            {order.transactionHash ? shortAddress(order.transactionHash) : '—'}
          </dd>
        </div>
        <div className="sm:px-3">
          <dt className="text-text-secondary">Data</dt>
          <dd className="text-text-secondary">
            <time dateTime={order.updatedAt}>
              {formatOrderDate(order.updatedAt)}
            </time>
          </dd>
        </div>
        <div className="sm:px-3">
          <dt className="text-text-secondary">Total</dt>
          <dd className="text-text-secondary">{formatEth(order.total)}</dd>
        </div>
        <div className="sm:pl-3">
          <dt className="font-bold text-text-secondary">Carteira</dt>
          <dd className="text-text-secondary">
            {PROVIDER_LABELS[order.wallet.provider]}
          </dd>
        </div>
      </dl>

      <section aria-labelledby="receipt-details" className="px-6 pt-6 sm:px-11">
        <h2 id="receipt-details" className="font-bold">
          Detalhes da transação
        </h2>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="pb-2 font-bold">
                NFTs
              </th>
              <th scope="col" className="pb-2 text-center font-bold">
                Edições
              </th>
              <th scope="col" className="pb-2 text-right font-bold">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line) => (
              <tr key={`${line.nftId}:${line.editionId}`}>
                <td className="py-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={line.imageUrl}
                      alt=""
                      width={64}
                      height={64}
                      className="size-16 shrink-0 rounded-sm object-cover"
                    />
                    <div>
                      <p className="font-bold">{line.name}</p>
                      <p className="text-sm text-text-secondary">
                        ID do token: {line.tokenId} ·{' '}
                        {editionLabel({ kind: line.editionKind })}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-2 text-center text-sm">
                  (x {line.quantity})
                </td>
                <td className="py-2 text-right text-lg font-bold text-brand-accent tabular-nums">
                  {formatEth(line.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-3 ml-auto max-w-[320px] space-y-2 border-b border-line pb-2">
          {order.discount !== '0' && (
            <div className="flex justify-between">
              <dt>
                Desconto{order.couponCode ? ` (${order.couponCode})` : ''}
              </dt>
              <dd className="text-success tabular-nums">
                (-) {formatEth(order.discount)}
              </dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Taxa de rede</dt>
            <dd className="text-lg tabular-nums">
              {formatEth(order.networkFee)}
            </dd>
          </div>
          <div className="flex justify-between font-bold">
            <dt>Total</dt>
            <dd className="text-lg text-brand-accent tabular-nums">
              {formatEth(order.total)}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-center text-sm leading-[22px] text-brand-accent/90">
          Transação confirmada na {NETWORK_LABELS[order.network]}. A propriedade
          foi transferida para sua carteira conectada (
          {shortAddress(order.wallet.address)}) e registrada na rede.
        </p>
        {order.explorerUrl && (
          <div className="mt-6 text-center">
            <Button asChild className="h-12 px-4 text-base">
              <a
                href={order.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver no {EXPLORER_NAMES[order.network]}
                <ExternalLink aria-hidden />
                <span className="sr-only">
                  (link simulado, abre em nova aba)
                </span>
              </a>
            </Button>
          </div>
        )}
      </section>
    </article>
  )
}
