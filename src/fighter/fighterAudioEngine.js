const AUDIO_STORAGE_KEY = 'fighter_audio_enabled'

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const randomBetween = (min, max) => min + Math.random() * (max - min)

const EFFECT_GROUPS = {
  blade: new Set(['slash', 'cleave', 'wind_arc', 'wind_gain', 'wind_burst', 'blade_hit', 'projectile_hit']),
  fist: new Set(['jab', 'haymaker', 'rush', 'fury_burst', 'fist_hit']),
  shade: new Set(['shadow_cut', 'shadow_mark', 'shadow_pop', 'afterimage', 'blink', 'shade_hit']),
  guard: new Set(['shield_bash', 'quake', 'bulwark', 'bulwark_crash', 'guard_ring', 'guard_hit']),
  hit: new Set(['blade_hit', 'fist_hit', 'shade_hit', 'guard_hit', 'projectile_hit']),
  block: new Set(['block_spark']),
  heavy: new Set(['cleave', 'haymaker', 'rush', 'fury_burst', 'guard_crush', 'air_slam', 'quake', 'bulwark', 'bulwark_crash']),
}

const ITEM_TONES = {
  heal: { base: 520, color: 'warm', gain: 0.55 },
  energy: { base: 760, color: 'clean', gain: 0.52 },
  haste: { base: 920, color: 'spark', gain: 0.5 },
  launch: { base: 610, color: 'air', gain: 0.58 },
  shock: { base: 180, color: 'impact', gain: 0.68 },
  swap: { base: 640, color: 'phase', gain: 0.58 },
  shield: { base: 310, color: 'metal', gain: 0.62 },
  freeze: { base: 980, color: 'ice', gain: 0.5 },
  bomb: { base: 92, color: 'impact', gain: 0.78 },
  anchor: { base: 74, color: 'heavy', gain: 0.72 },
  tide: { base: 430, color: 'water', gain: 0.56 },
}

export class FighterAudioEngine {
  constructor() {
    this.ctx = null
    this.master = null
    this.sfx = null
    this.reverb = null
    this.reverbSend = null
    this.compressor = null
    this.noiseBuffer = null
    this.enabled = localStorage.getItem(AUDIO_STORAGE_KEY) !== '0'
    this.unlocked = false
    this.lastPlayed = new Map()
    this.lastStatus = ''
    this.lastWinner = ''
  }

  get isEnabled() {
    return this.enabled
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled)
    localStorage.setItem(AUDIO_STORAGE_KEY, this.enabled ? '1' : '0')
    if (this.enabled) {
      this.unlock().catch(() => {})
    } else if (this.master) {
      const now = this.ctx.currentTime
      this.master.gain.cancelScheduledValues(now)
      this.master.gain.setTargetAtTime(0.0001, now, 0.025)
    }
  }

  toggle() {
    this.setEnabled(!this.enabled)
    return this.enabled
  }

  async unlock() {
    if (!this.enabled) return
    this.ensure()
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume()
    }
    if (!this.unlocked) {
      this.unlocked = true
      const now = this.ctx.currentTime
      this.master.gain.cancelScheduledValues(now)
      this.master.gain.setValueAtTime(0.0001, now)
      this.master.gain.exponentialRampToValueAtTime(0.78, now + 0.08)
      this.playSoftClick(0.018)
    }
  }

  destroy() {
    if (!this.ctx) return
    this.ctx.close()
    this.ctx = null
    this.master = null
    this.sfx = null
    this.reverb = null
    this.reverbSend = null
    this.compressor = null
    this.noiseBuffer = null
    this.lastPlayed.clear()
  }

  ensure() {
    if (this.ctx) return
    const AudioCtor = window.AudioContext || window.webkitAudioContext
    if (!AudioCtor) return
    this.ctx = new AudioCtor({ latencyHint: 'interactive' })

    this.master = this.ctx.createGain()
    this.master.gain.value = this.enabled ? 0.78 : 0.0001

    this.sfx = this.ctx.createGain()
    this.sfx.gain.value = 0.92

    this.reverb = this.ctx.createConvolver()
    this.reverb.buffer = this.createImpulse(1.35, 2.3)
    this.reverbSend = this.ctx.createGain()
    this.reverbSend.gain.value = 0.18

    this.compressor = this.ctx.createDynamicsCompressor()
    this.compressor.threshold.value = -18
    this.compressor.knee.value = 18
    this.compressor.ratio.value = 5
    this.compressor.attack.value = 0.006
    this.compressor.release.value = 0.13

    this.sfx.connect(this.compressor)
    this.sfx.connect(this.reverbSend)
    this.reverbSend.connect(this.reverb)
    this.reverb.connect(this.compressor)
    this.compressor.connect(this.master)
    this.master.connect(this.ctx.destination)
    this.noiseBuffer = this.createNoiseBuffer()
  }

  syncMatchState(state) {
    if (!state) return
    const status = state.status || ''
    if (status !== this.lastStatus) {
      if (status === 'playing') this.playRoundStart()
      if (status === 'finished' && !state.winner) this.playRoundEnd(false)
      this.lastStatus = status
    }
    if (state.winner && state.winner !== this.lastWinner) {
      this.playRoundEnd(true)
      this.lastWinner = state.winner
    }
    if (!state.winner) this.lastWinner = ''
  }

  playEffect(effect, state) {
    if (!effect?.type || !this.enabled) return
    this.ensure()
    if (!this.ctx || this.ctx.state !== 'running') return
    if (!this.canPlay(effect.id || `${effect.type}:${effect.x}:${effect.y}`, this.cooldownFor(effect))) return

    const pan = this.panFor(effect)
    const amount = this.intensityFor(effect)
    const type = effect.type
    const attacker = state?.players?.[effect.attackerSlot]
    const characterId = attacker?.characterId || this.characterFromType(type)

    if (EFFECT_GROUPS.block.has(type) || effect.blocked) {
      this.playBlock(effect, pan, amount)
      return
    }
    if (EFFECT_GROUPS.hit.has(type) || effect.damage || effect.defenderSlot) {
      this.playHit(effect, pan, amount, characterId)
      return
    }
    if (type.startsWith('item_')) {
      this.playItem(type.replace('item_', ''), pan)
      return
    }
    if (type.startsWith('enemy_')) {
      this.playEnemy(type, pan, amount)
      return
    }
    if (type === 'fall_return' || type === 'lava_burst') {
      this.playHazard(type, pan)
      return
    }
    if (type === 'afterimage' || type === 'blink' || type === 'shadow_pop') {
      this.playPhase(type, pan, amount)
      return
    }
    if (EFFECT_GROUPS.heavy.has(type)) {
      this.playHeavyMove(type, pan, amount, characterId)
      return
    }
    if (EFFECT_GROUPS.blade.has(type)) {
      this.playBladeMove(type, pan, amount)
      return
    }
    if (EFFECT_GROUPS.fist.has(type)) {
      this.playFistMove(type, pan, amount)
      return
    }
    if (EFFECT_GROUPS.guard.has(type)) {
      this.playGuardMove(type, pan, amount)
      return
    }
    if (type === 'sweep' || type === 'launcher' || type === 'dash_light' || type === 'air_slice') {
      this.playFootwork(type, pan, amount)
    }
  }

  playLocalAction(action, input = {}) {
    if (!this.enabled) return
    this.unlock()
    if (!this.ctx || this.ctx.state !== 'running') return
    const pan = 0
    if (action === 'jump') {
      this.playFootwork('jump', pan, 0.55)
    } else if (action === 'block') {
      this.playGuardMove('guard_raise', pan, 0.42)
    } else if (action === 'light') {
      this.playFootwork(input?.down ? 'sweep_start' : 'light_start', pan, 0.44)
    } else if (action === 'heavy') {
      this.playHeavyMove(input?.down ? 'launcher_start' : 'heavy_start', pan, 0.5)
    } else if (action === 'special') {
      this.playPhase(input?.down ? 'guard_crush_start' : 'special_start', pan, 0.54)
    }
  }

  playRoundStart() {
    if (!this.enabled) return
    this.unlock().catch(() => {})
    if (!this.ctx || this.ctx.state !== 'running') return
    const now = this.ctx.currentTime
    this.playNoiseLayer({ start: now, duration: 0.7, gain: 0.18, pan: 0, filter: 'bandpass', freqStart: 360, freqEnd: 2600, q: 1.7 })
    this.playToneLayer({ start: now + 0.02, duration: 0.22, gain: 0.16, pan: -0.12, type: 'triangle', freqStart: 180, freqEnd: 260 })
    this.playToneLayer({ start: now + 0.16, duration: 0.28, gain: 0.18, pan: 0.12, type: 'sawtooth', freqStart: 260, freqEnd: 410 })
    this.playTransient({ start: now + 0.43, pan: 0, gain: 0.34, freq: 92, clickFreq: 1900 })
  }

  playRoundEnd(hasWinner) {
    if (!this.enabled) return
    this.unlock().catch(() => {})
    if (!this.ctx || this.ctx.state !== 'running') return
    const now = this.ctx.currentTime
    this.playTransient({ start: now, pan: 0, gain: hasWinner ? 0.58 : 0.36, freq: 52, clickFreq: 860, duration: 0.46 })
    this.playToneLayer({ start: now + 0.06, duration: 0.62, gain: 0.18, pan: -0.2, type: 'triangle', freqStart: hasWinner ? 220 : 160, freqEnd: hasWinner ? 330 : 120 })
    this.playToneLayer({ start: now + 0.13, duration: 0.74, gain: 0.14, pan: 0.2, type: 'triangle', freqStart: hasWinner ? 330 : 210, freqEnd: hasWinner ? 494 : 145 })
    this.playNoiseLayer({ start: now + 0.02, duration: 0.5, gain: 0.15, pan: 0, filter: 'lowpass', freqStart: 1500, freqEnd: 420, q: 0.7 })
  }

  playBladeMove(type, pan, amount) {
    const now = this.ctx.currentTime
    const heavy = type === 'cleave' || type === 'wind_burst'
    this.playNoiseLayer({
      start: now,
      duration: heavy ? 0.28 : 0.18,
      gain: (heavy ? 0.34 : 0.22) * amount,
      pan,
      filter: 'bandpass',
      freqStart: heavy ? 360 : 760,
      freqEnd: heavy ? 5200 : 6600,
      q: heavy ? 1.2 : 1.8,
    })
    this.playToneLayer({
      start: now + 0.012,
      duration: heavy ? 0.16 : 0.1,
      gain: (heavy ? 0.08 : 0.052) * amount,
      pan,
      type: 'sawtooth',
      freqStart: heavy ? 190 : 360,
      freqEnd: heavy ? 92 : 520,
    })
    if (type === 'wind_burst') {
      this.playNoiseLayer({ start: now + 0.04, duration: 0.42, gain: 0.22 * amount, pan, filter: 'highpass', freqStart: 260, freqEnd: 1200, q: 0.8, reverb: 0.34 })
    }
  }

  playFistMove(type, pan, amount) {
    const now = this.ctx.currentTime
    const rush = type === 'rush' || type === 'fury_burst'
    this.playTransient({ start: now, pan, gain: (rush ? 0.34 : 0.18) * amount, freq: rush ? 84 : 118, clickFreq: rush ? 1250 : 1800, duration: rush ? 0.2 : 0.12 })
    this.playNoiseLayer({ start: now + 0.015, duration: rush ? 0.2 : 0.1, gain: (rush ? 0.24 : 0.13) * amount, pan, filter: 'lowpass', freqStart: rush ? 2200 : 3200, freqEnd: 520, q: 0.75 })
    if (rush) {
      this.playNoiseLayer({ start: now + 0.04, duration: 0.34, gain: 0.16 * amount, pan, filter: 'bandpass', freqStart: 180, freqEnd: 1800, q: 1.1 })
    }
  }

  playGuardMove(type, pan, amount) {
    const now = this.ctx.currentTime
    const heavy = type === 'quake' || type === 'bulwark' || type === 'bulwark_crash'
    this.playMetal({ start: now, pan, gain: (heavy ? 0.32 : 0.18) * amount, base: heavy ? 132 : 240, duration: heavy ? 0.48 : 0.22 })
    if (heavy) {
      this.playTransient({ start: now + 0.025, pan, gain: 0.32 * amount, freq: 54, clickFreq: 620, duration: 0.34 })
      this.playNoiseLayer({ start: now + 0.06, duration: 0.32, gain: 0.15 * amount, pan, filter: 'lowpass', freqStart: 780, freqEnd: 160, q: 0.7 })
    }
  }

  playHeavyMove(type, pan, amount, characterId) {
    if (characterId === 'blade') return this.playBladeMove('cleave', pan, amount)
    if (characterId === 'fist') return this.playFistMove(type === 'fury_burst' ? 'fury_burst' : 'haymaker', pan, amount)
    if (characterId === 'guard') return this.playGuardMove(type, pan, amount)
    if (characterId === 'shade') return this.playPhase(type, pan, amount)
    const now = this.ctx.currentTime
    this.playTransient({ start: now, pan, gain: 0.35 * amount, freq: 76, clickFreq: 1200, duration: 0.22 })
    this.playNoiseLayer({ start: now, duration: 0.24, gain: 0.2 * amount, pan, filter: 'lowpass', freqStart: 2600, freqEnd: 480, q: 0.8 })
  }

  playFootwork(type, pan, amount) {
    const now = this.ctx.currentTime
    const airborne = type.includes('jump') || type.includes('launcher')
    this.playNoiseLayer({
      start: now,
      duration: airborne ? 0.14 : 0.1,
      gain: (airborne ? 0.11 : 0.09) * amount,
      pan,
      filter: 'bandpass',
      freqStart: airborne ? 240 : 160,
      freqEnd: airborne ? 1400 : 680,
      q: 0.9,
    })
    if (type.includes('sweep')) {
      this.playNoiseLayer({ start: now + 0.02, duration: 0.18, gain: 0.15 * amount, pan, filter: 'lowpass', freqStart: 1600, freqEnd: 260, q: 0.9 })
    }
  }

  playPhase(type, pan, amount) {
    const now = this.ctx.currentTime
    this.playNoiseLayer({ start: now, duration: 0.22, gain: 0.16 * amount, pan, filter: 'bandpass', freqStart: 5200, freqEnd: 620, q: 2.2, reverb: 0.28 })
    this.playToneLayer({ start: now + 0.01, duration: 0.18, gain: 0.095 * amount, pan, type: 'triangle', freqStart: 920, freqEnd: type === 'shadow_pop' ? 180 : 420, reverb: 0.24 })
    if (type === 'shadow_pop') {
      this.playTransient({ start: now + 0.045, pan, gain: 0.36 * amount, freq: 72, clickFreq: 2400, duration: 0.24 })
    }
  }

  playHit(effect, pan, amount, characterId) {
    const now = this.ctx.currentTime
    const heavy = effect.hitLevel === 'heavy' || (effect.damage || 0) >= 14
    const sharpness = characterId === 'blade' ? 3200 : characterId === 'fist' ? 1300 : characterId === 'shade' ? 4200 : 1900
    this.playTransient({ start: now, pan, gain: (heavy ? 0.5 : 0.34) * amount, freq: heavy ? 62 : 92, clickFreq: sharpness, duration: heavy ? 0.28 : 0.18 })
    this.playNoiseLayer({ start: now + 0.008, duration: heavy ? 0.18 : 0.11, gain: (heavy ? 0.25 : 0.16) * amount, pan, filter: 'bandpass', freqStart: sharpness, freqEnd: heavy ? 540 : 820, q: 1.2 })
    if (characterId === 'blade') {
      this.playBladeMove('slash', pan, amount * 0.72)
    } else if (characterId === 'guard') {
      this.playMetal({ start: now + 0.02, pan, gain: 0.12 * amount, base: 180, duration: 0.22 })
    }
  }

  playBlock(effect, pan, amount) {
    const now = this.ctx.currentTime
    this.playMetal({ start: now, pan, gain: 0.42 * amount, base: effect.hitLevel === 'blocked' ? 270 : 330, duration: 0.26 })
    this.playNoiseLayer({ start: now, duration: 0.1, gain: 0.17 * amount, pan, filter: 'highpass', freqStart: 3200, freqEnd: 1100, q: 1.3 })
  }

  playItem(kind, pan) {
    const item = ITEM_TONES[kind] || { base: 440, color: 'clean', gain: 0.45 }
    const now = this.ctx.currentTime
    if (item.color === 'impact' || item.color === 'heavy') {
      this.playTransient({ start: now, pan, gain: item.gain, freq: item.base, clickFreq: 980, duration: 0.34 })
      this.playNoiseLayer({ start: now + 0.02, duration: 0.3, gain: 0.22, pan, filter: 'lowpass', freqStart: 1800, freqEnd: 190, q: 0.7 })
      return
    }
    if (item.color === 'metal') {
      this.playMetal({ start: now, pan, gain: item.gain * 0.58, base: item.base, duration: 0.36 })
      return
    }
    this.playToneLayer({ start: now, duration: 0.14, gain: item.gain * 0.18, pan, type: 'triangle', freqStart: item.base, freqEnd: item.base * 1.5, reverb: 0.24 })
    this.playToneLayer({ start: now + 0.08, duration: 0.18, gain: item.gain * 0.14, pan, type: 'sine', freqStart: item.base * 1.5, freqEnd: item.base * 2, reverb: 0.3 })
    this.playNoiseLayer({ start: now, duration: 0.2, gain: item.gain * 0.13, pan, filter: 'bandpass', freqStart: item.base, freqEnd: item.base * 3, q: 1.6, reverb: 0.18 })
  }

  playEnemy(type, pan, amount) {
    const now = this.ctx.currentTime
    if (type.includes('whale')) {
      this.playToneLayer({ start: now, duration: 0.56, gain: 0.22 * amount, pan, type: 'sine', freqStart: 96, freqEnd: 52, reverb: 0.45 })
      this.playNoiseLayer({ start: now, duration: 0.44, gain: 0.16 * amount, pan, filter: 'lowpass', freqStart: 1200, freqEnd: 220, q: 0.8, reverb: 0.35 })
      return
    }
    this.playTransient({ start: now, pan, gain: 0.38 * amount, freq: type.includes('shark') ? 86 : 112, clickFreq: 1700, duration: 0.2 })
  }

  playHazard(type, pan) {
    const now = this.ctx.currentTime
    const lava = type === 'lava_burst'
    this.playNoiseLayer({ start: now, duration: lava ? 0.36 : 0.22, gain: lava ? 0.32 : 0.2, pan, filter: 'lowpass', freqStart: lava ? 2600 : 1100, freqEnd: lava ? 180 : 260, q: 0.7 })
    this.playTransient({ start: now + 0.02, pan, gain: lava ? 0.28 : 0.22, freq: lava ? 70 : 84, clickFreq: lava ? 620 : 980, duration: 0.24 })
  }

  playSoftClick(gain = 0.04) {
    if (!this.ctx) return
    this.playToneLayer({ start: this.ctx.currentTime, duration: 0.035, gain, pan: 0, type: 'sine', freqStart: 880, freqEnd: 660 })
  }

  playTransient({ start, pan, gain, freq = 86, clickFreq = 1600, duration = 0.18 }) {
    this.playToneLayer({ start, duration, gain: gain * 0.72, pan, type: 'sine', freqStart: freq, freqEnd: freq * 0.48 })
    this.playNoiseLayer({ start, duration: Math.min(0.08, duration * 0.45), gain: gain * 0.46, pan, filter: 'bandpass', freqStart: clickFreq, freqEnd: clickFreq * 0.55, q: 1.5 })
  }

  playMetal({ start, pan, gain, base = 260, duration = 0.28 }) {
    this.playToneLayer({ start, duration, gain: gain * 0.34, pan, type: 'triangle', freqStart: base, freqEnd: base * 0.78, reverb: 0.3 })
    this.playToneLayer({ start: start + 0.006, duration: duration * 0.82, gain: gain * 0.22, pan, type: 'sine', freqStart: base * 2.12, freqEnd: base * 1.52, reverb: 0.42 })
    this.playToneLayer({ start: start + 0.012, duration: duration * 0.66, gain: gain * 0.14, pan, type: 'square', freqStart: base * 3.72, freqEnd: base * 2.28, reverb: 0.36 })
    this.playNoiseLayer({ start, duration: duration * 0.42, gain: gain * 0.22, pan, filter: 'highpass', freqStart: 4200, freqEnd: 1200, q: 1.1, reverb: 0.22 })
  }

  playToneLayer({ start, duration, gain, pan, type = 'sine', freqStart, freqEnd, reverb = 0.08 }) {
    if (!this.ctx || gain <= 0) return
    const osc = this.ctx.createOscillator()
    const amp = this.ctx.createGain()
    const panner = this.ctx.createStereoPanner()
    const dry = this.ctx.createGain()
    const wet = this.ctx.createGain()
    const end = start + duration
    const safeFreqStart = Math.max(20, freqStart * randomBetween(0.985, 1.015))
    const safeFreqEnd = Math.max(20, freqEnd * randomBetween(0.985, 1.015))

    osc.type = type
    osc.frequency.setValueAtTime(safeFreqStart, start)
    osc.frequency.exponentialRampToValueAtTime(safeFreqEnd, end)
    amp.gain.setValueAtTime(0.0001, start)
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + Math.min(0.012, duration * 0.16))
    amp.gain.exponentialRampToValueAtTime(0.0001, end)
    panner.pan.value = clamp(pan + randomBetween(-0.03, 0.03), -1, 1)
    dry.gain.value = 1
    wet.gain.value = reverb

    osc.connect(amp)
    amp.connect(panner)
    panner.connect(dry)
    panner.connect(wet)
    dry.connect(this.sfx)
    wet.connect(this.reverb)
    osc.start(start)
    osc.stop(end + 0.02)
  }

  playNoiseLayer({ start, duration, gain, pan, filter = 'bandpass', freqStart = 1400, freqEnd = 600, q = 1, reverb = 0.06 }) {
    if (!this.ctx || gain <= 0 || !this.noiseBuffer) return
    const src = this.ctx.createBufferSource()
    const amp = this.ctx.createGain()
    const biquad = this.ctx.createBiquadFilter()
    const panner = this.ctx.createStereoPanner()
    const dry = this.ctx.createGain()
    const wet = this.ctx.createGain()
    const end = start + duration

    src.buffer = this.noiseBuffer
    src.loop = true
    biquad.type = filter
    biquad.Q.value = q
    biquad.frequency.setValueAtTime(Math.max(30, freqStart), start)
    biquad.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), end)
    amp.gain.setValueAtTime(0.0001, start)
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + Math.min(0.018, duration * 0.18))
    amp.gain.exponentialRampToValueAtTime(0.0001, end)
    panner.pan.value = clamp(pan + randomBetween(-0.05, 0.05), -1, 1)
    dry.gain.value = 1
    wet.gain.value = reverb

    src.connect(biquad)
    biquad.connect(amp)
    amp.connect(panner)
    panner.connect(dry)
    panner.connect(wet)
    dry.connect(this.sfx)
    wet.connect(this.reverb)
    src.start(start, randomBetween(0, 0.4))
    src.stop(end + 0.02)
  }

  createNoiseBuffer() {
    const length = Math.floor(this.ctx.sampleRate * 1.5)
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < length; i += 1) {
      const white = randomBetween(-1, 1)
      last = last * 0.74 + white * 0.26
      data[i] = last
    }
    return buffer
  }

  createImpulse(seconds, decay) {
    const length = Math.floor(this.ctx.sampleRate * seconds)
    const buffer = this.ctx.createBuffer(2, length, this.ctx.sampleRate)
    for (let channel = 0; channel < 2; channel += 1) {
      const data = buffer.getChannelData(channel)
      for (let i = 0; i < length; i += 1) {
        const t = i / length
        data[i] = randomBetween(-1, 1) * Math.pow(1 - t, decay)
      }
    }
    return buffer
  }

  canPlay(key, cooldownMs) {
    const now = performance.now()
    const last = this.lastPlayed.get(key) || 0
    if (now - last < cooldownMs) return false
    this.lastPlayed.set(key, now)
    if (this.lastPlayed.size > 220) {
      this.lastPlayed = new Map([...this.lastPlayed.entries()].slice(-150))
    }
    return true
  }

  cooldownFor(effect) {
    if (effect.type?.startsWith('item_')) return 20
    if (effect.damage || effect.defenderSlot) return 8
    if (effect.type === 'afterimage') return 48
    return 16
  }

  intensityFor(effect) {
    const damage = Number(effect.damage || 0)
    const level = effect.hitLevel
    let amount = 0.78
    if (level === 'heavy') amount += 0.22
    if (effect.blocked) amount -= 0.16
    amount += clamp(damage / 32, 0, 0.36)
    return clamp(amount, 0.42, 1.28)
  }

  panFor(effect) {
    const x = Number(effect.x || 480) + Number(effect.width || 0) / 2
    return clamp((x - 480) / 470, -0.86, 0.86)
  }

  characterFromType(type) {
    if (EFFECT_GROUPS.blade.has(type)) return 'blade'
    if (EFFECT_GROUPS.fist.has(type)) return 'fist'
    if (EFFECT_GROUPS.shade.has(type)) return 'shade'
    if (EFFECT_GROUPS.guard.has(type)) return 'guard'
    return ''
  }
}
