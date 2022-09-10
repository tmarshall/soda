import type { IncomingMessage, ServerResponse } from 'node:http'
import type { RouteDefinition, RouteVerbKey } from './walkRoutes'
import type { SodaRequest } from '.'

import { env } from 'node:process'
import { createServer } from 'node:http'

import walkRoutes, { RouteVerb } from './walkRoutes'
import walkMiddleware from './walkMiddleware'

const port = env.SODA_PORT || 4000

export default async function(routesDirpath?: string, middlewareDirpath?: string) {
  const middleware = await walkMiddleware(middlewareDirpath)
  const routes = await walkRoutes(routesDirpath, middleware)

  const [initialPlainRoutes, initialParamRoutes] = Object.keys(RouteVerb).reduce((
    [plainRoutes, paramRoutes]: [
      Record<string, Record<string, RouteDefinition>>,
      Record<string, RouteDefinition[]>
    ],
    verb
  ) => {
    plainRoutes[verb] = {}
    paramRoutes[verb] = []
    return [plainRoutes, paramRoutes]
  }, [{}, {}])
  
  const [plainRoutes, paramRoutes] = routes.reduce((
    [plainRoutes, paramRoutes],
    routeDef: RouteDefinition
  ) => {
    if (routeDef.type === 'plain') {
      plainRoutes[routeDef.verb][routeDef.path] = routeDef
      return [plainRoutes, paramRoutes]
    }

    paramRoutes[routeDef.verb].push(routeDef)
    return [plainRoutes, paramRoutes]
  }, [initialPlainRoutes, initialParamRoutes])

  const server = createServer()
  
  server.on('request', (req: IncomingMessage, res: ServerResponse) => {
    const sodaReq: SodaRequest = Object.assign({ params: {} }, req)

    const verbMethod = req.method?.toLowerCase() as RouteVerbKey

    if (req.url && plainRoutes[verbMethod]?.[req.url]) {
      return plainRoutes[verbMethod][req.url].func(sodaReq, res)
    }

    for (let routeDef of (paramRoutes[verbMethod] ?? [])) {
      if (routeDef.type !== 'params') {
        continue
      }
        
      const match = req.url?.match(routeDef.path)
      if (!match) {
        continue
      }

      const params: Record<string, string | number> = { ...match.groups }
      for (let key in params) {
        if (routeDef.paramMutators[key as string]) {
          params[key] = routeDef.paramMutators[key](match.groups![key])
        }
      }
      sodaReq.params = params
      return routeDef.func(sodaReq, res)
    }

    res.writeHead(404)
    res.end()
  })

  server.listen(port)
  console.log(`soda listening on :${port}`)
}
