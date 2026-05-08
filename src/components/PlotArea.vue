<template>
  <div class="h-full w-full overflow-hidden flex flex-col p-2">
    <div v-if="store.selectedParams.length === 0" class="flex-1 flex items-center justify-center text-zinc-500">
      Select parameters from the sidebar to visualize data.
    </div>
    <v-chart 
      v-else
      class="w-full flex-1" 
      :option="chartOption" 
      autoresize
      @datazoom="onDataZoom"
      @updateAxisPointer="onAxisPointer"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DataZoomComponent,
  LegendComponent,
  MarkLineComponent,
} from 'echarts/components';
import VChart from 'vue-echarts';
import { store } from '../store';

use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DataZoomComponent,
  LegendComponent,
  MarkLineComponent,
]);

let isPlotUpdatingStore = false;

const onAxisPointer = (event) => {
  if (event.axesInfo && event.axesInfo.length > 0) {
    const timeValue = event.axesInfo[0].value;
    if (timeValue !== undefined) {
      isPlotUpdatingStore = true;
      store.currentTime = timeValue;
      setTimeout(() => { isPlotUpdatingStore = false; }, 50);
    }
  }
};

const chartOption = computed(() => {
  if (store.selectedParams.length === 0) return {};

  const series = [];
  const legendData = [];
  
  // To sync video relative time vs absolute timestamp
  // We need the minimum time across all plotted data to zero it out, or use absolute time.
  // The video player currentTime starts at 0. So we need to map plot time.
  // Let's find the absolute start time across all drones.
  let minTime = Infinity;
  for (const droneId in store.drones) {
    const drone = store.drones[droneId];
    if (drone.mission_start_time !== undefined && drone.mission_start_time !== null) {
      minTime = Math.min(minTime, drone.mission_start_time);
    } else if (drone.start_times && drone.start_times.length > 0) {
      minTime = Math.min(minTime, drone.start_times[0]);
    } else {
      // Find min time from selected params
      store.selectedParams.forEach(p => {
        if (p.droneId === droneId) {
          const param = drone.parameters[p.paramId];
          if (param && param.time.length > 0) {
            minTime = Math.min(minTime, param.time[0]);
          }
        }
      });
    }
  }
  
  if (minTime === Infinity) minTime = 0;

  store.selectedParams.forEach(selection => {
    const drone = store.drones[selection.droneId];
    if (!drone) return;
    const param = drone.parameters[selection.paramId];
    if (!param) return;

    const data = [];
    for (let i = 0; i < param.time.length; i++) {
      // Relative time in seconds
      data.push([param.time[i] - minTime, param.data[i]]);
    }

    const seriesName = `${selection.droneId} - ${param.name}`;
    if (!param.isCommandGroup && !param.isEventGroup) {
      legendData.push(seriesName);
    }

    // Prepare mark lines for start/stop times
    const markLineData = [];
    drone.start_times.forEach(t => {
      markLineData.push({ xAxis: t - minTime, itemStyle: { color: '#10b981' } }); // Green
    });
    drone.stop_times.forEach(t => {
      markLineData.push({ xAxis: t - minTime, itemStyle: { color: '#ef4444' } }); // Red
    });

    if (store.showCommands && drone.commands) {
      drone.commands.forEach(cmd => {
        if (!cmd.name) return;
        const group = cmd.name.split('.')[0];
        if (!store.isParamSelected(selection.droneId, `Commands.${group}`)) return;

        const cmdName = cmd.name.split('.').pop();
        // Build tooltip content as a function call
        let argsStr = [];
        if (cmd.args && cmd.args.length > 0) {
          argsStr.push(...cmd.args.map(a => typeof a === 'number' ? (Number.isInteger(a) ? a.toString() : a.toFixed(3)) : JSON.stringify(a)));
        }
        if (cmd.kwargs && Object.keys(cmd.kwargs).length > 0) {
          for (const [k, v] of Object.entries(cmd.kwargs)) {
            argsStr.push(`${k}=${typeof v === 'number' ? (Number.isInteger(v) ? v.toString() : v.toFixed(3)) : JSON.stringify(v)}`);
          }
        }
        const callStr = `${cmd.name}(${argsStr.join(', ')})`;
        const tooltipContent = `<div style="font-family: monospace; font-size: 13px;">
          <b>${callStr}</b><br/>
          <span style="color: #93c5fd;">Time: ${cmd.time.toFixed(3)}s</span>
        </div>`;

        markLineData.push({ 
          xAxis: cmd.time - minTime, 
          itemStyle: { color: '#3b82f6', type: 'dashed', width: 2 }, // Blue, thicker
          emphasis: {
            lineStyle: { width: 4 } // Even thicker on hover
          },
          label: {
            show: true,
            formatter: cmdName,
            position: 'insideEndTop',
            color: '#93c5fd'
          },
          tooltip: {
            show: true,
            formatter: tooltipContent
          }
        });
      });
    }

    if (store.showEvents && drone.events) {
      drone.events.forEach(ev => {
        if (!store.isParamSelected(selection.droneId, 'Events.All')) return;

        let argsStr = [];
        for (const [k, v] of Object.entries(ev)) {
          if (k !== 'time' && k !== 'name') {
            argsStr.push(`${k}=${typeof v === 'number' ? (Number.isInteger(v) ? v.toString() : v.toFixed(3)) : JSON.stringify(v)}`);
          }
        }
        
        const tooltipContent = `<div style="font-family: monospace; font-size: 13px;">
          <b style="color: #f59e0b;">Event: ${ev.name}</b><br/>
          ${argsStr.length > 0 ? `<span style="color: #d1d5db;">${argsStr.join('<br/>')}</span><br/>` : ''}
          <span style="color: #fcd34d;">Time: ${ev.time.toFixed(3)}s</span>
        </div>`;

        markLineData.push({ 
          xAxis: ev.time - minTime, 
          itemStyle: { color: '#f59e0b', type: 'solid', width: 2 }, // Amber/Orange
          emphasis: {
            lineStyle: { width: 4 }
          },
          label: {
            show: true,
            formatter: ev.name,
            position: 'insideEndBottom',
            color: '#fcd34d'
          },
          tooltip: {
            show: true,
            formatter: tooltipContent
          }
        });
      });
    }

    series.push({
      name: seriesName,
      type: 'line',
      showSymbol: false,
      data: data,
      itemStyle: { color: selection.color },
      markLine: markLineData.length > 0 ? {
        symbol: ['none', 'none'],
        label: { show: false },
        data: markLineData
      } : undefined
    });
  });

  const isHorizontal = store.splitMode === 'horizontal';

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      data: legendData,
      textStyle: { color: '#ccc' },
      type: 'scroll',
      ...(isHorizontal 
        ? { right: 0, top: 'middle', orient: 'vertical' } 
        : { top: 0, left: 'center', orient: 'horizontal' })
    },
    grid: {
      left: '50',
      right: isHorizontal ? '150' : '50',
      top: isHorizontal ? '0' : '40',
      bottom: '50',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: 'Time (s)',
      scale: true,
      nameTextStyle: { color: '#888' },
      axisLine: { lineStyle: { color: '#555' } },
      splitLine: { show: false },
      axisLabel: { color: '#aaa' }
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLine: { lineStyle: { color: '#555' } },
      splitLine: { lineStyle: { color: '#333' } },
      axisLabel: { color: '#aaa' }
    },
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0,
        filterMode: 'none'
      },
      {
        type: 'slider',
        xAxisIndex: 0,
        filterMode: 'none',
        bottom: 10, // Moved slider lower
        textStyle: { color: '#ccc' }
      },
      {
        type: 'slider',
        yAxisIndex: 0,
        filterMode: 'none',
        left: 0,
        textStyle: { color: '#ccc' }
      }
    ],
    series: series,
    animation: false // Disable animation for large data performance
  };
});
</script>
