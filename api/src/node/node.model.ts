export interface SensorNode {
  id: string;
  name: string;
  type: 'full' | 'light' | 'fence';
  status: 'online' | 'offline';
  lastSeen: string;
  moisture: number;
  waterTable: number;
  temperature: number;
  tempDepth: {
    temp_5: number;
    temp_15: number;
    temp_30: number;
    temp_45: number;
  };
}

export interface TelemetryLog {
  timestamp: string;
  nodeId: string;
  temp_5: number;
  temp_15: number;
  temp_30: number;
  temp_45: number;
  co: number;
  co2: number;
  ch4: number;
  moisture: number;
  waterTable: number;
}

export const nodesDb: Map<string, SensorNode> = new Map([
  [
    'node_01',
    {
      id: 'node_01',
      name: 'U Minh Forest - Full Station 01',
      type: 'full',
      status: 'online',
      lastSeen: new Date().toISOString(),
      moisture: 42.5,
      waterTable: -15.0,
      temperature: 26.5,
      tempDepth: {
        temp_5: 25.8,
        temp_15: 24.3,
        temp_30: 23.5,
        temp_45: 22.8
      }
    }
  ],
  [
    'node_02',
    {
      id: 'node_02',
      name: 'U Minh Forest - Light Station 02',
      type: 'light',
      status: 'online',
      lastSeen: new Date().toISOString(),
      moisture: 38.2,
      waterTable: -18.5,
      temperature: 27.2,
      tempDepth: {
        temp_5: 26.5,
        temp_15: 25.0,
        temp_30: 0.0,
        temp_45: 0.0
      }
    }
  ]
]);

export const telemetryDb: TelemetryLog[] = [
  {
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    nodeId: 'node_01',
    temp_5: 25.2,
    temp_15: 24.0,
    temp_30: 23.1,
    temp_45: 22.5,
    co: 1.2,
    co2: 395.0,
    ch4: 1.8,
    moisture: 43.1,
    waterTable: -14.8
  },
  {
    timestamp: new Date().toISOString(),
    nodeId: 'node_01',
    temp_5: 25.8,
    temp_15: 24.3,
    temp_30: 23.5,
    temp_45: 22.8,
    co: 1.5,
    co2: 400.0,
    ch4: 2.0,
    moisture: 42.5,
    waterTable: -15.0
  }
];
