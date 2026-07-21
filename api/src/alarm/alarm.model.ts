export interface Alarm {
  id: string;
  timestamp: string;
  nodeId: string;
  level: 'monitoring' | 'suspicious' | 'warning';
  message: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
}

export const alarmsDb: Alarm[] = [
  {
    id: 'alarm_01',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    nodeId: 'node_01',
    level: 'monitoring',
    message: 'Node temp_5 rising above baseline (35.2°C)',
    acknowledged: true,
    acknowledgedAt: new Date(Date.now() - 7000000).toISOString()
  }
];
