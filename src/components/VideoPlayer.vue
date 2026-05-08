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
    let newTime = videoPlayer.value.currentTime;
    if (store.selectedVideo && store.selectedVideo.video_start_time !== undefined) {
      const t_abs = newTime + store.selectedVideo.video_start_time;
      newTime = t_abs - store.minTime;
    }
    store.currentTime = newTime;
    setTimeout(() => { isVideoUpdatingStore = false; }, 50);
  }
};

const onPlay = () => {};
const onPause = () => {};

// Sync store time (from plot scrubbing) to video
watch(() => store.currentTime, (newTime) => {
  if (!isVideoUpdatingStore && videoPlayer.value && newTime !== null) {
    let videoTargetTime = newTime;
    if (store.selectedVideo && store.selectedVideo.video_start_time !== undefined) {
      const t_abs = newTime + store.minTime;
      videoTargetTime = t_abs - store.selectedVideo.video_start_time;
    }
    if (Math.abs(videoPlayer.value.currentTime - videoTargetTime) > 0.1) {
      if (videoTargetTime >= 0 && videoTargetTime <= videoPlayer.value.duration) {
        videoPlayer.value.currentTime = videoTargetTime;
      }
    }
  }
});
</script>
