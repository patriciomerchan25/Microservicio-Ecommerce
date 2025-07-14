import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  vus: 50, //Amount of users
  duration: '30s', // Test duration 30s
};

export default function () {
  const productId = Math.floor(Math.random() * 2) + 1;
  const payload = JSON.stringify({ productId: productId.toString() });
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer my-secret-api-token-2025',
    },
  };
  http.post('http://localhost:3002/cart/add', payload, params);
  sleep(1);
}