import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '30s',
};

export default function () {
  const params = {
    headers: {
      'Authorization': 'Bearer my-secret-api-token-2025',
    },
  };
  http.post('http://localhost:3003/', null, params); // Escribir en el servicio de pedidos a través de Nginx
  sleep(1);
}