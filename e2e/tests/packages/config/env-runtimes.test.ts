import { describe, expect, it } from 'vitest'
import { Env } from '@rx-ted/packages-core'

const appEnv = new Env(process.env, {})

describe('e2e: config package in Node.js', () => {
  it('should detect node runtime', () => {
    expect(appEnv.platform).toBe('node')
  })

  it('should read env vars', () => {
    process.env.E2E_TEST_KEY = 'e2e_value'
    expect(appEnv.get('E2E_TEST_KEY')).toBe('e2e_value')
    delete process.env.E2E_TEST_KEY
  })

  it('should handle type assertions', () => {
    process.env.E2E_PORT = '9000'
    expect(appEnv.get('E2E_PORT', 'number')).toBe(9000)
    delete process.env.E2E_PORT
  })

  it('toObject should return all env vars', () => {
    process.env.E2E_OBJ = 'test'
    const obj = appEnv.toObject()
    expect(obj.E2E_OBJ).toBe('test')
    delete process.env.E2E_OBJ
  })
})
