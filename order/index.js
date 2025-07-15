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
    return res.status(401).send('Access denied: No token provided');
  }
  if (token !== API_TOKEN) {
    return res.status(401).send('Access denied: Invalid token');
  }
  next();
};

mongoose.connect('mongodb://mongo-primary:27017,mongo-secondary:27017,mongo-arbiter:27017/orders?replicaSet=rs0', { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
  .then(() => console.log('Order Service: Connected to MongoDB'))
  .catch(err => {
    console.error('Order Service: MongoDB connection error:', err);
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
      channel = await conn.createChannel();
      await channel.assertQueue('notifications');
      console.log('Order Service: Connected to RabbitMQ');
    }, { retries: 10, minTimeout: 5000 });
  } catch (err) {
    console.error('Order Service: Failed to connect to RabbitMQ after retries:', err);
    process.exit(1);
  }
}
connectRabbitMQ();

async function sendToRabbitMQ(message) {
  try {
    await retry(() => channel.sendToQueue('notifications', Buffer.from(message)), { retries: 3 });
    console.log('Order Service: Sent to RabbitMQ:', message);
  } catch (err) {
    console.error('Order Service: Failed to send to RabbitMQ:', err);
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
  res.send('Order Service is running');
});

app.post('/', authenticateToken, async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).send('Invalid items: must be a non-empty array');
  }
  try {
    const order = new Order({ items });
    await order.save();
    console.log(`Order Service (${os.hostname()}): Created order with ID:`, order._id);
    await sendToRabbitMQ(`Order ${order._id} created`);
    res.json({ message: 'Order created', orderId: order._id }); // Devuelve el orderId
  } catch (err) {
    console.error('Order Service: Error creating order:', err);
    res.status(500).send('Order failed: ' + err.message);
  }
});

app.listen(3003, () => {
  console.log('Order Service running on port 3003');
});