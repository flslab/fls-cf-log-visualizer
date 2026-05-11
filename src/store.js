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
  showStatsView: false, // Show statistics view
  timeRangePercent: [0, 100], // [start, end] percentage of visible x-axis
  
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

  get minTime() {
    let mTime = Infinity;
    for (const droneId in this.drones) {
      const drone = this.drones[droneId];
      if (drone.mission_start_time !== undefined && drone.mission_start_time !== null) {
        mTime = Math.min(mTime, drone.mission_start_time);
      } else if (drone.start_times && drone.start_times.length > 0) {
        mTime = Math.min(mTime, drone.start_times[0]);
      } else {
        this.selectedParams.forEach(p => {
          if (p.droneId === droneId) {
            const param = drone.parameters[p.paramId];
            if (param && param.time && param.time.length > 0) {
              mTime = Math.min(mTime, param.time[0]);
            }
          }
        });
      }
    }
    return mTime === Infinity ? 0 : mTime;
  },

  get maxTime() {
    let mTime = -Infinity;
    for (const droneId in this.drones) {
      const drone = this.drones[droneId];
      if (drone.stop_times && drone.stop_times.length > 0) {
        mTime = Math.max(mTime, drone.stop_times[drone.stop_times.length - 1]);
      } else {
        this.selectedParams.forEach(p => {
          if (p.droneId === droneId) {
            const param = drone.parameters[p.paramId];
            if (param && param.time && param.time.length > 0) {
              mTime = Math.max(mTime, param.time[param.time.length - 1]);
            }
          }
        });
      }
    }
    return mTime === -Infinity ? 0 : mTime;
  },

  clear() {
    this.drones = {};
    this.videos = [];
    this.selectedVideo = null;
    this.selectedParams = [];
    this.currentTime = null;
    this.showVideoView = false;
    this.showInfoView = false;
    this.showStatsView = false;
    this.timeRangePercent = [0, 100];
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

  toggleShowStatsView() {
    this.showStatsView = !this.showStatsView;
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
