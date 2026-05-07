<template>
  <div class="h-full w-full bg-gray-800/80 backdrop-blur-md rounded-xl border border-gray-700/50 shadow-xl overflow-y-auto p-4 custom-scrollbar text-sm text-gray-300">
    <h2 class="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
      <svg class="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Drone Information
    </h2>

    <div v-if="Object.keys(store.drones).length === 0" class="text-gray-500 italic">
      No data loaded.
    </div>
    
    <div v-else class="space-y-6">
      <div v-for="(drone, droneId) in store.drones" :key="droneId" class="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
        <h3 class="text-md font-bold text-indigo-300 mb-3 border-b border-gray-700 pb-2">
          {{ droneId }}
        </h3>
        
        <div v-if="drone.git_ver" class="mb-4">
          <span class="text-gray-500 text-xs font-semibold uppercase tracking-wider">Git Version</span>
          <div class="mt-1 font-mono text-xs bg-gray-950 p-2 rounded text-green-400 border border-gray-800 break-all">
            {{ drone.git_ver }}
          </div>
        </div>

        <div v-if="drone.args && Object.keys(drone.args).length > 0">
          <span class="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 block">Arguments</span>
          <div class="grid grid-cols-1 xl:grid-cols-2 gap-x-6 gap-y-2">
            <div v-for="(value, key) in drone.args" :key="key" class="flex justify-between border-b border-gray-800/50 py-1">
              <span class="text-gray-400 font-mono text-xs">{{ key }}</span>
              <span class="text-gray-200 text-xs text-right break-words max-w-[50%]">
                {{ formatValue(value) }}
              </span>
            </div>
          </div>
        </div>
        <div v-else class="text-xs text-gray-600 italic">No arguments found.</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { store } from '../store';

const formatValue = (val) => {
  if (val === null) return 'null';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (Array.isArray(val) || typeof val === 'object') return JSON.stringify(val);
  return String(val);
};
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 4px;
}
</style>
