import path from 'node:path'

import axios from 'axios'

import { serve } from '../../src'

interface ApiResponse {
  success: boolean
  page: string
}

describe('http serving', () => {
  it('should serve', async () => {
    await serve(path.join(__dirname, 'routes'))

    const response = await axios.get('http://localhost:5456/')
    expect(response.status).toBe(200)
    const responseData = response.data as ApiResponse
    expect(responseData.page).toBe('root')
  })
})
