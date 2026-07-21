import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import nodeRoutes from './node/node.routes';
import alarmRoutes from './alarm/alarm.routes';
import { mqttService } from './mqtt/mqtt.service';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

app.route('/api/nodes', nodeRoutes);
app.route('/api/alarms', alarmRoutes);

app.get('/', (c) => {
  return c.json({
    success: true,
    message: 'EmberRoot Backend API is running.',
    timestamp: new Date().toISOString(),
    services: {
      mqtt: 'active'
    }
  });
});

mqttService.connect();

export default app;
