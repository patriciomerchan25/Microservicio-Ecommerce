const express = require('express');
const os = require('os');
const promClient = require('prom-client');
const cors = require('cors');

const app = express();
app.use(express.json());
// app.use(cors({ origin: 'http://localhost:8080' }));

const API_TOKEN = process.env.API_TOKEN || 'my-secret-api-token-2025';
let cart = []; // Cambiar a una matriz de objetos  { productId, quantity }

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

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.status(401).send('No token provided');
  if (token !== API_TOKEN) return res.status(401).send('Invalid token');
  next();
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

app.post('/cart/add', authenticateToken, async (req, res) => {
  const { productId } = req.body;
  if (!productId || typeof productId !== 'string') {
    return res.status(400).send('Invalid productId');
  }
  const existingItem = cart.find(item => item.productId === productId);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ productId, quantity: 1 });
  }
  console.log(`Cart Service (${os.hostname()}): Product ${productId} added`);
  res.send('Producto agregado');
});

app.post('/cart/remove', authenticateToken, async (req, res) => {
  const { productId } = req.body;
  if (!productId || typeof productId !== 'string') {
    return res.status(400).send('Invalid productId');
  }
  const existingItem = cart.find(item => item.productId === productId);
  if (existingItem) {
    existingItem.quantity -= 1;
    if (existingItem.quantity <= 0) {
      cart = cart.filter(item => item.productId !== productId);
    }
  }
  console.log(`Cart Service (${os.hostname()}): Product ${productId} removed`);
  res.send('Producto eliminado');
});

app.get('/cart', authenticateToken, async (req, res) => {
  res.json(cart);
});

app.post('/cart/checkout', authenticateToken, async (req, res) => {
  cart = [];
  console.log(`Cart Service (${os.hostname()}): Compra realizada`);
  res.send('Compra realizada con éxito');
});

app.listen(3002, () => {
  console.log('Servicio de carrito ejecutándose en el puerto 3002');
});