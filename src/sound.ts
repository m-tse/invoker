import { SPELLS } from './data'

// Sounds live in public/sounds/<id>.m4a: one per spell id, plus "invoke". Missing files are simply silent,
// so the game works with any subset of them (or none).
const url = (id: string) => `${import.meta.env.BASE_URL}sounds/${id}.m4a`

let ctx: AudioContext | null = null
let gain: GainNode | null = null
const buffers = new Map<string, AudioBuffer | null>()
const playing = new Map<string, AudioBufferSourceNode>()

// Browsers only allow audio after a user gesture, so this is called from the first key/mouse press.
export function unlockAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume()
    return
  }
  ctx = new AudioContext()
  gain = ctx.createGain()
  gain.connect(ctx.destination)
  for (const id of [...SPELLS.map((s) => s.id), 'invoke']) void load(id)
}

async function load(id: string) {
  if (!ctx || buffers.has(id)) return
  buffers.set(id, null)
  try {
    const res = await fetch(url(id))
    if (!res.ok) return
    buffers.set(id, await ctx.decodeAudioData(await res.arrayBuffer()))
  } catch {
    // missing or undecodable file: stay silent for this sound
  }
}

export function setVolume(volume: number) {
  if (gain) gain.gain.value = volume
}

export function playSound(id: string) {
  const buffer = buffers.get(id)
  if (!ctx || !gain || !buffer) return
  // Replaying the same sound restarts it instead of stacking copies.
  playing.get(id)?.stop()
  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.connect(gain)
  src.onended = () => playing.get(id) === src && playing.delete(id)
  src.start()
  playing.set(id, src)
}
