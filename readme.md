# Soda :cup_with_straw:

Routes as a directory.

## What is it?

The idea behind Soda is that the API path should mirror the file path.

An exported `get` method in `/routes/users.js` would become `GET /users/`

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

