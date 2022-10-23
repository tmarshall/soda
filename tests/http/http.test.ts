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
  describe('defined middleware', () => {
    let closeServer: undefined | ((callback?: () => void) => void) = undefined
    
    beforeAll(async () => {
      closeServer = await serve(
        path.join(__dirname, 'routes'),
        path.join(__dirname, 'middleware')
      )
    })

    afterAll(() => {
      if (closeServer) {
        closeServer()
      }
    })

    describe('default middleware settings', async () => {
      it('should set base middleware', async () => {
        let response, responseData

        response = await axios.get('http://localhost:5456/debug/params')
        expect(response.status).toBe(200)
        responseData = response.data as ApiParamsDebugResponse
        expect(responseData.params.alpha).toBe(0)
        expect(responseData.params.beta).toBe(1)
        expect(responseData.params.gamma).toBe(0)

        response = await axios.post('http://localhost:5456/debug/params')
        expect(response.status).toBe(200)
        responseData = response.data as ApiParamsDebugResponse
        expect(responseData.params.alpha).toBe(0)
        expect(responseData.params.beta).toBe(1)
        expect(responseData.params.gamma).toBe(0)
      })
    })
  })

  describe('overrides at file level', async () => {
    describe('adding "gamma" middleware to existing defaults', async () => {
      it('should set overrides to all endpoints', async () => {
        let response, responseData

        response = await axios.get('http://localhost:5456/debug/param/overrides/fileLevel/plusGamma')
        expect(response.status).toBe(200)
        responseData = response.data as ApiParamsDebugResponse
        expect(responseData.params.alpha).toBe(0)
        expect(responseData.params.beta).toBe(1)
        expect(responseData.params.gamma).toBe(1)

        response = await axios.post('http://localhost:5456/debug/param/overrides/fileLevel/plusGamma')
        expect(response.status).toBe(200)
        responseData = response.data as ApiParamsDebugResponse
        expect(responseData.params.alpha).toBe(0)
        expect(responseData.params.beta).toBe(1)
        expect(responseData.params.gamma).toBe(1)
      })
    })

    describe('adding "gamma" middleware, but not applying defaults', async () => {
      it('should set overrides to all endpoints', async () => {
        let response, responseData

        response = await axios.get('http://localhost:5456/debug/param/overrides/fileLevel/onlyGamma')
        expect(response.status).toBe(200)
        responseData = response.data as ApiParamsDebugResponse
        expect(responseData.params.alpha).toBe(0)
        expect(responseData.params.beta).toBe(0)
        expect(responseData.params.gamma).toBe(1)

        response = await axios.post('http://localhost:5456/debug/param/overrides/fileLevel/onlyGamma')
        expect(response.status).toBe(200)
        responseData = response.data as ApiParamsDebugResponse
        expect(responseData.params.alpha).toBe(0)
        expect(responseData.params.beta).toBe(0)
        expect(responseData.params.gamma).toBe(1)
      })
    })
  })

  describe('overrides at endpoint level', async () => {
    describe('adding "gamma" middleware to existing defaults', async () => {
      it('should set overrides to get endpoint', async () => {
        let response, responseData

        response = await axios.get('http://localhost:5456/debug/param/overrides/endpointLevel/plusGamma')
        expect(response.status).toBe(200)
        responseData = response.data as ApiParamsDebugResponse
        expect(responseData.params.alpha).toBe(0)
        expect(responseData.params.beta).toBe(1)
        expect(responseData.params.gamma).toBe(1)

        response = await axios.post('http://localhost:5456/debug/param/overrides/endpointLevel/plusGamma')
        expect(response.status).toBe(200)
        responseData = response.data as ApiParamsDebugResponse
        expect(responseData.params.alpha).toBe(0)
        expect(responseData.params.beta).toBe(1)
        expect(responseData.params.gamma).toBe(0)
      })
    })

    describe('adding "gamma" middleware, but not applying defaults', async () => {
      it('should set overrides to get endpoint', async () => {
        let response, responseData

        response = await axios.get('http://localhost:5456/debug/param/overrides/endpointLevel/onlyGamma')
        expect(response.status).toBe(200)
        responseData = response.data as ApiParamsDebugResponse
        expect(responseData.params.alpha).toBe(0)
        expect(responseData.params.beta).toBe(0)
        expect(responseData.params.gamma).toBe(1)

        response = await axios.post('http://localhost:5456/debug/param/overrides/endpointLevel/onlyGamma')
        expect(response.status).toBe(200)
        responseData = response.data as ApiParamsDebugResponse
        expect(responseData.params.alpha).toBe(0)
        expect(responseData.params.beta).toBe(1)
        expect(responseData.params.gamma).toBe(0)
      })
    })
  })
})