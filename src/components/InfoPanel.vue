<template>
  <div class="h-full w-full bg-zinc-800/80 rounded-xl border border-zinc-700/50 shadow-xl overflow-y-auto p-4 text-sm text-zinc-300">
    <h3 class="font-semibold text-zinc-100 mb-4 flex items-center gap-2">
      Controller Configurations
    </h3>

    <div v-if="Object.keys(store.drones).length === 0" class="text-zinc-500 italic">
      No data loaded.
    </div>
    
    <div v-else class="space-y-6">
      <div v-for="(drone, droneId) in store.drones" :key="droneId" class="bg-zinc-900 rounded-lg p-4 border border-zinc-700/50">
        <h3 class="text-md font-bold text-teal-300 mb-3 border-b border-zinc-700 pb-2">
          {{ droneId }}
        </h3>
        
        <div v-if="drone.git_ver" class="mb-4">
          <span class="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Git Version</span>
          <div class="mt-1 font-mono text-xs bg-zinc-950 p-2 rounded text-green-400 border border-zinc-800 break-all">
            {{ drone.git_ver }}
          </div>
        </div>

        <div v-if="drone.args && Object.keys(drone.args).length > 0">
          <span class="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2 block">Arguments</span>
          <div class="grid grid-cols-1 gap-x-6 gap-y-2">
            <div v-for="(value, key) in drone.args" :key="key" class="flex justify-between border-b border-zinc-800/50 py-1">
              <span class="text-zinc-400 font-mono text-xs break-words">{{ key }}</span>
              <span class="text-zinc-200 text-xs text-right break-words max-w-[60%]">
                {{ formatValue(value) }}
              </span>
            </div>
          </div>
        </div>
        <div v-else class="text-xs text-zinc-600 italic">No arguments found.</div>
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
