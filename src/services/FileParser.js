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
          data.drones[droneId] = this.processDroneLog(droneId, json);
        } catch (e) {
          console.warn(`Failed to parse ${file.name}:`, e);
        }
      }
    }
    return data;
  }

  static processDroneLog(droneId, json) {
    const droneData = {
      id: droneId,
      mission_start_time: json.mission_start_time || null,
      start_times: json.start_times || (json.start_time ? [json.start_time] : []),
      stop_times: json.stop_times || (json.stop_time ? [json.stop_time] : []),
      commands: json.commands || [],
      events: json.events || [],
      args: json.args || {},
      git_ver: json.git_ver || '',
      parameters: {}, // Key: "category.param", Value: { time: [], data: [], unit: "" }
    };

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

    // 3. Process commands into pseudo-parameters
    if (json.commands && json.commands.length > 0) {
      const groups = new Set();
      json.commands.forEach(cmd => {
        if (cmd.name) {
          groups.add(cmd.name.split('.')[0]);
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
}
