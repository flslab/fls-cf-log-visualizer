import { reactive } from 'vue';

export const store = reactive({
  drones: {},        // { lb8: { id, start_times, stop_times, parameters: { ... } } }
  videos: [],        // [{ name, url, file }]
  selectedVideo: null,
  selectedParams: [], // Array of objects: { droneId, paramId, color }
  currentTime: null,  // Current time from plot cursor or video playback
  splitMode: 'vertical', // 'vertical' or 'horizontal'
  showCommands: true, // Show command linemarkers
  showVideoView: false, // Show video
  showEvents: true, // Show event linemarkers
  showInfoView: false, // Show args/git_ver view
  
  get hasCommands() {
    for (const d in this.drones) {
      if (this.drones[d].commands && this.drones[d].commands.length > 0) return true;
    }
    return false;
  },
  
  get hasEvents() {
    for (const d in this.drones) {
      if (this.drones[d].events && this.drones[d].events.length > 0) return true;
    }
    return false;
  },
  
  get hasVideos() {
    return this.videos && this.videos.length > 0;
  },
  
  get hasInfo() {
    for (const d in this.drones) {
      if ((this.drones[d].args && Object.keys(this.drones[d].args).length > 0) || this.drones[d].git_ver) return true;
    }
    return false;
  },

  clear() {
    this.drones = {};
    this.videos = [];
    this.selectedVideo = null;
    this.selectedParams = [];
    this.currentTime = null;
    this.showVideoView = false;
    this.showInfoView = false;
  },

  clearSelectedParams() {
    this.selectedParams = [];
  },

  toggleSplitMode() {
    this.splitMode = this.splitMode === 'vertical' ? 'horizontal' : 'vertical';
  },

  toggleShowCommands() {
    this.showCommands = !this.showCommands;
  },

  toggleShowEvents() {
    this.showEvents = !this.showEvents;
  },

  toggleShowInfoView() {
    this.showInfoView = !this.showInfoView;
  },

  toggleShowVideoView() {
    this.showVideoView = !this.showVideoView;
  },

  toggleParam(droneId, paramId) {
    const idx = this.selectedParams.findIndex(p => p.droneId === droneId && p.paramId === paramId);
    if (idx >= 0) {
      this.selectedParams.splice(idx, 1);
    } else {
      // Assign a random distinct color
      const color = `hsl(${Math.random() * 360}, 70%, 50%)`;
      this.selectedParams.push({ droneId, paramId, color });
    }
  },

  isParamSelected(droneId, paramId) {
    return this.selectedParams.some(p => p.droneId === droneId && p.paramId === paramId);
  }
});
