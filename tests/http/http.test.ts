import path from 'node:path'

import axios, { AxiosError } from 'axios'

import { serve } from '../../src'

interface ApiResponse {
  success: boolean
  page: string
}

interface ApiParamsDebugResponse {
  success: boolean
  params: Record<string, string | number>
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

describe('http serving + middleware', () => {
  let closeServer: undefined | ((callback?: () => void) => void) = undefined
    
  beforeAll(async () => {
    closeServer = await serve(
      path.join(__dirname, 'secondaryRoutes', 'middleware'),
      path.join(__dirname, 'middleware')
    )
  })

  afterAll(() => {
    if (closeServer) {
      closeServer()
    }
  })
  
  it('should set base middleware', async () => {
    let response, responseData

    response = await axios.get('http://localhost:5456/')
    expect(response.status).toBe(200)
    responseData = response.data as ApiParamsDebugResponse
    expect(responseData.params.alpha).toBe(0)
    expect(responseData.params.beta).toBe(1)
    expect(responseData.params.gamma).toBe(0)

    response = await axios.post('http://localhost:5456/')
    expect(response.status).toBe(200)
    responseData = response.data as ApiParamsDebugResponse
    expect(responseData.params.alpha).toBe(0)
    expect(responseData.params.beta).toBe(1)
    expect(responseData.params.gamma).toBe(0)
  })

  it('should allow adding middleware to all endpoints', async () => {
    let response, responseData

    response = await axios.get('http://localhost:5456/overrides/file/plusGamma')
    expect(response.status).toBe(200)
    responseData = response.data as ApiParamsDebugResponse
    expect(responseData.params.alpha).toBe(0)
    expect(responseData.params.beta).toBe(1)
    expect(responseData.params.gamma).toBe(1)

    response = await axios.post('http://localhost:5456/overrides/file/plusGamma')
    expect(response.status).toBe(200)
    responseData = response.data as ApiParamsDebugResponse
    expect(responseData.params.alpha).toBe(0)
    expect(responseData.params.beta).toBe(1)
    expect(responseData.params.gamma).toBe(1)
  })

  it('should allow overriding middleware for all endpoints', async () => {
    let response, responseData

    response = await axios.get('http://localhost:5456/overrides/file/onlyGamma')
    expect(response.status).toBe(200)
    responseData = response.data as ApiParamsDebugResponse
    expect(responseData.params.alpha).toBe(0)
    expect(responseData.params.beta).toBe(0)
    expect(responseData.params.gamma).toBe(1)

    response = await axios.post('http://localhost:5456/overrides/file/onlyGamma')
    expect(response.status).toBe(200)
    responseData = response.data as ApiParamsDebugResponse
    expect(responseData.params.alpha).toBe(0)
    expect(responseData.params.beta).toBe(0)
    expect(responseData.params.gamma).toBe(1)
  })

  it('should allow adding middleware to a specific endpoint', async () => {
    let response, responseData

    response = await axios.get('http://localhost:5456/overrides/endpoint/plusGamma')
    expect(response.status).toBe(200)
    responseData = response.data as ApiParamsDebugResponse
    expect(responseData.params.alpha).toBe(0)
    expect(responseData.params.beta).toBe(1)
    expect(responseData.params.gamma).toBe(1)

    response = await axios.post('http://localhost:5456/overrides/endpoint/plusGamma')
    expect(response.status).toBe(200)
    responseData = response.data as ApiParamsDebugResponse
    expect(responseData.params.alpha).toBe(0)
    expect(responseData.params.beta).toBe(1)
    expect(responseData.params.gamma).toBe(0)
  })

  it('should allow overriding middleware for a specific endpoint', async () => {
    let response, responseData

    response = await axios.get('http://localhost:5456/overrides/endpoint/onlyGamma')
    expect(response.status).toBe(200)
    responseData = response.data as ApiParamsDebugResponse
    expect(responseData.params.alpha).toBe(0)
    expect(responseData.params.beta).toBe(0)
    expect(responseData.params.gamma).toBe(1)

    response = await axios.post('http://localhost:5456/overrides/endpoint/onlyGamma')
    expect(response.status).toBe(200)
    responseData = response.data as ApiParamsDebugResponse
    expect(responseData.params.alpha).toBe(0)
    expect(responseData.params.beta).toBe(1)
    expect(responseData.params.gamma).toBe(0)
  })

  it('should allow overriding middleware using a mix of file-level and endpoint-level settings', async () => {
    let response, responseData

    response = await axios.get('http://localhost:5456/overrides/mixed')
    expect(response.status).toBe(200)
    responseData = response.data as ApiParamsDebugResponse
    expect(responseData.params.alpha).toBe(1)
    expect(responseData.params.beta).toBe(1)
    expect(responseData.params.gamma).toBe(1)

    response = await axios.post('http://localhost:5456/overrides/mixed')
    expect(response.status).toBe(200)
    responseData = response.data as ApiParamsDebugResponse
    expect(responseData.params.alpha).toBe(0)
    expect(responseData.params.beta).toBe(1)
    expect(responseData.params.gamma).toBe(1)
  })
})
