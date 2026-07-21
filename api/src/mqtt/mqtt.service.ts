import mqtt from 'mqtt';
import { appConfig } from '../config';
import { nodeService } from '../node/node.service';
import { alarmService } from '../alarm/alarm.service';

export class MqttService {
  private client: mqtt.MqttClient | null = null;

  connect(): void {
    let brokerUrl = appConfig.MQTT_BROKER;
    
    if (
      !brokerUrl.startsWith('mqtt://') &&
      !brokerUrl.startsWith('mqtts://') &&
      !brokerUrl.startsWith('tcp://') &&
      !brokerUrl.startsWith('ssl://') &&
      !brokerUrl.startsWith('ws://') &&
      !brokerUrl.startsWith('wss://')
    ) {
      const protocol = appConfig.MQTT_PORT === 8883 ? 'mqtts://' : 'mqtt://';
      brokerUrl = `${protocol}${brokerUrl}`;
    }

    const options: mqtt.IClientOptions = {
      port: appConfig.MQTT_PORT,
      username: appConfig.MQTT_USER || undefined,
      password: appConfig.MQTT_PASS || undefined,
      rejectUnauthorized: false,
      reconnectPeriod: 5000
    };

    console.log(`[MQTT] Connecting to broker at: ${brokerUrl}...`);
    
    this.client = mqtt.connect(brokerUrl, options);

    this.client.on('connect', () => {
      console.log(`[MQTT] Successfully connected to broker!`);
      const topic = appConfig.MQTT_TOPIC;
      this.client?.subscribe(topic, (err) => {
        if (err) {
          console.error(`[MQTT] Subscription to topic '${topic}' failed:`, err);
        } else {
          console.log(`[MQTT] Subscribed to topic: '${topic}'`);
        }
      });
    });

    this.client.on('message', (topic, message) => {
      console.log(`[MQTT] Received message on topic '${topic}': ${message.toString()}`);
      
      try {
        const payload = JSON.parse(message.toString());
        const nodeId = payload.node_id || 'node_01';
        
        const nodeTelemetry = {
          temp_5: typeof payload.t === 'number' ? payload.t : 25.0,
          temp_15: typeof payload.tempObj === 'number' ? payload.tempObj : 24.0,
          temp_30: typeof payload.temp_30 === 'number' ? payload.temp_30 : 23.0,
          temp_45: typeof payload.temp_45 === 'number' ? payload.temp_45 : 22.0,
          co: typeof payload.mq7 === 'number' ? payload.mq7 : 1.5,
          co2: typeof payload.mq2 === 'number' ? payload.mq2 : 400.0,
          ch4: typeof payload.ch4 === 'number' ? payload.ch4 : 0.0,
          moisture: typeof payload.soil === 'number' ? payload.soil : 40.0,
          waterTable: typeof payload.waterTable === 'number' ? payload.waterTable : -15.0
        };

        nodeService.addTelemetry(nodeId, nodeTelemetry);
        alarmService.checkTelemetry(nodeId, nodeTelemetry);

      } catch (err) {
        console.error('[MQTT] Failed to process telemetry payload:', err);
      }
    });

    this.client.on('error', (err) => {
      console.error('[MQTT] Client connection error:', err);
    });

    this.client.on('close', () => {
      console.log('[MQTT] Connection closed.');
    });
  }

  publish(topic: string, payload: string): void {
    if (this.client && this.client.connected) {
      this.client.publish(topic, payload);
    } else {
      console.warn(`[MQTT] Cannot publish, client not connected.`);
    }
  }
}
export const mqttService = new MqttService();
