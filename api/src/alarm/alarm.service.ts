import { Alarm, alarmsDb } from './alarm.model';
import { TelemetryLog } from '../node/node.model';

export class AlarmService {
  getAlarms(): Alarm[] {
    return alarmsDb;
  }

  acknowledgeAlarm(id: string): Alarm | undefined {
    const alarm = alarmsDb.find((a) => a.id === id);
    if (alarm) {
      alarm.acknowledged = true;
      alarm.acknowledgedAt = new Date().toISOString();
    }
    return alarm;
  }

  checkTelemetry(nodeId: string, telemetry: Omit<TelemetryLog, 'timestamp' | 'nodeId'>): Alarm | null {
    if (telemetry.waterTable >= 0) {
      return null;
    }

    const { temp_5, temp_15, co, co2, moisture } = telemetry;
    const ratio_co2_co = co2 / (co + 1e-5);
    
    const is_warning = (temp_5 > 45.0 || temp_15 > 40.0) && co > 5.0 && ratio_co2_co < 50.0;
    const is_suspicious = (temp_5 > 45.0 || temp_15 > 40.0) || (co > 5.0 && moisture < 25.0);
    const is_monitoring = temp_5 > 35.0 || co > 3.0;

    let targetLevel: Alarm['level'] | null = null;
    let message = '';

    if (is_warning) {
      targetLevel = 'warning';
      message = `Active smouldering detected! High temperature (T5: ${temp_5}°C, T15: ${temp_15}°C) and anomalous CO (${co}ppm).`;
    } else if (is_suspicious) {
      targetLevel = 'suspicious';
      message = `Suspicious heat anomalies detected (T5: ${temp_5}°C, T15: ${temp_15}°C) under dry conditions (moisture: ${moisture}%).`;
    } else if (is_monitoring) {
      targetLevel = 'monitoring';
      message = `Elevated temperature monitored at surface (T5: ${temp_5}°C, CO: ${co}ppm).`;
    }

    if (targetLevel) {
      const activeAlarm = alarmsDb.find(
        (a) => a.nodeId === nodeId && a.level === targetLevel && !a.acknowledged
      );

      if (!activeAlarm) {
        const newAlarm: Alarm = {
          id: `alarm_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          timestamp: new Date().toISOString(),
          nodeId,
          level: targetLevel,
          message,
          acknowledged: false
        };
        alarmsDb.push(newAlarm);
        console.log(`[EmberRoot-Alert] New Alarm triggered for node ${nodeId}: [${targetLevel}] ${message}`);
        return newAlarm;
      }
    }

    return null;
  }
}
export const alarmService = new AlarmService();
