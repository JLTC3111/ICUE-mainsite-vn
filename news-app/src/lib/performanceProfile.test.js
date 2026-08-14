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

test('phones and tablets keep full motion despite low core counts', () => {
  // The desktop thresholds read a phone's 4-8 cores as a low-end PC, which
  // switched the newsroom's Embla parallax off on every mobile device.
  assert.equal(classifyPerformanceTier({
    cores: 4,
    memory: undefined,
    renderer: 'apple gpu',
    mobile: true,
  }), 'full')
  assert.equal(classifyPerformanceTier({
    cores: 8,
    memory: 8,
    renderer: 'angle (qualcomm, adreno (tm) 740)',
    mobile: true,
  }), 'full')
  assert.equal(classifyPerformanceTier({
    cores: 8,
    memory: 4,
    renderer: 'mali-g52',
    mobile: true,
  }), 'full')
})

test('genuinely low end devices stay optimized on both form factors', () => {
  assert.equal(classifyPerformanceTier({ cores: 4, memory: 2, mobile: true }), 'minimal')
  assert.equal(classifyPerformanceTier({
    cores: 8,
    memory: 8,
    renderer: 'angle (google, vulkan 1.3 swiftshader device)',
    mobile: true,
  }), 'minimal')
  assert.equal(classifyPerformanceTier({ cores: 4, memory: 8 }), 'minimal')
  assert.equal(classifyPerformanceTier({ cores: 8, memory: 16 }), 'reduced')
})

test('deviceMemory at the browser cap is not read as a low-memory machine', () => {
  // navigator.deviceMemory is clamped to 8, so every Chromium desktop reports
  // exactly 8 whatever its real RAM. Treating that as low memory put all of
  // Chrome and Edge on `reduced`, which hides the article lens entirely. The
  // memory: 16 cases elsewhere in this file are values no browser ever sends,
  // which is why that never showed up here.
  assert.equal(classifyPerformanceTier({
    cores: 16,
    memory: 8,
    renderer: 'angle (nvidia, nvidia geforce rtx 4070 direct3d11)',
  }), 'full')
  assert.equal(tierToProfile(classifyPerformanceTier({ cores: 10, memory: 8 })).disableLens, false)

  // The thresholds that can still tell a small machine apart are untouched.
  assert.equal(classifyPerformanceTier({ cores: 8, memory: 8 }), 'reduced')
  assert.equal(classifyPerformanceTier({ cores: 16, memory: 4 }), 'minimal')
  assert.equal(classifyPerformanceTier({
    cores: 16,
    memory: 8,
    renderer: 'angle (intel, intel(r) uhd graphics 620 direct3d11)',
  }), 'reduced')
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
