import http from 'node:http'

import { serve } from '../../src'

describe('http serving', () => {
  it('should serve', async () => {
    await serve()
    const request = http.request({
      host: 'localhost',
      port: 5456,
      method: 'GET',
      path: '',
    })
    console.log(request)
  })
})
