<template>
  <div class="h-full w-full bg-zinc-800/80 rounded-xl border border-zinc-700/50 p-4 overflow-y-auto flex flex-col shadow-xl text-sm relative">
    <div class="flex justify-between items-center mb-4">
      <h3 class="font-semibold">Scale & Offset</h3>
      <div class="text-xs text-zinc-500">Per-series multiplier and addition</div>
    </div>

    <div v-if="store.selectedParams.length === 0" class="text-zinc-500 text-center mt-4">
      Select a parameter to apply a scaling factor or offset.
    </div>

    <div v-else class="space-y-3">
      <div v-for="selection in store.selectedParams" :key="`${selection.droneId}-${selection.paramId}`" class="bg-zinc-900 rounded-lg p-3 border border-zinc-700/50">
        <div class="flex items-center gap-2 mb-2">
          <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: selection.color }"></div>
          <div class="font-mono text-zinc-300 truncate font-semibold" :title="getLabel(selection)">{{ getLabel(selection) }}</div>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-zinc-500 text-xs">×</span>
          <input
            :value="getScale(selection)"
            type="number"
            step="0.1"
            class="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 focus:outline-none focus:border-teal-500"
            @input="setScale(selection, $event.target.value)"
            title="Scale Multiplier"
          />
          <span class="text-zinc-500 text-xs">+</span>
          <input
            :value="getOffset(selection)"
            type="number"
            step="0.1"
            class="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 focus:outline-none focus:border-teal-500"
            @input="setOffset(selection, $event.target.value)"
            title="Offset Addition"
          />
          <button
            class="text-xs px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200"
            @click="resetScale(selection)"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { store } from '../store';

const getLabel = (selection) => {
  const drone = store.drones[selection.droneId];
  if (!drone) return selection.paramId;
  const param = drone.parameters?.[selection.paramId];
  return param ? `${selection.droneId} - ${param.name}` : `${selection.droneId} - ${selection.paramId}`;
};

const getScale = (selection) => {
  return store.getSelectionScale(selection.droneId, selection.paramId);
};

const setScale = (selection, value) => {
  const parsed = Number(value);
  selection.scale = Number.isFinite(parsed) ? parsed : 1;
};

const getOffset = (selection) => {
  return store.getSelectionOffset(selection.droneId, selection.paramId);
};

const setOffset = (selection, value) => {
  const parsed = Number(value);
  selection.offset = Number.isFinite(parsed) ? parsed : 0;
};

const resetScale = (selection) => {
  selection.scale = 1;
  selection.offset = 0;
};
</script>
