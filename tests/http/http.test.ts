import path from 'node:path'

import axios, { AxiosError } from 'axios'

import { serve } from '../../src'

interface ApiResponse {
  success: boolean
  page: string
}

describe('http serving', () => {
  let closeServer: undefined | ((callback?: () => void) => void) = undefined
  
  beforeAll(async () => {
    closeServer = await serve(path.join(__dirname, 'routes'))
  })

  afterAll(() => {
    if (closeServer) {
      closeServer()
    }
  })

  it('should serve', async () => {
    const response = await axios.get('http://localhost:5456/')
    expect(response.status).toBe(200)
    const responseData = response.data as ApiResponse
    expect(responseData.page).toBe('root')
  })

  it('should not serve pages that are not routed', async () => {
    expect(async () => {
      await axios.get('http://localhost:5456/nope')
    }).rejects.toThrow(AxiosError)
  })
})
