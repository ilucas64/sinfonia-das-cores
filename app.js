// Garantir que Tone esteja disponível
let synth, reverb, limiter;
let isStarted = false;
let currentOctave = 4;
let releaseTime = 0.6;

// Gravador simples de eventos
const recording = [];
let isRecording = false;
let startTime = 0;

// Mapeamento teclado -> notas relativas
const keyMap = {
  // brancas (linha central)
  'a':'C', 's':'D', 'd':'E', 'f':'F', 'g':'G', 'h':'A', 'j':'B',
  // sustenidos em números comuns
  '2':'C#', '3':'D#', '5':'F#', '6':'G#', '7':'A#',
  // extensão direita
  'k':'C', 'l':'D', ';':'E', '\'':'F'
};

const noteButtons = document.querySelectorAll('.key');
const octaveEl = document.getElementById('octave');
const waveEl = document.getElementById('wave');
const releaseEl = document.getElementById('release');
const startBtn = document.getElementById('startAudio');
const recBtn = document.getElementById('recordBtn');
const playBtn = document.getElementById('playBtn');
const clearBtn = document.getElementById('clearBtn');

function ensureAudio() {
  if (isStarted) return;
  // Iniciar contexto de áudio (necessário por política de autoplay)
  Tone.start();
  // Cadeia: Synth -> Reverb -> Limiter -> Destination
  synth = new Tone.Synth({
    oscillator: { type: waveEl.value },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: releaseTime }
  });

  reverb = new Tone.Reverb({ decay: 2.4, wet: 0.25 });
  limiter = new Tone.Limiter(-1);

  synth.chain(reverb, limiter, Tone.Destination);
  isStarted = true;
}

function withOctave(base) {
  return `${base}${currentOctave}`;
}

function visualPulse(btn) {
  btn.classList.add('playing');
  setTimeout(()=>btn.classList.remove('playing'), 120);
}

function trigger(note, dur = 0.4) {
  ensureAudio();
  synth.triggerAttackRelease(note, dur);
}

function recordEvent(type, note) {
  if (!isRecording) return;
  const t = performance.now() - startTime;
  recording.push({ t, type, note });
}

function playRecording() {
  if (!recording.length) return;
  ensureAudio();
  // Normalizar tempo inicial
  const t0 = recording[0].t;
  const now = Tone.now();
  recording.forEach(evt => {
    const time = now + Math.max(0, (evt.t - t0)) / 1000;
    if (evt.type === 'note') {
      synth.triggerAttackRelease(evt.note, 0.4, time);
    }
  });
}

function noteFromButton(btn) {
  const base = btn.dataset.note.replace(/\d+$/, '');
  const hasOct = /\d$/.test(btn.dataset.note);
  const n = hasOct ? btn.dataset.note.replace(/\d+$/, currentOctave) : withOctave(base);
  return n;
}

// Click nas teclas coloridas
noteButtons.forEach(btn => {
  btn.addEventListener('pointerdown', () => {
    const n = noteFromButton(btn);
    trigger(n);
    recordEvent('note', n);
    visualPulse(btn);
  });
});

// Teclado físico
document.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const key = e.key.toLowerCase();
  if (key === 'arrowup') { currentOctave = Math.min(6, currentOctave+1); octaveEl.value = currentOctave; return; }
  if (key === 'arrowdown') { currentOctave = Math.max(2, currentOctave-1); octaveEl.value = currentOctave; return; }
  const base = keyMap[key];
  if (!base) return;
  const note = withOctave(base);
  const btn = [...noteButtons].find(b => b.dataset.note.startsWith(base));
  trigger(note);
  recordEvent('note', note);
  if (btn) visualPulse(btn);
});

document.addEventListener('keyup', (e) => {
  // usando triggerAttackRelease, não há sustain, mas poderia implementar sustain com triggerAttack/triggerRelease
});

// Controles
startBtn.addEventListener('click', () => ensureAudio());

octaveEl.addEventListener('input', () => {
  currentOctave = parseInt(octaveEl.value, 10);
});

waveEl.addEventListener('change', () => {
  ensureAudio();
  synth.oscillator.type = waveEl.value;
});

releaseEl.addEventListener('input', () => {
  releaseTime = parseFloat(releaseEl.value);
  if (synth) synth.envelope.release = releaseTime;
});

recBtn.addEventListener('click', () => {
  if (!isRecording) {
    recording.length = 0;
    startTime = performance.now();
    isRecording = true;
    recBtn.textContent = 'Gravando...';
    playBtn.disabled = true;
  } else {
    isRecording = false;
    recBtn.textContent = 'Gravar';
    playBtn.disabled = recording.length === 0;
  }
});

playBtn.addEventListener('click', () => {
  playRecording();
});

clearBtn.addEventListener('click', () => {
  recording.length = 0;
  playBtn.disabled = true;
});
