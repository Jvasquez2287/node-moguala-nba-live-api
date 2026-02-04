import request from 'supertest';
import app from '../app';

describe('NBA API', () => {
  it('should return health check', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('NBA Live API is running');
  });

  it('should return config check', async () => {
    const response = await request(app).get('/api/v1/config/check');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('groq_configured');
  });
});