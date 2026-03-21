type SoundType = "move" | "capture" | "check" | "castle" | "lowTime" | "gameEnd" | "checkmate" | "illegal";

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  // Resume on every call — browsers suspend until user gesture
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume: number = 0.3,
) {
  const ctx = getContext();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function playNoise(duration: number, volume: number = 0.1) {
  const ctx = getContext();
  const sampleRate = ctx.sampleRate;
  const bufferSize = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / bufferSize);
  }

  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = buffer;
  gain.gain.value = volume;

  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

const soundEffects: Record<SoundType, () => void> = {
  move: () => {
    playNoise(0.06, 0.2);
    playTone(600, 0.06, "sine", 0.15);
  },

  capture: () => {
    playNoise(0.1, 0.35);
    playTone(300, 0.1, "sine", 0.2);
  },

  check: () => {
    playTone(880, 0.1, "square", 0.2);
    setTimeout(() => playTone(1100, 0.15, "square", 0.18), 120);
  },

  castle: () => {
    playNoise(0.06, 0.2);
    playTone(600, 0.06, "sine", 0.15);
    setTimeout(() => {
      playNoise(0.06, 0.2);
      playTone(700, 0.06, "sine", 0.15);
    }, 130);
  },

  lowTime: () => {
    playTone(1000, 0.05, "sine", 0.15);
  },

  gameEnd: () => {
    playTone(660, 0.2, "sine", 0.2);
    setTimeout(() => playTone(550, 0.2, "sine", 0.18), 200);
    setTimeout(() => playTone(440, 0.3, "sine", 0.15), 400);
  },

  checkmate: () => {
    playTone(440, 0.15, "sine", 0.25);
    setTimeout(() => playTone(660, 0.15, "sine", 0.25), 150);
    setTimeout(() => playTone(880, 0.25, "sine", 0.3), 300);
    setTimeout(() => {
      playTone(880, 0.4, "triangle", 0.2);
      playTone(1100, 0.4, "triangle", 0.15);
    }, 550);
  },

  illegal: () => {
    playTone(150, 0.2, "square", 0.12);
  },
};

export function playSound(type: SoundType): void {
  try {
    soundEffects[type]();
  } catch {
    // Audio not available
  }
}

/** Call on first user interaction to ensure AudioContext is unlocked */
export function initAudio(): void {
  getContext();
}
