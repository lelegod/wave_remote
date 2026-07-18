import type { ToOffscreen } from "./shared/types/messaging";

const CONFIG = {
  HIGH_PASS_FREQUENCY: 2000,
  AMPLITUDE_THRESHOLD: 50,
  COOLDOWN_MS: 120,
  MULTI_CLAP_WINDOW_MS: 600,
  ANALYSIS_INTERVAL_MS: 20,
  FFT_SIZE: 256,
  BASELINE_THRESHOLD: 10,
  MAX_IMPULSE_DURATION_MS: 250,
  MIN_SPIKE_SAMPLES: 1
};

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let isListening = false;
let lastClapTime = 0;
let clapCount = 0;
let clapTimer: ReturnType<typeof setTimeout> | null = null;
let analysisInterval: ReturnType<typeof setInterval> | null = null;
let lastAmplitudeSent = 0;

let spikeStartTime: number | null = null;
let spikeSampleCount = 0;
let waitingForDecay = false;
let waitingForSilence = false;

async function initAudio(deviceId: string | null = null): Promise<void> {
  try {
    const audioConstraints: MediaTrackConstraints = {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false
    };
    if (deviceId) audioConstraints.deviceId = { ideal: deviceId };

    const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);

    const highPass = audioContext.createBiquadFilter();
    highPass.type = "highpass";
    highPass.frequency.value = CONFIG.HIGH_PASS_FREQUENCY;
    highPass.Q.value = 1;

    analyser = audioContext.createAnalyser();
    analyser.fftSize = CONFIG.FFT_SIZE;
    analyser.smoothingTimeConstant = 0.3;

    source.connect(highPass);
    highPass.connect(analyser);

    startListening();
    chrome.runtime.sendMessage({ type: "OFFSCREEN_READY", status: "listening" });
  } catch (error) {
    const e = error as DOMException;
    chrome.runtime.sendMessage({ type: "OFFSCREEN_ERROR", error: `${e.name}: ${e.message}` });
  }
}

function startListening(): void {
  if (isListening || !analyser) return;
  isListening = true;
  const bufferLength = analyser.fftSize;
  const dataArray = new Uint8Array(bufferLength);

  analysisInterval = setInterval(() => {
    if (!analyser) return;
    analyser.getByteTimeDomainData(dataArray);
    let maxAmplitude = 0;
    for (let i = 0; i < bufferLength; i++) {
      const amplitude = Math.abs(dataArray[i] - 128);
      if (amplitude > maxAmplitude) maxAmplitude = amplitude;
    }
    const scaled = (maxAmplitude / 128) * 255;
    const now = Date.now();
    if (now - lastAmplitudeSent > 60) {
      lastAmplitudeSent = now;
      chrome.runtime.sendMessage({ type: "AMPLITUDE", value: scaled }).catch(() => {});
    }
    detectClap(scaled);
  }, CONFIG.ANALYSIS_INTERVAL_MS);
}

function stopListening(): void {
  if (!isListening) return;
  isListening = false;
  if (analysisInterval) {
    clearInterval(analysisInterval);
    analysisInterval = null;
  }
}

function detectClap(amplitude: number): void {
  const now = Date.now();
  if (now - lastClapTime < CONFIG.COOLDOWN_MS) return;

  if (waitingForSilence) {
    if (amplitude < CONFIG.BASELINE_THRESHOLD) waitingForSilence = false;
    return;
  }

  if (!waitingForDecay) {
    if (amplitude >= CONFIG.AMPLITUDE_THRESHOLD) {
      spikeStartTime = now;
      spikeSampleCount = 1;
      waitingForDecay = true;
    }
    return;
  }

  const spikeDuration = now - (spikeStartTime ?? now);
  if (amplitude < CONFIG.BASELINE_THRESHOLD) {
    if (spikeDuration <= CONFIG.MAX_IMPULSE_DURATION_MS && spikeSampleCount >= CONFIG.MIN_SPIKE_SAMPLES) {
      confirmClap(now);
    }
    resetSpikeTracking();
  } else if (spikeDuration > CONFIG.MAX_IMPULSE_DURATION_MS) {
    resetSpikeTracking();
    waitingForSilence = true;
  } else if (amplitude >= CONFIG.AMPLITUDE_THRESHOLD) {
    spikeSampleCount++;
  }
}

function resetSpikeTracking(): void {
  spikeStartTime = null;
  spikeSampleCount = 0;
  waitingForDecay = false;
}

function confirmClap(now: number): void {
  lastClapTime = now;
  clapCount++;
  if (clapTimer) clearTimeout(clapTimer);
  clapTimer = setTimeout(() => {
    chrome.runtime.sendMessage({ type: "CLAP_DETECTED", count: clapCount });
    clapCount = 0;
  }, CONFIG.MULTI_CLAP_WINDOW_MS);
}

chrome.runtime.onMessage.addListener((message: ToOffscreen, _sender, sendResponse) => {
  switch (message.type) {
    case "START_LISTENING":
      if (audioContext) {
        startListening();
        sendResponse({ success: true });
      } else {
        void initAudio(message.deviceId).then(() => sendResponse({ success: true }));
      }
      return true;
    case "STOP_LISTENING":
      stopListening();
      sendResponse({ success: true });
      break;
    case "RESTART_LISTENING":
      stopListening();
      if (audioContext) {
        void audioContext.close();
        audioContext = null;
        analyser = null;
      }
      void initAudio(message.deviceId).then(() => sendResponse({ success: true }));
      return true;
    case "GET_STATUS":
      sendResponse({ isListening, hasAudioContext: !!audioContext });
      break;
    case "UPDATE_CONFIG":
      Object.assign(CONFIG, message.config);
      sendResponse({ success: true });
      break;
  }
  return undefined;
});
