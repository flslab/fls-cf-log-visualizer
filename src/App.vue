<template>
  <div class="h-screen w-screen bg-gray-900 text-gray-100 flex flex-col font-sans overflow-hidden selection:bg-indigo-500/30">
    
    <!-- Top Navigation Bar -->
    <header class="h-14 bg-gray-800/90 backdrop-blur border-b border-gray-700/50 flex items-center justify-between px-6 shadow-md z-10">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 class="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400">
          Log Visualizer
        </h1>
      </div>
      
      <div class="flex space-x-4 items-center text-sm text-gray-400">
        <button 
          @click="store.toggleSplitMode()" 
          class="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-200 transition-colors flex items-center space-x-2"
          title="Toggle Split Layout"
        >
          <svg v-if="store.splitMode === 'vertical'" class="w-4 h-4" fill="none" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" stroke-width="2" />
            <path d="M3 6a2 2 0 0 1 2-2h7v16H5a2 2 0 0 1-2-2V6z" fill="currentColor" />
          </svg>
          <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" stroke-width="2" />
            <path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6H3V6z" fill="currentColor" />
          </svg>
          <span>{{ store.splitMode === 'vertical' ? 'Vertical Split' : 'Horizontal Split' }}</span>
        </button>

        <button 
          @click="store.toggleShowCommands()" 
          :disabled="!store.hasCommands"
          class="px-3 py-1 rounded transition-colors flex items-center space-x-2"
          :class="[
            !store.hasCommands ? 'bg-gray-800 text-gray-600 cursor-not-allowed' :
            store.showCommands ? 'bg-indigo-600 hover:bg-indigo-500 text-gray-200' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
          ]"
          title="Toggle Command Markers"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Cmds</span>
        </button>

        <button 
          @click="store.toggleShowEvents()" 
          :disabled="!store.hasEvents"
          class="px-3 py-1 rounded transition-colors flex items-center space-x-2"
          :class="[
            !store.hasEvents ? 'bg-gray-800 text-gray-600 cursor-not-allowed' :
            store.showEvents ? 'bg-indigo-600 hover:bg-indigo-500 text-gray-200' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
          ]"
          title="Toggle Event Markers"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Events</span>
        </button>

        <button 
          @click="store.toggleShowVideoView()" 
          :disabled="!store.hasVideos"
          class="px-3 py-1 rounded transition-colors flex items-center space-x-2"
          :class="[
            !store.hasVideos ? 'bg-gray-800 text-gray-600 cursor-not-allowed' :
            store.showVideoView ? 'bg-indigo-600 hover:bg-indigo-500 text-gray-200' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
          ]"
          title="Toggle Video Panel"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Video</span>
        </button>

        <button 
          @click="store.toggleShowInfoView()" 
          :disabled="!store.hasInfo"
          class="px-3 py-1 rounded transition-colors flex items-center space-x-2"
          :class="[
            !store.hasInfo ? 'bg-gray-800 text-gray-600 cursor-not-allowed' :
            store.showInfoView ? 'bg-indigo-600 hover:bg-indigo-500 text-gray-200' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
          ]"
          title="Toggle Drone Info"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Info</span>
        </button>

        <div v-if="store.currentTime !== null" class="ml-4">
          Time: <span class="text-indigo-400 font-mono">{{ store.currentTime.toFixed(3) }}s</span>
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-1 flex overflow-hidden p-4 gap-4">
      
      <!-- Sidebar -->
      <aside class="w-80 flex-shrink-0 transition-all duration-300">
        <div class="h-full glass-panel overflow-hidden">
          <Sidebar />
        </div>
      </aside>

      <!-- Plot and Video Area -->
      <div 
        class="flex-1 min-w-0 flex gap-4 transition-all duration-300"
        :class="store.splitMode === 'vertical' ? 'flex-row' : 'flex-col'"
      >
        <!-- Plot Area -->
        <section class="flex-1 min-w-0 transition-all duration-300">
          <PlotArea />
        </section>

        <!-- Side Panels Area (Conditional) -->
        <section 
          v-if="store.showVideoView || store.showInfoView" 
          class="transition-all duration-300 flex gap-4"
          :class="store.splitMode === 'vertical' ? 'flex-col w-1/3 min-w-[300px]' : 'flex-row h-1/3 min-h-[250px] w-full'"
        >
          <div v-if="store.showVideoView && store.selectedVideo" class="flex-1 min-h-[200px] min-w-[300px] bg-black rounded-xl overflow-hidden border border-gray-700/50 shadow-2xl relative">
            <VideoPlayer />
          </div>
          <div v-if="store.showInfoView" class="flex-1 min-h-[200px] min-w-[300px] relative">
            <InfoPanel />
          </div>
        </section>
      </div>

    </main>
  </div>
</template>

<script setup>
import { store } from './store';
import Sidebar from './components/Sidebar.vue';
import PlotArea from './components/PlotArea.vue';
import VideoPlayer from './components/VideoPlayer.vue';
import InfoPanel from './components/InfoPanel.vue';
</script>

<style>
@import './style.css';
</style>
