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

  it('should not serve pages that are not routed', () => {
    expect(async () => {
      await axios.get('http://localhost:5456/nope')
    }).rejects.toThrow(AxiosError)
  })

  it('should work with nested named files, which include params', async () => {
    expect(async () => {
      await axios.get('http://localhost:5456/magic/cosmo')
    }).rejects.toThrow(AxiosError)
    expect(async () => {
      await axios.post('http://localhost:5456/magic/cosmo')
    }).rejects.toThrow(AxiosError)
    expect(async () => {
      await axios.delete('http://localhost:5456/magic/cosmo')
    }).rejects.toThrow(AxiosError)

    const response = await axios.patch('http://localhost:5456/magic/cosmo')
    expect(response.status).toBe(200)
    const responseData = response.data as ApiResponse
    expect(responseData.page).toBe('magic patch: cosmo')

    const response2 = await axios.put('http://localhost:5456/magic/cosmo')
    expect(response2.status).toBe(200)
    const response2Data = response2.data as ApiResponse
    expect(response2Data.page).toBe('magic put: cosmo')
  })

  it('should not serve routes w/o an index', async () => {
    expect(async () => {
      await axios.get('http://localhost:5456/magic/')
    }).rejects.toThrow(AxiosError)
    expect(async () => {
      await axios.post('http://localhost:5456/magic/')
    }).rejects.toThrow(AxiosError)
    expect(async () => {
      await axios.delete('http://localhost:5456/magic/')
    }).rejects.toThrow(AxiosError)
    expect(async () => {
      await axios.put('http://localhost:5456/magic/')
    }).rejects.toThrow(AxiosError)
    expect(async () => {
      await axios.patch('http://localhost:5456/magic/')
    }).rejects.toThrow(AxiosError)
  })
})
