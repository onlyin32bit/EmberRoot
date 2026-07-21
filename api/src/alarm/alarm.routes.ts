import { Hono } from 'hono';
import { alarmService } from './alarm.service';

const routes = new Hono();

routes.get('/', (c) => {
  const alarms = alarmService.getAlarms();
  return c.json({ success: true, data: alarms });
});

routes.post('/:id/acknowledge', (c) => {
  const id = c.req.param('id');
  const alarm = alarmService.acknowledgeAlarm(id);
  if (!alarm) {
    return c.json({ success: false, error: 'Alarm not found' }, 404);
  }
  return c.json({ success: true, data: alarm });
});

export default routes;
