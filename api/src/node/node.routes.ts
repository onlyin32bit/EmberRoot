import { Hono } from 'hono';
import { nodeService } from './node.service';

const routes = new Hono();

routes.get('/', (c) => {
  const nodes = nodeService.getNodes();
  return c.json({ success: true, data: nodes });
});

routes.get('/:id', (c) => {
  const id = c.req.param('id');
  const node = nodeService.getNodeById(id);
  if (!node) {
    return c.json({ success: false, error: 'Node not found' }, 404);
  }
  return c.json({ success: true, data: node });
});

routes.get('/:id/telemetry', (c) => {
  const id = c.req.param('id');
  const limitStr = c.req.query('limit');
  const limit = limitStr ? parseInt(limitStr, 10) : 50;
  
  const telemetry = nodeService.getTelemetry(id, limit);
  return c.json({ success: true, data: telemetry });
});

export default routes;
