<template>
  <div class="h-full w-full flex flex-col bg-black rounded-xl overflow-hidden border border-zinc-700/50 shadow-2xl relative">
    <video 
      ref="videoPlayer"
      class="w-full h-full object-contain"
      controls
      :src="store.selectedVideo?.url"
      @timeupdate="onTimeUpdate"
      @play="onPlay"
      @pause="onPause"
    ></video>
    <div class="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white backdrop-blur">
      {{ store.selectedVideo?.name }}
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { store } from '../store';

const videoPlayer = ref(null);
let isVideoUpdatingStore = false;

// Sync video time to store (which updates the plot line)
const onTimeUpdate = () => {
  if (videoPlayer.value && !videoPlayer.value.paused) {
    isVideoUpdatingStore = true;
    store.currentTime = videoPlayer.value.currentTime;
    setTimeout(() => { isVideoUpdatingStore = false; }, 50);
  }
};

const onPlay = () => {};
const onPause = () => {};

// Sync store time (from plot scrubbing) to video
watch(() => store.currentTime, (newTime) => {
  if (!isVideoUpdatingStore && videoPlayer.value) {
    if (Math.abs(videoPlayer.value.currentTime - newTime) > 0.1) {
      videoPlayer.value.currentTime = newTime;
    }
  }
});
</script>
