# Soda :cup_with_straw:

Routes as a directory.

## What is it?

The idea behind Soda is that the API path should mirror the file path.

An exported `get` method in `/routes/users.js` would become `GET /users/`

## Structuring routes

Let's say you have the following routes directory, and for the same of example, let's say every file exports a `get` handler.

```
.
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

## Express middleware

Want to use Express? No problem.

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

