// soundService.ts
// Premium Web Audio API synthesizer for interactive educational feedback in QuizAI.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Plays a sweet, bright ascending bell arpeggio in a C major chord for correct answers.
 */
export function playCorrectSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Ascending arpeggio notes: C5, E5, G5, C6
  const notes = [523.25, 659.25, 783.99, 1046.50];
  
  notes.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + index * 0.08);
    
    // Smooth bell-like envelope
    gain.gain.setValueAtTime(0, now + index * 0.08);
    gain.gain.linearRampToValueAtTime(0.12, now + index * 0.08 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.45);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now + index * 0.08);
    osc.stop(now + index * 0.08 + 0.5);
  });
}

/**
 * Plays a low descending buzz/triangle wave arpeggio for incorrect answers.
 */
export function playIncorrectSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  // Triangle wave feels softer and more retro-premium than saw/square
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(220, now); // A3
  osc.frequency.linearRampToValueAtTime(110, now + 0.35); // A2 (sliding down)
  
  // Soft volume envelope
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start(now);
  osc.stop(now + 0.45);
}

/**
 * Plays an upbeat, triumphant major chord fanfare celebrating quiz completion.
 */
export function playSuccessSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  // Triumphant ascending melody notes and timing
  const notes = [
    { freq: 261.63, time: 0 },     // C4
    { freq: 329.63, time: 0.08 },   // E4
    { freq: 392.00, time: 0.16 },   // G4
    { freq: 523.25, time: 0.24 },   // C5
    { freq: 659.25, time: 0.32 },   // E5
    { freq: 783.99, time: 0.40 },   // G5
    { freq: 1046.50, time: 0.48 }   // C6 (held longer)
  ];
  
  notes.forEach((note, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Sine for final peak note, triangle for chord foundations
    osc.type = index === notes.length - 1 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(note.freq, now + note.time);
    
    const duration = index === notes.length - 1 ? 0.8 : 0.4;
    
    gain.gain.setValueAtTime(0, now + note.time);
    gain.gain.linearRampToValueAtTime(0.1, now + note.time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + note.time + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now + note.time);
    osc.stop(now + note.time + duration);
  });
}
