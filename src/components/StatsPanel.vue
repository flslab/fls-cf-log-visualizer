<template>
  <div class="h-full w-full bg-zinc-800/80 rounded-xl border border-zinc-700/50 p-4 overflow-y-auto flex flex-col shadow-xl text-sm relative">    
    <div class="flex justify-between items-center mb-4">
      <h3 class="font-semibold">Statistics</h3>
      <div class="text-xs text-zinc-500">
        {{ (timeWindow.start - store.minTime).toFixed(2) }}s - {{ (timeWindow.end - store.minTime).toFixed(2) }}s
      </div>
    </div>
    
    <div v-if="stats.length === 0" class="text-zinc-500 text-center mt-4">
      No data available in the selected time range.
    </div>

    <div class="space-y-4">
      <div v-for="stat in stats" :key="stat.name" class="bg-zinc-900 rounded-lg p-3 border border-zinc-700/50">
        <div class="flex items-center gap-2 mb-2">
          <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: stat.color }"></div>
          <div class="font-mono text-zinc-300 truncate font-semibold" :title="stat.name">{{ stat.name }}</div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs font-mono">
          <div class="flex justify-between items-center bg-zinc-800/50 px-2 py-1 rounded">
            <span class="text-zinc-500">Min</span>
            <span class="text-zinc-200">{{ stat.min.toFixed(4) }}</span>
          </div>
          <div class="flex justify-between items-center bg-zinc-800/50 px-2 py-1 rounded">
            <span class="text-zinc-500">Max</span>
            <span class="text-zinc-200">{{ stat.max.toFixed(4) }}</span>
          </div>
          <div class="flex justify-between items-center bg-zinc-800/50 px-2 py-1 rounded">
            <span class="text-zinc-500">Avg</span>
            <span class="text-zinc-200">{{ stat.avg.toFixed(4) }}</span>
          </div>
          <div class="flex justify-between items-center bg-zinc-800/50 px-2 py-1 rounded">
            <span class="text-zinc-500">Std</span>
            <span class="text-zinc-200">{{ stat.std.toFixed(4) }}</span>
          </div>
          <div class="flex justify-between items-center bg-zinc-800/50 px-2 py-1 rounded col-span-2">
            <span class="text-zinc-500">Data Rate (Hz)</span>
            <span class="text-zinc-200">{{ stat.rate.toFixed(1) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { store } from '../store';

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
    end: pMin + range * endPercent
  };
});

const stats = computed(() => {
  const result = [];
  const { start, end } = timeWindow.value;

  store.selectedParams.forEach(selection => {
    const drone = store.drones[selection.droneId];
    if (!drone) return;
    const param = drone.parameters[selection.paramId];
    if (!param || !param.time || !param.data) return;

    // Filter data within the current time window
    const filteredData = [];
    for (let i = 0; i < param.time.length; i++) {
      if (param.time[i] >= start && param.time[i] <= end) {
        filteredData.push(param.data[i]);
      }
    }

    if (filteredData.length === 0) return;

    let min = Infinity;
    let max = -Infinity;
    let sum = 0;

    for (let i = 0; i < filteredData.length; i++) {
      const val = filteredData[i];
      if (val < min) min = val;
      if (val > max) max = val;
      sum += val;
    }

    const avg = sum / filteredData.length;
    
    let sumSqDiff = 0;
    for (let i = 0; i < filteredData.length; i++) {
      sumSqDiff += Math.pow(filteredData[i] - avg, 2);
    }
    
    const std = Math.sqrt(sumSqDiff / filteredData.length);

    // Calculate rate (points per second)
    const duration = end - start;
    const rate = duration > 0 ? (filteredData.length / duration) : 0;

    result.push({
      name: `${selection.droneId} - ${param.name}`,
      color: selection.color,
      min,
      max,
      avg,
      std,
      rate
    });
  });

  return result;
});
</script>
