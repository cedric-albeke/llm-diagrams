import { describe, it, expect } from 'vitest'
import {
  validateArchitectureResponse,
  buildRetryPrompt,
} from '../../scripts/archdiagram/phases/reason.js'

const validPaths = ['src/auth.ts', 'src/db.ts', 'src/logger.ts']
const inputFiles = ['src/auth.ts', 'src/db.ts', 'src/logger.ts']

const validResponse = {
  groups: [
    { name: 'Auth', description: 'Auth module', files: ['src/auth.ts', 'src/db.ts'], role: 'backend' },
    { name: 'Logging', description: 'Logging module', files: ['src/logger.ts'], role: 'shared' },
  ],
  relationships: [
    { from: 'Auth', to: 'Logging', label: 'logs events', style: 'sync' },
  ],
}

describe('validateArchitectureResponse — Layer 1: non-object input', () => {
  it('returns layer 1 error for null', () => {
    const result = validateArchitectureResponse(null, validPaths, inputFiles)
    expect(result.valid).toBe(false)
    expect(result.layer).toBe(1)
  })

  it('returns layer 1 error for string', () => {
    const result = validateArchitectureResponse('not an object', validPaths, inputFiles)
    expect(result.valid).toBe(false)
    expect(result.layer).toBe(1)
  })
})

describe('validateArchitectureResponse — Layer 2: invalid schema', () => {
  it('returns layer 2 error when groups field is missing', () => {
    const result = validateArchitectureResponse({ relationships: [] }, validPaths, inputFiles)
    expect(result.valid).toBe(false)
    expect(result.layer).toBe(2)
  })

  it('returns layer 2 error when groups is empty array', () => {
    const result = validateArchitectureResponse({ groups: [], relationships: [] }, validPaths, inputFiles)
    expect(result.valid).toBe(false)
    expect(result.layer).toBe(2)
  })

  it('returns layer 2 error when group role is invalid enum value', () => {
    const invalid = {
      groups: [{ name: 'Auth', description: 'Auth', files: ['src/auth.ts'], role: 'invalid_role' }],
      relationships: [],
    }
    const result = validateArchitectureResponse(invalid, validPaths, inputFiles)
    expect(result.valid).toBe(false)
    expect(result.layer).toBe(2)
  })
})

describe('validateArchitectureResponse — Layer 3: hallucinated path', () => {
  it('catches phantom.ts not in validPaths', () => {
    const withHallucination = {
      groups: [
        { name: 'Auth', description: 'Auth module', files: ['src/auth.ts', 'src/phantom.ts'], role: 'backend' },
        { name: 'Logging', description: 'Logging', files: ['src/db.ts', 'src/logger.ts'], role: 'shared' },
      ],
      relationships: [],
    }
    const result = validateArchitectureResponse(withHallucination, validPaths, inputFiles)
    expect(result.valid).toBe(false)
    expect(result.layer).toBe(3)
    expect(result.errors[0]).toContain('phantom.ts')
  })
})

describe('validateArchitectureResponse — Layer 4: invalid relationship group', () => {
  it('catches from referencing unknown group', () => {
    const withBadRel = {
      groups: [
        { name: 'Auth', description: 'Auth', files: ['src/auth.ts', 'src/db.ts'], role: 'backend' },
        { name: 'Logging', description: 'Logging', files: ['src/logger.ts'], role: 'shared' },
      ],
      relationships: [
        { from: 'NonExistentGroup', to: 'Logging', label: 'calls', style: 'sync' },
      ],
    }
    const result = validateArchitectureResponse(withBadRel, validPaths, inputFiles)
    expect(result.valid).toBe(false)
    expect(result.layer).toBe(4)
    expect(result.errors[0]).toContain('NonExistentGroup')
  })

  it('catches to referencing unknown group', () => {
    const withBadRel = {
      groups: [
        { name: 'Auth', description: 'Auth', files: ['src/auth.ts', 'src/db.ts'], role: 'backend' },
        { name: 'Logging', description: 'Logging', files: ['src/logger.ts'], role: 'shared' },
      ],
      relationships: [
        { from: 'Auth', to: 'GhostGroup', label: 'calls', style: 'async' },
      ],
    }
    const result = validateArchitectureResponse(withBadRel, validPaths, inputFiles)
    expect(result.valid).toBe(false)
    expect(result.layer).toBe(4)
    expect(result.errors[0]).toContain('GhostGroup')
  })
})

describe('validateArchitectureResponse — Layer 5: orphan file', () => {
  it('catches file not assigned to any group', () => {
    const withOrphan = {
      groups: [
        { name: 'Auth', description: 'Auth', files: ['src/auth.ts', 'src/db.ts'], role: 'backend' },
      ],
      relationships: [],
    }
    const result = validateArchitectureResponse(withOrphan, validPaths, inputFiles)
    expect(result.valid).toBe(false)
    expect(result.layer).toBe(5)
    expect(result.errors[0]).toContain('src/logger.ts')
  })

  it('catches duplicate file assigned to multiple groups', () => {
    const withDuplicate = {
      groups: [
        { name: 'Auth', description: 'Auth', files: ['src/auth.ts', 'src/db.ts'], role: 'backend' },
        { name: 'Logging', description: 'Logging', files: ['src/db.ts', 'src/logger.ts'], role: 'shared' },
      ],
      relationships: [],
    }
    const result = validateArchitectureResponse(withDuplicate, validPaths, inputFiles)
    expect(result.valid).toBe(false)
    expect(result.layer).toBe(5)
    expect(result.errors[0]).toContain('src/db.ts')
  })
})

describe('validateArchitectureResponse — Layer 6: empty group', () => {
  it('catches group with no files', () => {
    const withEmptyGroup = {
      groups: [
        { name: 'Auth', description: 'Auth', files: ['src/auth.ts', 'src/db.ts', 'src/logger.ts'], role: 'backend' },
        { name: 'EmptyGroup', description: 'Empty', files: [], role: 'shared' },
      ],
      relationships: [],
    }
    const result = validateArchitectureResponse(withEmptyGroup, validPaths, inputFiles)
    expect(result.valid).toBe(false)
    expect(result.layer).toBe(6)
    expect(result.errors[0]).toContain('EmptyGroup')
  })
})

describe('validateArchitectureResponse — valid input', () => {
  it('returns valid: true and layer 0 for correct response', () => {
    const result = validateArchitectureResponse(validResponse, validPaths, inputFiles)
    expect(result.valid).toBe(true)
    expect(result.layer).toBe(0)
    expect(result.errors).toHaveLength(0)
  })
})

describe('buildRetryPrompt', () => {
  it('includes original prompt', () => {
    const prompt = buildRetryPrompt('Original prompt text', ['Error one'])
    expect(prompt).toContain('Original prompt text')
  })

  it('includes all error messages', () => {
    const errors = ['Hallucinated paths: src/phantom.ts', 'Orphan files: src/real.ts']
    const prompt = buildRetryPrompt('Prompt', errors)
    expect(prompt).toContain('Hallucinated paths: src/phantom.ts')
    expect(prompt).toContain('Orphan files: src/real.ts')
  })

  it('includes PREVIOUS RESPONSE WAS INVALID marker', () => {
    const prompt = buildRetryPrompt('Prompt', ['some error'])
    expect(prompt).toContain('PREVIOUS RESPONSE WAS INVALID')
  })
})
