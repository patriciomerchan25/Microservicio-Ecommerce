const express = require('express');
const mongoose = require('mongoose');
const amqp = require('amqplib');
const retry = require('async-retry');
const os = require('os');
const cors = require('cors');
const promClient = require('prom-client');

const app = express();
app.use(express.json());

//app.use('*',cors({
// origin: 'http://localhost:8080',
// methods: ['GET', 'POST', 'OPTIONS'],
// allowedHeaders: ['Content-Type', 'Authorization']
// }));// Configuración de CORS
 
const API_TOKEN = process.env.API_TOKEN || 'my-secret-api-token-2025';

const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

const httpRequestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).send('Acceso denegado: No token provided');
  }
  if (token !== API_TOKEN) {
    return res.status(401).send('Acceso denegado: Token inválido');
  }
  next();
};

mongoose.connect('mongodb://mongodb:27017/orders', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Servicio de pedidos: Conectado a MongoDB'))
  .catch(err => {
    console.error('Servicio de pedidos: Error de conexión MongoDB:', err);
    process.exit(1);
  });

const OrderSchema = new mongoose.Schema({
  items: [String],
  createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);

let channel;
async function connectRabbitMQ() {
  try {
    await retry(async () => {
      const conn = await amqp.connect('amqp://rabbitmq');
      channel = await conn.createConfirmChannel(); // ← confirmChannel
      await channel.assertQueue('notifications', {durable: true});
      console.log('Servicio de pedidos: Conectado a RabbitMQ');

      // Reconexión automática si se cierra la conexión
      conn.on('close', () => {
        console.error('Servicio de pedidos: Conexión RabbitMQ cerrada. Reconectando...');
        setTimeout(connectRabbitMQ, 5000);
      });

      conn.on('error', (err) => {
        console.error('Servicio de pedidos: Error de conexión RabbitMQ:', err.message);
      });
    }, { retries: 10, minTimeout: 5000 });
  } catch (err) {
    console.error('Servicio de pedidos: No se pudo conectar a RabbitMQ después de reintentos:', err);
    process.exit(1);
  }
}
connectRabbitMQ();

async function sendToRabbitMQ(message) {
  try {
    await retry((bail) => {
      return new Promise((resolve, reject) => {
        channel.sendToQueue(
          'notifications',
          Buffer.from(message),
          { persistent: true },
          (err, ok) => {
            if (err) {
              console.error('Servicio de pedidos: Mensaje NO confirmado:', err.message);
              return reject(err);
            }
            console.log('Servicio de pedidos: Mensaje confirmado y enviado:', message);
            resolve();
          }
        );
      });
    }, { retries: 3 });
  } catch (err) {
    console.error('Servicio de pedidos: Fallo al enviar mensaje a RabbitMQ tras reintentos:', err.message);
  }
}

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    httpRequestCounter.inc({
      method: req.method,
      route: req.path,
      status: res.statusCode,
    });
  });
  next();
});

app.get('/', (req, res) => {
  res.send('El servicio de pedidos está en marcha');
});

app.post('/', authenticateToken, async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).send('Elementos no válidos: debe ser una matriz no vacía');
  }
  try {
    const order = new Order({ items });
    await order.save();
    console.log(`Servicio de pedidos (${os.hostname()}): Orden creada con ID:`, order._id);
    await sendToRabbitMQ(`Order ${order._id} created`);
    res.json({ message: 'Order created', orderId: order._id }); // Devuelve el orderId
  } catch (err) {
    console.error('Servicio de pedidos: Error al crear el pedido:', err);
    res.status(500).send('Pedido fallido: ' + err.message);
  }
});

app.listen(3003, () => {
  console.log('Servicio de pedidos en ejecución en el puerto 3003');
});