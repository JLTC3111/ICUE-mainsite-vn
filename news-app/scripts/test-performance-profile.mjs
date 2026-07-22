import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  detectPerformanceTier,
  tierToProfile,
  applyGlobeQuality,
  PERF_TIERS,
} from '../src/lib/performanceProfile.js'

describe('performanceProfile', () => {
  it('maps minimal tier to degraded feature flags', () => {
    const profile = tierToProfile('minimal')
    assert.equal(profile.tier, 'minimal')
    assert.equal(profile.disableGlobe, true)
    assert.equal(profile.disableParallax, true)
    assert.equal(profile.disableBorderBeam, true)
    assert.equal(profile.disableLens, true)
    assert.equal(profile.hyperTextScramble, false)
    assert.equal(profile.showScrollProgress, false)
    assert.equal(profile.globeQuality, 'off')
  })

  it('maps reduced tier to partial degradation', () => {
    const profile = tierToProfile('reduced')
    assert.equal(profile.disableGlobe, false)
    assert.equal(profile.disableParallax, true)
    assert.equal(profile.disableLens, true)
    assert.equal(profile.globeQuality, 'low')
    assert.equal(profile.showScrollProgress, false)
  })

  it('maps full tier to current behavior', () => {
    const profile = tierToProfile('full')
    assert.equal(profile.disableGlobe, false)
    assert.equal(profile.disableParallax, false)
    assert.equal(profile.disableBorderBeam, false)
    assert.equal(profile.disableLens, false)
    assert.equal(profile.hyperTextScramble, true)
    assert.equal(profile.showScrollProgress, true)
    assert.equal(profile.globeQuality, 'full')
  })

  it('lowers globe quality settings', () => {
    const low = applyGlobeQuality({ mapSamples: 16000, devicePixelRatio: 2 }, 'low')
    assert.equal(low.mapSamples, 6000)
    assert.equal(low.devicePixelRatio, 1)
  })

  it('exports known tiers', () => {
    assert.deepEqual(PERF_TIERS, ['full', 'reduced', 'minimal'])
  })

  it('detectPerformanceTier returns a valid tier in node', () => {
    const tier = detectPerformanceTier()
    assert.ok(PERF_TIERS.includes(tier))
  })
})
