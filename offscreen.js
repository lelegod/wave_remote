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

  // Amplitude threshold to detect a potential clap (0-255 range)
  AMPLITUDE_THRESHOLD: 50,

  // Cooldown period after detecting a clap (ms) - prevents double triggers
  COOLDOWN_MS: 120,

  // Time window to count multiple claps (ms)
  MULTI_CLAP_WINDOW_MS: 600,

  // How often to analyze audio (ms)
  ANALYSIS_INTERVAL_MS: 20,  // Faster for better impulse detection

  // FFT size for the analyser (power of 2)
  FFT_SIZE: 256,

  // === IMPULSE DETECTION ===
  // Baseline threshold - amplitude must be below this to "reset" for next clap
  BASELINE_THRESHOLD: 10,

  // Max time (ms) for amplitude to drop back to baseline after spike
  MAX_IMPULSE_DURATION_MS: 250,

  // Minimum samples above threshold to confirm it's not just noise
  MIN_SPIKE_SAMPLES: 1
};

// STATE
let audioContext = null;
let analyser = null;
let isListening = false;
let lastClapTime = 0;
let clapCount = 0;
let clapTimer = null;
let analysisInterval = null;

// Impulse detection state
let spikeStartTime = null;
let spikeSampleCount = 0;
let lastAmplitude = 0;
let waitingForDecay = false;
let waitingForSilence = false;  // After rejecting, wait for silence

// AUDIO PIPELINE SETUP

/**
 * Initialize the audio processing pipeline
 * @param {string} deviceId - Optional specific microphone device ID
 */
async function initAudio(deviceId = null) {
  try {
    console.log('[Wave Remote] Initializing audio with deviceId:', deviceId);

    // Build audio constraints
    const audioConstraints = {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false
    };

    // Use specific device if provided
    if (deviceId) {
      audioConstraints.deviceId = { ideal: deviceId };
    }

    console.log('[Wave Remote] Requesting microphone with constraints:', audioConstraints);

    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints
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
    console.error('[Wave Remote] Failed to initialize audio:', error.name, error.message);
    chrome.runtime.sendMessage({
      type: 'OFFSCREEN_ERROR',
      error: `${error.name}: ${error.message}`
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
 * Detect a clap based on amplitude spike with impulse validation.
 * A valid clap must:
 * 1. Exceed AMPLITUDE_THRESHOLD
 * 2. Drop back below BASELINE_THRESHOLD within MAX_IMPULSE_DURATION_MS
 * 
 * This filters out sustained sounds like fork rings or slurping.
 */
function detectClap(amplitude) {
  const now = Date.now();

  // Check cooldown period
  if (now - lastClapTime < CONFIG.COOLDOWN_MS) {
    lastAmplitude = amplitude;
    return;
  }

  // Waiting for silence after rejecting sustained sound
  if (waitingForSilence) {
    if (amplitude < CONFIG.BASELINE_THRESHOLD) {
      waitingForSilence = false;
      console.log('[Wave Remote] Silence detected, ready for next clap');
    }
    lastAmplitude = amplitude;
    return;
  }

  // Waiting for the first spike
  if (!waitingForDecay) {
    if (amplitude >= CONFIG.AMPLITUDE_THRESHOLD) {
      // Spike detected! Start tracking
      spikeStartTime = now;
      spikeSampleCount = 1;
      waitingForDecay = true;
      console.log(`[Wave Remote] Spike started, amplitude: ${amplitude.toFixed(0)}`);
    }
  }
  // Tracking a spike, waiting for it to decay
  else {
    const spikeDuration = now - spikeStartTime;

    // Check if amplitude has dropped back to baseline
    if (amplitude < CONFIG.BASELINE_THRESHOLD) {
      // Sound decayed quickly
      if (spikeDuration <= CONFIG.MAX_IMPULSE_DURATION_MS &&
        spikeSampleCount >= CONFIG.MIN_SPIKE_SAMPLES) {
        confirmClap(now);
      } else {
        console.log(`[Wave Remote] Spike rejected: too few samples (${spikeSampleCount})`);
      }
      resetSpikeTracking();
    }
    // Check if sound has been too long (not an impulse)
    else if (spikeDuration > CONFIG.MAX_IMPULSE_DURATION_MS) {
      console.log(`[Wave Remote] Rejected: sustained sound (${spikeDuration}ms > ${CONFIG.MAX_IMPULSE_DURATION_MS}ms)`);
      resetSpikeTracking();
      // Wait for silence before detecting again
      waitingForSilence = true;
    }
    else {
      if (amplitude >= CONFIG.AMPLITUDE_THRESHOLD) {
        spikeSampleCount++;
      }
    }
  }

  lastAmplitude = amplitude;
}

/**
 * Reset spike tracking state
 */
function resetSpikeTracking() {
  spikeStartTime = null;
  spikeSampleCount = 0;
  waitingForDecay = false;
}

/**
 * Confirm a valid clap and update counters
 */
function confirmClap(now) {
  lastClapTime = now;
  clapCount++;

  console.log(`[Wave Remote] ✓ Clap confirmed! Count: ${clapCount}`);

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
        // Pass deviceId if provided
        initAudio(message.deviceId).then(() => sendResponse({ success: true }));
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

console.log('[Wave Remote] Offscreen document loaded (waiting for start command)');
