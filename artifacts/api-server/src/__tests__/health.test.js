import request from 'supertest';
import express from 'express';

jest.mock('../lib/persistence.js', () => ({
  getPersistenceMode: () => 'file',
}));

import healthRoutes from '../routes/health.ts';

// Create a test app
const app = express();
app.use('/api', healthRoutes);

describe('Health API', () => {
  test('GET /api/health returns system status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('ok', true);
    expect(response.body).toHaveProperty('persistence');
    expect(response.body.persistence).toHaveProperty('mode', 'file');
  });

  test('GET /api/health includes uptime information', async () => {
    const response = await request(app).get('/api/health').expect(200);

    expect(response.body).toHaveProperty('persistence');
    expect(response.body.persistence).toHaveProperty('seededOnBoot');
    expect(typeof response.body.persistence.seededOnBoot).toBe('boolean');
  });
});
