import { env } from 'node:process'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createServer } from 'node:http'

import walkRoutes, { RouteVerb } from './walkRoutes'
import type { RouteDefinition, RouteVerbKey } from './walkRoutes'
import type { SodaRequest } from '.'

const port = env.SODA_PORT || 4000

export default async function(dirpath?: string) {
  const routes = await walkRoutes(dirpath)
  console.log(dirpath, routes)

  const initialPlainRoutes = Object.keys(RouteVerb).reduce((mapping: Record<string, Record<string, RouteDefinition>>, verb) => {
    mapping[verb] = {}
    return mapping
  }, {})

  const initialParamRoutes: RouteDefinition[] = []
  
  const [plainRoutes, paramRoutes] = routes.reduce((
    [plainRoutes, paramRoutes],
    routeDef: RouteDefinition
  ) => {
    if (routeDef.type === 'plain') {
      plainRoutes[routeDef.verb][routeDef.path] = routeDef
      return [plainRoutes, paramRoutes]
    }

    paramRoutes.push(routeDef)
    return [plainRoutes, paramRoutes]
  }, [initialPlainRoutes, initialParamRoutes])

  const server = createServer()
  
  server.on('request', (req: IncomingMessage, res: ServerResponse) => {
    const sodaReq: SodaRequest = Object.assign({ params: {} }, req)

    const verbMethod = req.method?.toLowerCase() as RouteVerbKey

    if (req.url && plainRoutes[verbMethod]?.[req.url]) {
      return plainRoutes[verbMethod][req.url].func(req, res)
    }

    for (let routeDef of paramRoutes) {
      console.log(routeDef.path)
    }

    res.writeHead(404)
    res.end()
  })

  server.listen(port)
  console.log(`soda listening on :${port}`)
}
