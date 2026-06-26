export class FileParser {
  static async openDirectory() {
    try {
      const dirHandle = await window.showDirectoryPicker();
      const files = [];
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile();
          files.push(file);
        }
      }
      return this.parseFiles(files);
    } catch (err) {
      console.error('Error opening directory:', err);
      return null;
    }
  }

  static async parseFiles(files) {
    const data = {
      drones: {},
      videos: [],
    };

    for (const file of files) {
      if (file.name.endsWith('.mp4') || file.name.endsWith('.webm')) {
        data.videos.push({
          name: file.name,
          url: URL.createObjectURL(file),
          file: file,
        });
      } else if (file.name.endsWith('.json')) {
        try {
          const text = await file.text();
          const json = JSON.parse(text);
          const droneId = json.args?.drone_id || file.name.split('_')[0];

          if (!data.drones[droneId]) {
            data.drones[droneId] = {
              id: droneId,
              mission_start_time: null,
              start_times: [],
              stop_times: [],
              commands: [],
              events: [],
              args: {},
              git_ver: '',
              parameters: {},
            };
          }

          if (file.name.includes('_tracker_')) {
            this.processTrackerLog(json, data.drones[droneId]);
          } else {
            this.processDroneLog(json, data.drones[droneId]);
          }
        } catch (e) {
          console.warn(`Failed to parse ${file.name}:`, e);
        }
      }
    }

    // Match tracker video start times
    for (const video of data.videos) {
      if (video.name.includes('_tracker_')) {
        const droneId = video.name.split('_')[0];
        if (data.drones[droneId] && data.drones[droneId].tracker_video_start_time !== undefined) {
          video.video_start_time = data.drones[droneId].tracker_video_start_time;
        }
      }
    }

    return data;
  }

  static processDroneLog(json, droneData) {
    if (json.mission_start_time) droneData.mission_start_time = json.mission_start_time;
    if (json.start_times) droneData.start_times = json.start_times;
    else if (json.start_time) droneData.start_times.push(json.start_time);

    if (json.stop_times) droneData.stop_times = json.stop_times;
    else if (json.stop_time) droneData.stop_times.push(json.stop_time);

    if (json.commands) droneData.commands = json.commands;
    if (json.events) droneData.events = json.events;
    if (json.args) droneData.args = json.args;
    if (json.git_ver) droneData.git_ver = json.git_ver;

    // 1. Process flight controller logs (cf_* and cf)
    for (const key in json) {
      if (key.startsWith('cf_') || key === 'cf') {
        const logGroup = json[key];
        const timeArr = logGroup.time || [];
        const params = logGroup.params || {};

        for (const paramKey in params) {
          const paramObj = params[paramKey];
          if (!paramObj.data) continue;

          let dataArr = paramObj.data;
          const scale = paramObj.scale;

          if (scale !== undefined && scale !== 1.0) {
            dataArr = dataArr.map(v => v * scale);
          }

          droneData.parameters[`${key}.${paramKey}`] = {
            group: key,
            name: paramKey,
            time: timeArr,
            data: dataArr,
            unit: paramObj.unit || '',
          };
        }
      }
    }

    // 2. Process mocap frames (frames)
    if (json.frames && json.frames.length > 0) {
      const timeArr = json.frames.map(f => f.time);
      const tvecX = json.frames.map(f => f.tvec[0]);
      const tvecY = json.frames.map(f => f.tvec[1]);
      const tvecZ = json.frames.map(f => f.tvec[2]);

      droneData.parameters['frames.tvecX'] = { group: 'frames', name: 'tvecX', time: timeArr, data: tvecX, unit: 'm' };
      droneData.parameters['frames.tvecY'] = { group: 'frames', name: 'tvecY', time: timeArr, data: tvecY, unit: 'm' };
      droneData.parameters['frames.tvecZ'] = { group: 'frames', name: 'tvecZ', time: timeArr, data: tvecZ, unit: 'm' };

      if (json.frames[0].dist_sq !== undefined) {
        const distSq = json.frames.map(f => f.dist_sq);
        droneData.parameters['frames.dist_sq'] = { group: 'frames', name: 'dist_sq', time: timeArr, data: distSq, unit: 'm^2' };
      }
    }

    // 3. Process commands into pseudo-parameters and argument parameters
    if (json.commands && json.commands.length > 0) {
      const groups = new Set();
      json.commands.forEach(cmd => {
        if (cmd.name) {
          const groupName = cmd.name.split('.')[0];
          groups.add(groupName);

          const cmdName = cmd.name.split('.').pop();

          if (cmd.args && cmd.args.length > 0) {
            cmd.args.forEach((arg, index) => {
              if (typeof arg === 'number') {
                const paramKey = `Commands.${cmd.name}[${index}]`;
                if (!droneData.parameters[paramKey]) {
                  droneData.parameters[paramKey] = {
                    group: `Commands.${groupName}`,
                    name: `${cmdName}[${index}]`,
                    time: [],
                    data: [],
                    unit: '',
                    isCommandArg: true
                  };
                }
                droneData.parameters[paramKey].time.push(cmd.time);
                droneData.parameters[paramKey].data.push(arg);
              }
            });
          }

          if (cmd.kwargs) {
            for (const [k, v] of Object.entries(cmd.kwargs)) {
              if (typeof v === 'number') {
                const paramKey = `Commands.${cmd.name}.${k}`;
                if (!droneData.parameters[paramKey]) {
                  droneData.parameters[paramKey] = {
                    group: `Commands.${groupName}`,
                    name: `${cmdName}.${k}`,
                    time: [],
                    data: [],
                    unit: '',
                    isCommandArg: true
                  };
                }
                droneData.parameters[paramKey].time.push(cmd.time);
                droneData.parameters[paramKey].data.push(v);
              }
            }
          }
        }
      });
      groups.forEach(group => {
        droneData.parameters[`Commands.${group}`] = {
          group: 'Commands',
          name: group,
          time: [],
          data: [],
          unit: '',
          isCommandGroup: true
        };
      });
    }

    // 4. Process events into pseudo-parameters
    if (json.events && json.events.length > 0) {
      droneData.parameters['Events.All'] = {
        group: 'Events',
        name: 'All',
        time: [],
        data: [],
        unit: '',
        isEventGroup: true
      };
    }

    return droneData;
  }

  static flattenTrackerEntries(value, path = '') {
    if (value === null || value === undefined) return [];

    if (Array.isArray(value)) {
      return value.flatMap((item, index) => {
        const itemPath = path ? `${path}[${index}]` : `[${index}]`;
        return this.flattenTrackerEntries(item, itemPath);
      });
    }

    if (typeof value === 'object') {
      return Object.entries(value).flatMap(([key, childValue]) => {
        return this.flattenTrackerEntries(childValue, key);
      });
    }

    if (typeof value === 'number') {
      return [{ path, value }];
    }

    return [];
  }

  static processTrackerLog(json, droneData) {
    if (json.config && json.config.video_start_time) {
      droneData.tracker_video_start_time = json.config.video_start_time;
    }

    const frames = Array.isArray(json.frames) ? json.frames : [];
    if (frames.length === 0) return;

    const seriesByPath = new Map();

    frames.forEach((frame) => {
      if (!frame || typeof frame !== 'object') return;

      const timeSeconds = typeof frame.time === 'number' ? frame.time / 1000.0 : null;
      if (timeSeconds === null) return;

      const entries = this.flattenTrackerEntries(frame);
      entries.forEach(({ path, value }) => {
        if (path === 'time') return;

        if (!seriesByPath.has(path)) {
          seriesByPath.set(path, { group: 'Tracker', name: path, time: [], data: [] });
        }

        const series = seriesByPath.get(path);
        series.time.push(timeSeconds);
        series.data.push(value);
      });
    });

    for (const [path, series] of seriesByPath.entries()) {
      droneData.parameters[`Tracker.${path}`] = {
        group: 'Tracker',
        name: path,
        time: series.time,
        data: series.data,
        unit: '',
      };
    }
  }
}
