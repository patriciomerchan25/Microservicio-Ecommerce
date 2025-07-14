const request = require('supertest');
const { expect } = require('chai');

describe('Order Service', () => {
  const orderServiceUrl = 'http://order:3003';
  const apiToken = 'my-secret-api-token-2025';

  describe('POST /orders', () => {
    it('should create a new order with valid token', async () => {
      const res = await request(orderServiceUrl)
        .post('/orders')
        .send({ items: ['1'] })
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${apiToken}`);

      expect(res.status).to.equal(200);
      expect(res.text).to.equal('Order created');
    });

    it('should return 401 for missing token', async () => {
      const res = await request(orderServiceUrl)
        .post('/orders')
        .send({ items: ['1'] })
        .set('Content-Type', 'application/json');

      expect(res.status).to.equal(401);
      expect(res.text).to.equal('Access denied: No token provided');
    });

    it('should return 400 for invalid items', async () => {
      const res = await request(orderServiceUrl)
        .post('/orders')
        .send({ items: [] })
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${apiToken}`);

      expect(res.status).to.equal(400);
      expect(res.text).to.equal('Invalid items: must be a non-empty array');
    });
  });
});