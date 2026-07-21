export interface AppConfig {
  MQTT_BROKER: string;
  MQTT_PORT: number;
  MQTT_USER: string;
  MQTT_PASS: string;
  MQTT_TOPIC: string;
}

export function loadConfig(): AppConfig {
  const broker = process.env.MQTT_BROKER;
  const port = process.env.MQTT_PORT;
  const user = process.env.MQTT_USER;
  const pass = process.env.MQTT_PASS;
  const topic = process.env.MQTT_TOPIC;

  if (!broker) {
    console.warn('[EmberRoot-Config] WARNING: MQTT_BROKER is not defined in environment variables.');
  }

  return {
    MQTT_BROKER: broker || '',
    MQTT_PORT: port ? parseInt(port, 10) : 1883,
    MQTT_USER: user || '',
    MQTT_PASS: pass || '',
    MQTT_TOPIC: topic || 'emberroot/sensors'
  };
}

export const appConfig = loadConfig();
