<template>
  <div class="h-full flex flex-col p-4 bg-zinc-950/10 text-sm overflow-hidden">
    
    <div class="flex items-center space-x-3 mb-6 px-2 shrink-0">
      <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/30 shrink-0">
        <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h1 class="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400 truncate">
        Log Visualizer
      </h1>
    </div>

    <div class="mb-6 space-y-2 shrink-0">
      <button 
        @click="loadDirectory" 
        class="w-full py-2 px-4 bg-teal-600 hover:bg-teal-500 rounded-lg text-white font-medium transition-colors shadow-lg shadow-teal-900/50"
      >
        Browse Log Directory
      </button>
      <button 
        v-if="store.selectedParams.length > 0"
        @click="store.clearSelectedParams()" 
        class="w-full py-2 px-4 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-medium transition-colors border border-zinc-600"
      >
        Clear Plot
      </button>
    </div>

    <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">

      <!-- Videos Section -->
      <div v-if="store.videos.length > 1">
        <h3 class="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Select Video</h3>
        <div class="space-y-1 mb-6">
          <label 
            v-for="video in store.videos" 
            :key="video.name"
            class="flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-zinc-700/50 text-zinc-300"
          >
            <input 
              type="radio" 
              name="videoSelection"
              :checked="store.selectedVideo?.name === video.name"
              @change="store.selectedVideo = video"
              class="rounded-full bg-zinc-900 border-zinc-600 text-teal-500 focus:ring-teal-500/50"
            />
            <span class="truncate">{{ video.name }}</span>
          </label>
        </div>
      </div>

      <!-- Drones Section -->
      <div v-if="Object.keys(store.drones).length > 0">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Drones</h3>
        </div>
        
        <!-- Search Input -->
        <div class="mb-4">
          <input 
            v-model="searchQuery"
            type="text"
            placeholder="Search parameters..."
            class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
          />
        </div>
        
        <div v-for="(drone, droneId) in filteredDrones" :key="droneId" class="mb-4">
          <div 
            class="px-3 py-2 bg-zinc-700/50 rounded-lg flex justify-between items-center cursor-pointer select-none mb-1"
            @click="toggleDrone(droneId)"
          >
            <span class="font-medium text-zinc-200">{{ droneId }}</span>
            <span class="text-zinc-400 text-xs">{{ expanded[droneId] ? '▼' : '▶' }}</span>
          </div>
          
          <div v-show="expanded[droneId]" class="pl-4 space-y-4 mt-2">
            <!-- Group parameters by their root group (e.g., cf_CTRL_ATT_RATE) -->
            <div v-for="(params, groupName) in groupedParams(drone.parameters)" :key="groupName">
              <div class="text-xs font-medium text-zinc-500 mb-1">{{ groupName }}</div>
              <div class="space-y-1">
                <label 
                  v-for="param in params" 
                  :key="param.fullId"
                  class="flex items-center space-x-2 text-zinc-300 hover:text-white cursor-pointer py-1"
                >
                  <input 
                    type="checkbox" 
                    :checked="store.isParamSelected(droneId, param.fullId)"
                    @change="store.toggleParam(droneId, param.fullId)"
                    class="rounded bg-zinc-900 border-zinc-600 text-teal-500 focus:ring-teal-500/50"
                  />
                  <span class="truncate" :title="param.name">{{ param.name }} <span class="text-zinc-500 text-[10px]" v-if="param.unit">[{{ param.unit }}]</span></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue';
import { store } from '../store';
import { FileParser } from '../services/FileParser';

const expanded = reactive({});
const searchQuery = ref('');

const filteredDrones = computed(() => {
  if (!searchQuery.value) return store.drones;
  
  const query = searchQuery.value.toLowerCase();
  const result = {};
  
  for (const droneId in store.drones) {
    const drone = store.drones[droneId];
    const filteredParams = {};
    let hasMatches = false;
    
    for (const paramKey in drone.parameters) {
      const param = drone.parameters[paramKey];
      if (
        param.name.toLowerCase().includes(query) || 
        param.group.toLowerCase().includes(query) || 
        paramKey.toLowerCase().includes(query)
      ) {
        filteredParams[paramKey] = param;
        hasMatches = true;
      }
    }
    
    if (hasMatches) {
      result[droneId] = {
        ...drone,
        parameters: filteredParams
      };
      // Auto-expand if searching
      expanded[droneId] = true;
    }
  }
  
  return result;
});

const loadDirectory = async () => {
  const data = await FileParser.openDirectory();
  if (data) {
    store.clear();
    store.drones = data.drones;
    store.videos = data.videos;
    
    // Auto-select Commands pseudo-parameters by default
    for (const droneId in data.drones) {
      const drone = data.drones[droneId];
      if (drone.parameters) {
        for (const pKey in drone.parameters) {
          if (drone.parameters[pKey].isCommandGroup || drone.parameters[pKey].isEventGroup) {
            store.toggleParam(droneId, pKey);
          }
        }
      }
    }

    // Auto-select mocap tvec by default if exists
    for (const droneId in data.drones) {
      expanded[droneId] = true;
      const drone = data.drones[droneId];
      if (drone.parameters['frames.tvecX']) store.toggleParam(droneId, 'frames.tvecX');
      if (drone.parameters['frames.tvecY']) store.toggleParam(droneId, 'frames.tvecY');
      if (drone.parameters['frames.tvecZ']) store.toggleParam(droneId, 'frames.tvecZ');
    }
    
    if (data.videos.length > 0) {
      store.selectedVideo = data.videos[0];
    }
  }
};

const toggleDrone = (droneId) => {
  expanded[droneId] = !expanded[droneId];
};

const groupedParams = (parameters) => {
  const groups = {};
  for (const key in parameters) {
    const param = parameters[key];
    if (!groups[param.group]) groups[param.group] = [];
    groups[param.group].push({
      fullId: key,
      ...param
    });
  }
  
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    if (a === 'Commands' && b !== 'Commands') return -1;
    if (b === 'Commands' && a !== 'Commands') return 1;
    if (a === 'Events' && b !== 'Events') return -1;
    if (b === 'Events' && a !== 'Events') return 1;
    return a.localeCompare(b);
  });
  
  const sortedGroups = {};
  for (const key of sortedKeys) {
    sortedGroups[key] = groups[key];
  }
  
  return sortedGroups;
};
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 4px;
}
</style>
