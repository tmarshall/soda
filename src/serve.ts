import type { IncomingMessage, ServerResponse } from 'node:http'

import type { DefineRoute, MutatorCollection, RouteVerbKey } from './walkRoutes'
import type { SodaRequest } from '.'

import { env } from 'node:process'
import { createServer } from 'node:http'

import walkRoutes, { ParamTypes, RouteVerb } from './walkRoutes'
import walkMiddleware from './walkMiddleware'

const port = env.SODA_PORT || 4000

interface RouteDefinitionBase {
  verb: RouteVerbKey,
  func: Function
}
interface RouteDefinitionPlain {
  type: 'plain',
  path: string,
  paramMutators: {},
}
interface RouteDefinitionParams {
  type: 'withParams',
  path: RegExp,
  paramMutators: MutatorCollection,
}

type RouteDefinition = RouteDefinitionBase & (
  RouteDefinitionPlain | RouteDefinitionParams
)

const typedParamChoices = Object.keys(ParamTypes).join('|')

const typedParamAttributes = {
  [ParamTypes.string]: {
    regExpStr: (paramName: string) => `/(?<${paramName}>[^/]+)`,
    mutator: (paramString: string) => paramString,
  },
  [ParamTypes.number]: {
    regExpStr: (paramName: string) => `/(?<${paramName}>\\d+(?:\\.\\d+)?)`,
    mutator: (paramString: string) => Number(paramString)
  },
}

function escapeRegex(input: string): string {
  return input.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

const defineRoute: DefineRoute<RouteDefinition> = ({ verb, routePath, func }) => {
  const pathParamCheck = new RegExp(`/\\[(?:(?<paramType>${typedParamChoices})\\:)?(?<paramName>[a-zA-Z_$][a-zA-Z0-9_$]*)\\](?=/|$)`, 'g')

  if (!pathParamCheck.test(routePath)) {
    return {
      type: 'plain',
      verb,
      path: routePath,
      rawPath: routePath,
      paramMutators: {},
      func,
    }
  }

  const mutators: MutatorCollection = {}
  const parts = routePath.split(pathParamCheck)
  let resultRegExpString = '^'

  for (let i = 0; i < parts.length; i++) {
    if (i % 3 === 0) {
      resultRegExpString += escapeRegex(parts[i])
      continue
    }

    const paramType = (parts[i] || 'string') as keyof typeof ParamTypes
    const paramName = parts[i + 1]
    i = i + 1

    const paramAttributes = typedParamAttributes[ParamTypes[paramType]]
    resultRegExpString += paramAttributes.regExpStr(paramName)
    mutators[paramName] = paramAttributes.mutator
  }
  resultRegExpString = resultRegExpString + '$'
  
  return {
    type: 'withParams',
    verb,
    path: new RegExp(resultRegExpString),
    rawPath: routePath,
    paramMutators: mutators,
    func,
  }
}

export default async function(routesDirpath?: string, middlewareDirpath?: string) {
  const middleware = await walkMiddleware(middlewareDirpath)
  const routes = await walkRoutes<RouteDefinition>(routesDirpath, middleware, defineRoute)

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
      if (routeDef.type !== 'withParams') {
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
