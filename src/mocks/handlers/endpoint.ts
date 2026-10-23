import {
  HttpResponse,
  delay,
  type DefaultBodyType,
  type HttpResponseResolver,
  type PathParams,
} from 'msw'
import { ZodError, type z } from 'zod'
import { CART_ID_HEADER, type ApiErrorBody } from '@/api/contracts'
import { scenario } from '../scenarios'
import { resolveSession } from '../server/accounts'
import { guestCartKey, userCartKey } from '../server/cart'
import { MockApiError } from '../server/errors'
import { store } from '../server/store'

export const API_PREFIX = '/api'

export interface EndpointContext<Params extends PathParams> {
  request: Request
  params: Params
  url: URL
  userId: string | null
  token: string | null
  /** Cart owner key: the user when authenticated, otherwise the visitor's cart id. */
  cartKey: string | null
}

interface EndpointOptions {
  /** `required`: 401 without a valid session. `optional`: anonymous allowed. */
  auth?: 'required' | 'optional' | 'none'
}

type Result = { status?: number; body?: unknown } | Response

export function errorResponse(error: MockApiError) {
  const body: ApiErrorBody = {
    error: {
      code: error.code,
      message: error.message,
      ...(error.fieldErrors && { fieldErrors: error.fieldErrors }),
      ...(error.details !== undefined && { details: error.details }),
    },
  }
  return HttpResponse.json(body, { status: error.status })
}

function zodToApiError(error: ZodError) {
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_'
    ;(fieldErrors[key] ??= []).push(issue.message)
  }
  return new MockApiError(
    422,
    'VALIDATION_ERROR',
    'Verifique os campos destacados.',
    fieldErrors,
  )
}

export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  let json: unknown
  try {
    json = await request.json()
  } catch {
    throw new MockApiError(
      400,
      'VALIDATION_ERROR',
      'Corpo da requisição inválido.',
    )
  }
  return schema.parse(json)
}

/**
 * Applies the active scenario's network conditions. Returns a response when
 * the request must fail before reaching the handler.
 */
async function simulateNetwork(
  request: Request,
  apiPath: string,
): Promise<Response | null> {
  const { config } = scenario
  if (config.offline) {
    await delay(scenario.nextLatency())
    return HttpResponse.error()
  }

  let latency = scenario.nextLatency()
  if (
    config.outOfOrderCatalog &&
    request.method === 'GET' &&
    apiPath === '/nfts'
  ) {
    // Deterministic inversion: the shorter the search, the later it answers.
    const q = new URL(request.url).searchParams.get('q') ?? ''
    latency = Math.max(150, 1800 - q.length * 350)
  }
  await delay(latency)

  const failure = scenario.matchFailure(request.method, apiPath)
  if (!failure) return null
  switch (failure.type) {
    case 'network':
      return HttpResponse.error()
    case 'timeout':
      await delay('infinite')
      return HttpResponse.error()
    case 'status':
      return errorResponse(
        new MockApiError(
          failure.status,
          failure.code,
          failure.message ?? 'Falha simulada pelo cenário de mocks.',
        ),
      )
  }
}

export function endpoint<Params extends PathParams = PathParams>(
  options: EndpointOptions,
  handler: (ctx: EndpointContext<Params>) => Result | Promise<Result>,
): HttpResponseResolver<Params, DefaultBodyType> {
  return async ({ request, params }) => {
    await store.ready
    const url = new URL(request.url)
    const apiPath = url.pathname.slice(API_PREFIX.length)

    const simulated = await simulateNetwork(request, apiPath)
    if (simulated) return simulated

    try {
      const header = request.headers.get('Authorization')
      const token = header?.startsWith('Bearer ') ? header.slice(7) : null
      let userId: string | null = null
      if (token && options.auth !== 'none') {
        // A stale token is an error even on optional routes, so the client
        // can tell "visitor" from "session expired".
        userId = resolveSession(token).userId
      } else if (options.auth === 'required') {
        throw new MockApiError(401, 'UNAUTHENTICATED', 'Entre para continuar.')
      }

      const cartId = request.headers.get(CART_ID_HEADER)
      const cartKey = userId
        ? userCartKey(userId)
        : cartId
          ? guestCartKey(cartId)
          : null

      const result = await handler({
        request,
        params,
        url,
        userId,
        token,
        cartKey,
      })
      if (result instanceof Response) return result
      if (result.status === 204) return new HttpResponse(null, { status: 204 })
      return HttpResponse.json(result.body as DefaultBodyType, {
        status: result.status ?? 200,
      })
    } catch (error) {
      if (error instanceof MockApiError) return errorResponse(error)
      if (error instanceof ZodError) return errorResponse(zodToApiError(error))
      console.error('[mocks] unhandled error', error)
      return errorResponse(
        new MockApiError(
          500,
          'INTERNAL_ERROR',
          'Erro inesperado no servidor simulado.',
        ),
      )
    }
  }
}

export const ok = (body: unknown, status = 200) => ({ status, body })
