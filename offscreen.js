/**
 * Wave Remote - Offscreen Audio Processor
 * 
 * This script runs in an offscreen document to access the microphone
 * and detect acoustic impulses (claps/snaps) using the Web Audio API.
 */

// CONFIGURATION
const CONFIG = {
  // High-pass filter frequency (Hz) - filters out low rumble/noise
  HIGH_PASS_FREQUENCY: 2000,

  // Amplitude threshold to detect a clap (0-255 range from AnalyserNode)
  AMPLITUDE_THRESHOLD: 200,

  // Cooldown period after detecting a clap (ms) - prevents double triggers
  COOLDOWN_MS: 300,

  // Time window to count multiple claps (ms)
  MULTI_CLAP_WINDOW_MS: 600,

  // How often to analyze audio (ms)
  ANALYSIS_INTERVAL_MS: 50,

  // FFT size for the analyser (power of 2)
  FFT_SIZE: 256
};

// STATE
let audioContext = null;
let analyser = null;
let isListening = false;
let lastClapTime = 0;
let clapCount = 0;
let clapTimer = null;
let analysisInterval = null;

// AUDIO PIPELINE SETUP

/**
 * Initialize the audio processing pipeline
 */
async function initAudio() {
  try {
    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });

    // Create audio context
    audioContext = new AudioContext();

    // Create source from microphone stream
    const source = audioContext.createMediaStreamSource(stream);

    // Create high-pass filter to remove low-frequency noise
    const highPassFilter = audioContext.createBiquadFilter();
    highPassFilter.type = 'highpass';
    highPassFilter.frequency.value = CONFIG.HIGH_PASS_FREQUENCY;
    highPassFilter.Q.value = 1;

    // Create analyser node for amplitude detection
    analyser = audioContext.createAnalyser();
    analyser.fftSize = CONFIG.FFT_SIZE;
    analyser.smoothingTimeConstant = 0.3;

    // Connect the pipeline: Microphone → High-Pass Filter → Analyser
    source.connect(highPassFilter);
    highPassFilter.connect(analyser);

    console.log('[Wave Remote] Audio pipeline initialized');

    // Start listening for claps
    startListening();

    // Notify background
    chrome.runtime.sendMessage({
      type: 'OFFSCREEN_READY',
      status: 'listening'
    });

  } catch (error) {
    console.error('[Wave Remote] Failed to initialize audio:', error);
    chrome.runtime.sendMessage({
      type: 'OFFSCREEN_ERROR',
      error: error.message
    });
  }
}

// CLAP DETECTION

/**
 * Start the audio analysis loop
 */
function startListening() {
  if (isListening) return;
  isListening = true;

  // Create buffer for time-domain data
  const bufferLength = analyser.fftSize;
  const dataArray = new Uint8Array(bufferLength);

  // Analysis loop
  analysisInterval = setInterval(() => {
    // Get time-domain waveform data
    analyser.getByteTimeDomainData(dataArray);

    // Find the peak amplitude (deviation from silence at 128)
    let maxAmplitude = 0;
    for (let i = 0; i < bufferLength; i++) {
      const amplitude = Math.abs(dataArray[i] - 128);
      if (amplitude > maxAmplitude) {
        maxAmplitude = amplitude;
      }
    }

    // Scale to 0-255 range (128 is the max deviation from center)
    const scaledAmplitude = (maxAmplitude / 128) * 255;

    // Check if this is a clap
    detectClap(scaledAmplitude);

  }, CONFIG.ANALYSIS_INTERVAL_MS);

  console.log('[Wave Remote] Started listening for claps');
}

/**
 * Stop the audio analysis loop
 */
function stopListening() {
  if (!isListening) return;
  isListening = false;

  if (analysisInterval) {
    clearInterval(analysisInterval);
    analysisInterval = null;
  }

  console.log('[Wave Remote] Stopped listening');
}

/**
 * Detect a clap based on amplitude spike
 */
function detectClap(amplitude) {
  const now = Date.now();

  // Check cooldown period
  if (now - lastClapTime < CONFIG.COOLDOWN_MS) {
    return;
  }

  // Check if amplitude exceeds threshold
  if (amplitude >= CONFIG.AMPLITUDE_THRESHOLD) {
    lastClapTime = now;
    clapCount++;

    console.log(`[Wave Remote] Clap detected! Count: ${clapCount}, Amplitude: ${amplitude.toFixed(0)}`);

    // Clear any existing timer
    if (clapTimer) {
      clearTimeout(clapTimer);
    }

    // Set timer to finalize clap count
    clapTimer = setTimeout(() => {
      sendClapCommand(clapCount);
      clapCount = 0;
    }, CONFIG.MULTI_CLAP_WINDOW_MS);
  }
}

/**
 * Send the clap command to the background script
 */
function sendClapCommand(count) {
  console.log(`[Wave Remote] Sending command for ${count} clap(s)`);

  chrome.runtime.sendMessage({
    type: 'CLAP_DETECTED',
    count: count
  });
}

// MESSAGE HANDLING

/**
 * Listen for messages from background script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Wave Remote] Received message:', message);

  switch (message.type) {
    case 'START_LISTENING':
      if (audioContext) {
        startListening();
        sendResponse({ success: true });
      } else {
        initAudio().then(() => sendResponse({ success: true }));
      }
      return true; // Async response

    case 'STOP_LISTENING':
      stopListening();
      sendResponse({ success: true });
      break;

    case 'GET_STATUS':
      sendResponse({
        isListening,
        hasAudioContext: !!audioContext
      });
      break;

    case 'UPDATE_CONFIG':
      // Allow dynamic config updates
      if (message.config) {
        Object.assign(CONFIG, message.config);
        console.log('[Wave Remote] Config updated:', CONFIG);
        sendResponse({ success: true });
      }
      break;
  }
});

// INITIALIZATION

// Auto-start when the offscreen document loads
initAudio();

console.log('[Wave Remote] Offscreen document loaded');
