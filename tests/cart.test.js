const request = require('supertest');
const { expect } = require('chai');

describe('Cart Service', () => {
  const cartServiceUrl = 'http://cart:3002';
  const apiToken = 'my-secret-api-token-2025';

  describe('POST /cart/add', () => {
    it('should add a product to the cart with valid token', async () => {
      const res = await request(cartServiceUrl)
        .post('/cart/add')
        .send({ productId: '1' })
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${apiToken}`);

      expect(res.status).to.equal(200);
      expect(res.text).to.equal('Product added');
    });

    it('should return 401 for missing token', async () => {
      const res = await request(cartServiceUrl)
        .post('/cart/add')
        .send({ productId: '1' })
        .set('Content-Type', 'application/json');

      expect(res.status).to.equal(401);
      expect(res.text).to.equal('Access denied: No token provided');
    });

    it('should return 400 for invalid productId', async () => {
      const res = await request(cartServiceUrl)
        .post('/cart/add')
        .send({ productId: '' })
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${apiToken}`);

      expect(res.status).to.equal(400);
      expect(res.text).to.equal('Invalid productId');
    });
  });

  describe('POST /cart/checkout', () => {
    it('should create an order and clear the cart with valid token', async () => {
      await request(cartServiceUrl)
        .post('/cart/add')
        .send({ productId: '1' })
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${apiToken}`);

      const res = await request(cartServiceUrl)
        .post('/cart/checkout')
        .set('Authorization', `Bearer ${apiToken}`);

      expect(res.status).to.equal(200);
      expect(res.text).to.equal('Order created');
    });

    it('should return 401 for missing token', async () => {
      const res = await request(cartServiceUrl)
        .post('/cart/checkout');

      expect(res.status).to.equal(401);
      expect(res.text).to.equal('Access denied: No token provided');
    });
  });
});