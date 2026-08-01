import test from 'node:test'
import assert from 'node:assert/strict'
import {
  classifyPerformanceTier,
  resolveEffectiveTier,
  tierToProfile,
} from './performanceProfile.js'

test('hardware detection does not treat every ANGLE renderer as low end', () => {
  assert.equal(classifyPerformanceTier({
    cores: 16,
    memory: 16,
    renderer: 'angle (nvidia, nvidia geforce rtx 4070 direct3d11)',
  }), 'full')
  assert.equal(classifyPerformanceTier({
    cores: 12,
    memory: 16,
    renderer: 'angle (amd, amd radeon rx 7800 xt direct3d11)',
  }), 'full')
  assert.equal(classifyPerformanceTier({
    cores: 16,
    memory: 16,
    renderer: 'angle (google, vulkan 1.3 swiftshader device)',
  }), 'minimal')
})

test('automatic performance tier is used when there is no manual override', () => {
  assert.equal(resolveEffectiveTier({ autoTier: 'reduced', override: null }), 'reduced')
  assert.equal(resolveEffectiveTier({ autoTier: 'minimal', override: null }), 'minimal')
})

test('manual performance overrides still win over automatic detection', () => {
  assert.equal(resolveEffectiveTier({ autoTier: 'minimal', override: 'on' }), 'full')
  assert.equal(resolveEffectiveTier({ autoTier: 'full', override: 'off' }), 'minimal')
})

test('both optimized tiers disable nonessential motion', () => {
  assert.equal(tierToProfile('reduced').reduceMotion, true)
  assert.equal(tierToProfile('minimal').reduceMotion, true)
  assert.equal(tierToProfile('full').reduceMotion, false)
})
