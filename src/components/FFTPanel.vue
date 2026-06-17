<template>
  <div class="h-full w-full overflow-hidden flex flex-col p-2">
    <!-- Controls Bar -->
    <div class="flex items-center justify-between mb-2 px-2 shrink-0">
      <div class="flex items-center space-x-3">
        <h3 class="text-sm font-semibold text-zinc-300">Frequency Spectrum</h3>
        <div class="h-4 w-px bg-zinc-700"></div>
        
        <!-- Window Size Selector -->
        <div class="flex items-center space-x-1.5">
          <span class="text-xs text-zinc-500">Window:</span>
          <select 
            :value="store.fftWindowSize"
            @change="store.setFFTWindowSize(Number($event.target.value))"
            class="bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5 text-xs text-zinc-300 focus:outline-none focus:border-teal-500 cursor-pointer"
          >
            <option :value="256">256</option>
            <option :value="512">512</option>
            <option :value="1024">1024</option>
            <option :value="2048">2048</option>
            <option :value="4096">4096</option>
          </select>
        </div>

        <div class="h-4 w-px bg-zinc-700"></div>

        <!-- dB / Linear Toggle -->
        <button
          @click="store.toggleFFTScaleLog()"
          class="px-2 py-0.5 rounded text-xs transition-colors"
          :class="store.fftScaleLog 
            ? 'bg-teal-900/60 text-teal-300 hover:bg-teal-800/60' 
            : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'"
          title="Toggle dB / Linear scale"
        >
          {{ store.fftScaleLog ? 'dB' : 'Linear' }}
        </button>

        <div class="h-4 w-px bg-zinc-700"></div>

        <!-- Overlay / Stack Toggle -->
        <button
          @click="store.toggleFFTStackMode()"
          class="px-2 py-0.5 rounded text-xs transition-colors flex items-center space-x-1"
          :class="store.fftStackMode 
            ? 'bg-teal-900/60 text-teal-300 hover:bg-teal-800/60' 
            : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'"
          :title="store.fftStackMode ? 'Stacked view — click to overlay' : 'Overlay view — click to stack'"
        >
          <svg v-if="!store.fftStackMode" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <svg v-else class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          <span>{{ store.fftStackMode ? 'Stacked' : 'Overlay' }}</span>
        </button>
      </div>

      <div class="text-xs text-zinc-500 font-mono">
        {{ fftSummaryText }}
      </div>
    </div>

    <!-- No data state -->
    <div v-if="store.selectedParams.length === 0" class="flex-1 flex items-center justify-center text-zinc-500">
      Select parameters from the sidebar to analyze frequency spectrum.
    </div>
    <div v-else-if="fftResults.length === 0" class="flex-1 flex items-center justify-center text-zinc-500">
      <div class="text-center space-y-2">
        <svg class="w-10 h-10 mx-auto text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <p>Insufficient data for FFT (need at least {{ store.fftWindowSize }} samples).</p>
        <p class="text-xs">Try reducing the window size or selecting parameters with more data points.</p>
      </div>
    </div>

    <!-- Chart -->
    <v-chart 
      v-else
      class="w-full flex-1" 
      :option="chartOption" 
      :update-options="{ notMerge: true }"
      autoresize
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DataZoomComponent,
  LegendComponent,
} from 'echarts/components';
import VChart from 'vue-echarts';
import { store } from '../store';
import { computeFFT, toDecibels } from '../services/FFTService';

use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DataZoomComponent,
  LegendComponent,
]);

/**
 * Convert an HSL or hex color string to one with a specified alpha.
 * Handles: hsl(h, s%, l%), #rrggbb, #rgb
 */
function colorWithAlpha(color, alpha) {
  if (!color) return `rgba(128,128,128,${alpha})`;
  // HSL format
  const hslMatch = color.match(/^hsl\(([^)]+)\)$/i);
  if (hslMatch) {
    return `hsla(${hslMatch[1]}, ${alpha})`;
  }
  // Hex format
  if (color.startsWith('#')) {
    let r, g, b;
    if (color.length === 4) {
      r = parseInt(color[1] + color[1], 16);
      g = parseInt(color[2] + color[2], 16);
      b = parseInt(color[3] + color[3], 16);
    } else {
      r = parseInt(color.slice(1, 3), 16);
      g = parseInt(color.slice(3, 5), 16);
      b = parseInt(color.slice(5, 7), 16);
    }
    return `rgba(${r},${g},${b},${alpha})`;
  }
  // Fallback: return as-is (rgb, rgba, named colors)
  return color;
}

/**
 * Compute the visible time window from store state (same logic as StatsPanel).
 */
const timeWindow = computed(() => {
  let pMin = Infinity;
  let pMax = -Infinity;

  store.selectedParams.forEach(selection => {
    const drone = store.drones[selection.droneId];
    if (!drone) return;
    const param = drone.parameters[selection.paramId];
    if (param && param.time && param.time.length > 0) {
      pMin = Math.min(pMin, param.time[0]);
      pMax = Math.max(pMax, param.time[param.time.length - 1]);
    }
  });

  if (pMin === Infinity) pMin = store.minTime;
  if (pMax === -Infinity) pMax = store.maxTime || 0;

  const range = pMax - pMin;
  if (range <= 0) return { start: pMin, end: pMax };

  const startPercent = store.timeRangePercent[0] / 100;
  const endPercent = store.timeRangePercent[1] / 100;

  return {
    start: pMin + range * startPercent,
    end: pMin + range * endPercent,
  };
});

/**
 * Filter data to the visible time window and run FFT for each selected parameter.
 */
const fftResults = computed(() => {
  const results = [];
  const { start, end } = timeWindow.value;
  const windowSize = store.fftWindowSize;

  store.selectedParams.forEach(selection => {
    const drone = store.drones[selection.droneId];
    if (!drone) return;
    const param = drone.parameters[selection.paramId];
    if (!param || !param.time || !param.data) return;
    // Skip pseudo-parameters (commands, events)
    if (param.isCommandGroup || param.isEventGroup || param.isCommandArg) return;

    // Filter to visible time window
    const filteredTime = [];
    const filteredData = [];
    for (let i = 0; i < param.time.length; i++) {
      if (param.time[i] >= start && param.time[i] <= end) {
        filteredTime.push(param.time[i]);
        filteredData.push(param.data[i]);
      }
    }

    if (filteredData.length < windowSize) return;

    const result = computeFFT(filteredTime, filteredData, windowSize);
    if (!result) return;

    results.push({
      name: `${selection.droneId} - ${param.name}`,
      color: selection.color,
      ...result,
    });
  });

  return results;
});

const fftSummaryText = computed(() => {
  if (fftResults.value.length === 0) return '';
  const r = fftResults.value[0];
  return `Fs: ${r.sampleRate.toFixed(0)} Hz · Bins: ${r.frequencies.length} · Δf: ${(r.sampleRate / store.fftWindowSize).toFixed(1)} Hz`;
});

/**
 * Build ECharts option for the frequency spectrum.
 */
const chartOption = computed(() => {
  const results = fftResults.value;
  if (results.length === 0) return {};

  const isStacked = store.fftStackMode;
  const isLog = store.fftScaleLog;

  if (isStacked) {
    return buildStackedOption(results, isLog);
  } else {
    return buildOverlayOption(results, isLog);
  }
});

function buildOverlayOption(results, isLog) {
  const series = [];
  const legendData = [];

  results.forEach(r => {
    const mags = isLog ? toDecibels(r.magnitudes) : r.magnitudes;
    const data = [];
    for (let i = 0; i < r.frequencies.length; i++) {
      data.push([r.frequencies[i], mags[i]]);
    }

    legendData.push(r.name);
    series.push({
      name: r.name,
      type: 'line',
      showSymbol: false,
      data: data,
      lineStyle: { color: r.color, width: 1.5 },
      itemStyle: { color: r.color },
      // areaStyle: {
      //   color: {
      //     type: 'linear',
      //     x: 0, y: 0, x2: 0, y2: 1,
      //     colorStops: [
      //       { offset: 0, color: colorWithAlpha(r.color, 0.19) },
      //       { offset: 1, color: colorWithAlpha(r.color, 0.02) }
      //     ]
      //   }
      // },
    });
  });

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: (params) => {
        if (!params || params.length === 0) return '';
        let html = `<div style="font-size:12px;"><b>${params[0].data[0].toFixed(1)} Hz</b><br/>`;
        params.forEach(p => {
          const val = isLog ? `${p.data[1].toFixed(1)} dB` : p.data[1].toFixed(4);
          html += `<span style="color:${p.color};">●</span> ${p.seriesName}: ${val}<br/>`;
        });
        html += '</div>';
        return html;
      },
    },
    legend: {
      data: legendData,
      textStyle: { color: '#ccc', fontSize: 11 },
      type: 'scroll',
      top: 0,
      left: 'center',
    },
    grid: {
      left: '60',
      right: '50',
      top: '40',
      bottom: '50',
    },
    xAxis: {
      type: 'value',
      name: 'Frequency (Hz)',
      nameTextStyle: { color: '#888', fontSize: 11 },
      axisLine: { lineStyle: { color: '#555' } },
      splitLine: { lineStyle: { color: '#2a2a2a' } },
      axisLabel: { color: '#aaa', fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      name: isLog ? 'Amplitude (dB)' : 'Amplitude',
      nameTextStyle: { color: '#888', fontSize: 11 },
      axisLine: { lineStyle: { color: '#555' } },
      splitLine: { lineStyle: { color: '#2a2a2a' } },
      axisLabel: { color: '#aaa', fontSize: 10 },
    },
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0,
        filterMode: 'none',
      },
      {
        type: 'slider',
        xAxisIndex: 0,
        filterMode: 'none',
        bottom: 10,
        textStyle: { color: '#ccc' },
      },
    ],
    series: series,
    animation: false,
  };
}

function buildStackedOption(results, isLog) {
  const series = [];
  const legendData = [];
  const grids = [];
  const xAxes = [];
  const yAxes = [];
  const dataZooms = [];

  const count = results.length;

  results.forEach((r, idx) => {
    const mags = isLog ? toDecibels(r.magnitudes) : r.magnitudes;
    const data = [];
    for (let i = 0; i < r.frequencies.length; i++) {
      data.push([r.frequencies[i], mags[i]]);
    }

    legendData.push(r.name);

    // Calculate grid position: evenly divide the usable vertical space
    const usableTop = 5;      // % from top (leave room for legend)
    const usableBottom = 10;   // % from bottom (leave room for slider)
    const usable = 100 - usableTop - usableBottom;
    const chartHeight = usable / count;
    const chartTop = usableTop + idx * chartHeight;

    grids.push({
      left: '60',
      right: '50',
      top: `${chartTop}%`,
      height: `${chartHeight - 3}%`,
    });

    xAxes.push({
      type: 'value',
      gridIndex: idx,
      name: idx === count - 1 ? 'Frequency (Hz)' : '',
      nameTextStyle: { color: '#888', fontSize: 11 },
      axisLine: { lineStyle: { color: '#555' } },
      splitLine: { lineStyle: { color: '#2a2a2a' } },
      axisLabel: {
        color: '#aaa',
        fontSize: 10,
        show: idx === count - 1,
      },
    });

    yAxes.push({
      type: 'value',
      gridIndex: idx,
      name: r.name,
      nameTextStyle: { color: '#888', fontSize: 9 },
      axisLine: { lineStyle: { color: '#555' } },
      splitLine: { lineStyle: { color: '#2a2a2a' } },
      axisLabel: { color: '#aaa', fontSize: 9 },
    });

    series.push({
      name: r.name,
      type: 'line',
      showSymbol: false,
      xAxisIndex: idx,
      yAxisIndex: idx,
      data: data,
      lineStyle: { color: r.color, width: 1.5 },
      itemStyle: { color: r.color },
      // areaStyle: {
      //   color: {
      //     type: 'linear',
      //     x: 0, y: 0, x2: 0, y2: 1,
      //     colorStops: [
      //       { offset: 0, color: colorWithAlpha(r.color, 0.19) },
      //       { offset: 1, color: colorWithAlpha(r.color, 0.02) }
      //     ]
      //   }
      // },
    });

    // Link all x-axis zooms together
    if (idx === 0) {
      dataZooms.push({
        type: 'inside',
        xAxisIndex: results.map((_, i) => i),
        filterMode: 'none',
      });
      dataZooms.push({
        type: 'slider',
        xAxisIndex: results.map((_, i) => i),
        filterMode: 'none',
        bottom: 10,
        textStyle: { color: '#ccc' },
      });
    }
  });

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
    },
    legend: {
      data: legendData,
      textStyle: { color: '#ccc', fontSize: 11 },
      type: 'scroll',
      top: 0,
      left: 'center',
    },
    grid: grids,
    xAxis: xAxes,
    yAxis: yAxes,
    dataZoom: dataZooms,
    series: series,
    animation: false,
  };
}
</script>
