# Soda :cup_with_straw:

Routes as a directory.

## What is it?

The idea behind Soda is that the API path should mirror the file path.

An exported `get` method in `/routes/users.js` would become `GET /users/`

## Structuring routes

Let's say you have the following routes directory, and for the same of example, let's say every file exports a `get` handler.

```
routes
└── index.js
    ├── accounts
    │   ├── index.js
    │   └── [accountId].js
    └── summary.js
```

Soda will translate these routes into endpoint paths:

```
GET /
GET /accounts/
GET /accounts/[accountId]/
GET /summary/
```

URL paramaters are defined by `[ ]` square brackets.

`index.js` files are applied to the current path. For example, `/accounts/index.js` will add routes for the endpoint path `/accounts/`.

Named files will add to the endpoint path. For example, `/summary.js` will add routes for the endpoint `/summary/`.

<aside>If you have both `/accounts.js` and `/accounts/index.js`, the `index.js` method will supersede those in `accounts.js`.</aside>

## Route files

Route files are pretty simple. Here's an example of a route that only supports GET requests:

```js
module.exports.get = (req, res) => {
  // handle request
}
```

All HTTP verbs are supported. A single file can export muliple.

<aside>`DELETE` requests are exported as `del` since `delete` is a reserved word.</aside>

```js
module.exports.get = (req, res) => {}
module.exports.post = (req, res) => {}
module.exports.put = (req, res) => {}
module.exports.patch = (req, res) => {}
module.exports.del = (req, res) => {}
module.exports.options = (req, res) => {}
module.exports.trace = (req, res) => {}
module.exports.connect = (req, res) => {}
```

## Middleware

It's common to have middleware, like methods to check that the user is logged in. With Soda all middleware handlers are defined in a dedicated middleare directory. Every middleware handler is required to be in its own file, and no sub-directories are supported.

```
middleware
├── index.js
├── userAuthed.js
└── userIsAdmin.js
```

In this example we now have two middleware handlers; `'userAuthed'` and `'userIsAdmin'`.

The contents of each are similar to route files.

```js
// middleware/userAuthed.js
module.exports = (req, res) => {
  // valide user is authed
}
```

The `index.js` file is optional. It is used to define what middleware is enabled by default, for all routes. It exports an array of middleware names, which will be applied, in the order provided. If this file is not provided, then all middleware is assumed to be disabled.

```js
// middleware/index.js
module.exports = ['userAuthed']
```

This tells us that the `'userAuthed'` is enabled by default, while `'userIsAdmin'` is not, since it is omitted.

Middleware can be toggled within specific route directories, as well. This is done by providing a `.middleware.js` file.

```
routes
└── index.js
    ├── inventory
    │   ├── index.js
    │   └── [itemId].js
    ├── brands
    │   ├── .middleware.js
    │   └── index.js
    └── overview.js
```

```js
// routes/brands/.middleware.js
module.exports = (currentMiddleare) => []
```

In this example the endpoints within `/brands/` no longer have any middleware applied, since the file returned an empty array. This applies to any sub-directories.

Note that these methods recieve the current list of middleware enabled.

Now let's say we want the endpoints within `/overview/` to be for admin users only. You can define the enabled middleware two ways within a route file.

If you want to set the middleware for all of the routes in a file, you can do so by exporting `middleware`:

```js
// routes/overview.js

module.exports.get = (req, res) => {}
module.exports.middleware = (currentMiddleare) => [...currentMiddleare, 'userIsAdmin']
```

Or, if you want it scoped to a specific route, that can be done too:

```js
// routes/overview.js

module.exports.get = (req, res) => {}

module.exports.get.middleware = (currentMiddleare) => [...currentMiddleare, 'userIsAdmin']
```

Note that neither of these in-route approaches affect sub-directories.

## Simple HTTP server

A simple Node HTTP server is included.

```js
import { serve } from 'soda'
serve()
```

By default this will walk routes in `./routes`, and middleware in `./middleware`. You can override those.

```js
serve('./src/routes', './src/middleware')
```

Basic HTTP serving is also supported from NPM scripts.

```json
{
  "scripts": {
    "serve": "soda serve ./routes"
  }
}
```

### Route params in the simple HTTP server

All params are added to the request object, as `.params`.

When using the `serve` functionality, you can cast params to either `string` or `number`. By default all params come through as a `string`.

```
routes
└── index.js
    ├── accounts
    │   ├── index.js
    │   └── [number:accountId].js
    └── summary.js
```

```js
// routes/accounts/[number:accountId].js
module.exports.get = (req, res) => {
  const accountId = req.params.accountId
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(`{ success: true, accountId: ${accountId} }`)
}
```

## Express middleware

Want to use [Express](https://expressjs.com/)? No problem.

```js
const express = require('express')
const soda = require('soda')

const app = express()

async function startup() {
  // `withExpress` takes the same arguments as `soda.serve`
  app.use(await soda.withExpress('./routes'))

  app.listen(5555)
  console.log('Server listening on :5555')
}
startup()
```

### Routes in Express

Any route filepath like `routes/accounts/[accountId].js` will get converted to an Express route path like `/routes/accounts/:accountId`.
