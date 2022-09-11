import type { DefineRoute, RouteVerbKey } from './walkRoutes'

import walkRoutes, { ParamTypes } from './walkRoutes'
import walkMiddleware from './walkMiddleware'

interface RouteDefinition {
  verb: RouteVerbKey
  path: string
  func: Function
}

const typedParamAttributes = {
  [ParamTypes.string]: {
    mutator: (paramString: string) => paramString,
  },
  [ParamTypes.number]: {
    mutator: (paramString: string) => Number(paramString)
  },
}

const defineRoute: DefineRoute<RouteDefinition> = ({ verb, routePath, func }) => {
  const pathParamCheck = new RegExp(`/\\[(?<paramName>[a-zA-Z_$][a-zA-Z0-9_$]*)\\](?=/|$)`, 'g')

  if (!pathParamCheck.test(routePath)) {
    return {
      verb,
      path: routePath,
      func,
    }
  }

  const parts = routePath.split(pathParamCheck)
  let resultExpressPath = ''

  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      resultExpressPath += parts[i]
      continue
    }

    const paramName = parts[i]
    resultExpressPath += `/:${paramName}`
  }

  return {
    verb,
    path: resultExpressPath,
    func,
  }
}

export default async function withExpress(routesDirpath?: string, middlewareDirpath?: string) {
  const Router = require('express').Router

  const middleware = await walkMiddleware(middlewareDirpath)
  const routes = await walkRoutes<RouteDefinition>(routesDirpath, middleware, defineRoute)

  const expressRouter = Router()

  for (let routeDef of routes) {
    expressRouter[routeDef.verb](routeDef.path, routeDef.func)
  }

  return expressRouter
}
