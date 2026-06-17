import FFT from 'fft.js';

/**
 * Generate Hanning window coefficients of length N.
 * @param {number} N - Window length
 * @returns {Float64Array}
 */
export function hanning(N) {
  const w = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
  }
  return w;
}

/**
 * Compute amplitude and energy correction factors for a window function.
 * - amplitude: corrects for the mean of the window (coherent gain)
 * - energy: corrects for RMS of the window (incoherent gain / power)
 * @param {Float64Array} window
 * @returns {{ amplitude: number, energy: number }}
 */
export function windowCorrectionFactors(window) {
  const N = window.length;
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < N; i++) {
    sum += window[i];
    sumSq += window[i] * window[i];
  }
  return {
    amplitude: N / sum,
    energy: Math.sqrt(N / sumSq),
  };
}

/**
 * Estimate the sample rate from a time array.
 * Uses the median of consecutive differences to be robust to jitter/gaps.
 * @param {number[]} timeArray - Timestamps in seconds
 * @returns {number} Sample rate in Hz
 */
export function computeSampleRate(timeArray) {
  if (timeArray.length < 2) return 0;

  const diffs = [];
  for (let i = 1; i < timeArray.length; i++) {
    const dt = timeArray[i] - timeArray[i - 1];
    if (dt > 0) diffs.push(dt);
  }

  if (diffs.length === 0) return 0;

  const sum = diffs.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
  const meanDt = sum / diffs.length;
  return 1.0 / meanDt;
}

/**
 * Compute the one-sided frequency bins for an FFT of length N at sample rate fs.
 * @param {number} N - FFT size (window size)
 * @param {number} fs - Sample rate in Hz
 * @returns {Float64Array} Frequency bins from 0 to fs/2
 */
export function rfftFrequencies(N, fs) {
  const numBins = Math.floor(N / 2) + 1;
  const freqs = new Float64Array(numBins);
  for (let i = 0; i < numBins; i++) {
    freqs[i] = (i * fs) / N;
  }
  return freqs;
}

/**
 * Compute the magnitude of a complex FFT output (interleaved real/imag).
 * Returns one-sided spectrum (bins 0..N/2).
 * @param {number[]} complexOut - Interleaved [re0, im0, re1, im1, ...]
 * @param {number} N - FFT size
 * @returns {Float64Array} Magnitude for each frequency bin
 */
function computeMagnitude(complexOut, N) {
  const numBins = Math.floor(N / 2) + 1;
  const mag = new Float64Array(numBins);
  for (let i = 0; i < numBins; i++) {
    const re = complexOut[2 * i];
    const im = complexOut[2 * i + 1];
    mag[i] = Math.sqrt(re * re + im * im);
  }
  return mag;
}

/**
 * Compute the FFT of a time-domain signal with windowed, overlapping segments.
 *
 * @param {number[]} timeArray - Timestamps (seconds)
 * @param {number[]} dataArray - Signal values
 * @param {number} windowSize - FFT window size (must be power of 2)
 * @returns {{ frequencies: Float64Array, magnitudes: Float64Array, sampleRate: number, dominantFreq: number, rmsVibration: number } | null}
 */
export function computeFFT(timeArray, dataArray, windowSize = 1024) {
  if (!timeArray || !dataArray || dataArray.length < windowSize) {
    return null;
  }

  // Validate power of 2
  if ((windowSize & (windowSize - 1)) !== 0) {
    console.error('FFT window size must be a power of 2');
    return null;
  }

  const sampleRate = computeSampleRate(timeArray);
  if (sampleRate <= 0) return null;

  const N = windowSize;
  const overlap = 0.5;
  const step = Math.round(N * (1 - overlap));
  const win = hanning(N);
  const correction = windowCorrectionFactors(win);

  const fft = new FFT(N);
  const numBins = Math.floor(N / 2) + 1;

  // Accumulator for averaging
  const magSum = new Float64Array(numBins);
  let windowCount = 0;

  // Slide through the data with overlap
  for (let start = 0; start + N <= dataArray.length; start += step) {
    // Apply window and prepare real input
    const input = fft.createComplexArray();
    for (let i = 0; i < N; i++) {
      input[2 * i] = dataArray[start + i] * win[i];
      input[2 * i + 1] = 0;
    }

    // Forward FFT
    const out = fft.createComplexArray();
    fft.transform(out, input);

    // Accumulate magnitude
    const mag = computeMagnitude(out, N);
    for (let i = 0; i < numBins; i++) {
      magSum[i] += mag[i];
    }
    windowCount++;
  }

  if (windowCount === 0) return null;

  // Average and apply corrections
  // Scale: 2/N for one-sided spectrum, then energy correction
  const scale = (2.0 / N) * correction.energy;
  const magnitudes = new Float64Array(numBins);
  for (let i = 0; i < numBins; i++) {
    magnitudes[i] = (magSum[i] / windowCount) * scale;
  }
  // DC and Nyquist bins are not doubled
  magnitudes[0] /= 2.0;
  if (numBins > 1) {
    magnitudes[numBins - 1] /= 2.0;
  }

  const frequencies = rfftFrequencies(N, sampleRate);

  // Find dominant frequency (skip DC bin at index 0)
  let maxMag = -Infinity;
  let dominantIdx = 1;
  for (let i = 1; i < numBins; i++) {
    if (magnitudes[i] > maxMag) {
      maxMag = magnitudes[i];
      dominantIdx = i;
    }
  }
  const dominantFreq = frequencies[dominantIdx];

  // RMS of the signal in frequency domain (Parseval's theorem)
  let sumSq = 0;
  for (let i = 0; i < numBins; i++) {
    sumSq += magnitudes[i] * magnitudes[i];
  }
  const rmsVibration = Math.sqrt(sumSq);

  return {
    frequencies,
    magnitudes,
    sampleRate,
    dominantFreq,
    rmsVibration,
  };
}

/**
 * Convert linear amplitude to decibels (dB).
 * @param {Float64Array} magnitudes
 * @returns {Float64Array}
 */
export function toDecibels(magnitudes) {
  const db = new Float64Array(magnitudes.length);
  for (let i = 0; i < magnitudes.length; i++) {
    db[i] = magnitudes[i] > 0 ? 20 * Math.log10(magnitudes[i]) : -120;
  }
  return db;
}
