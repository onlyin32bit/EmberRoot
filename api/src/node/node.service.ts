import { SensorNode, TelemetryLog, nodesDb, telemetryDb } from './node.model';

export class NodeService {
  getNodes(): SensorNode[] {
    return Array.from(nodesDb.values());
  }

  getNodeById(id: string): SensorNode | undefined {
    return nodesDb.get(id);
  }

  getTelemetry(nodeId: string, limit: number = 50): TelemetryLog[] {
    return telemetryDb
      .filter((log) => log.nodeId === nodeId)
      .slice(-limit);
  }

  addTelemetry(nodeId: string, telemetry: Omit<TelemetryLog, 'timestamp' | 'nodeId'>): TelemetryLog {
    const timestamp = new Date().toISOString();
    const log: TelemetryLog = {
      timestamp,
      nodeId,
      ...telemetry
    };

    telemetryDb.push(log);

    const node = nodesDb.get(nodeId);
    if (node) {
      node.lastSeen = timestamp;
      node.status = 'online';
      node.moisture = telemetry.moisture;
      node.waterTable = telemetry.waterTable;
      node.temperature = telemetry.temp_5;
      node.tempDepth = {
        temp_5: telemetry.temp_5,
        temp_15: telemetry.temp_15,
        temp_30: telemetry.temp_30,
        temp_45: telemetry.temp_45
      };
      nodesDb.set(nodeId, node);
    } else {
      const newNode: SensorNode = {
        id: nodeId,
        name: `Node ${nodeId}`,
        type: 'full',
        status: 'online',
        lastSeen: timestamp,
        moisture: telemetry.moisture,
        waterTable: telemetry.waterTable,
        temperature: telemetry.temp_5,
        tempDepth: {
          temp_5: telemetry.temp_5,
          temp_15: telemetry.temp_15,
          temp_30: telemetry.temp_30,
          temp_45: telemetry.temp_45
        }
      };
      nodesDb.set(nodeId, newNode);
    }

    return log;
  }
}
export const nodeService = new NodeService();
