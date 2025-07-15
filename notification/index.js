const amqp = require('amqplib');

async function connectWithRetry() {
  let attempts = 0;
  const maxAttempts = 10;
  const retryInterval = 5000; // 5 segundos

  while (attempts < maxAttempts) {
    try {
      console.log(`Attempting to connect to RabbitMQ (attempt ${attempts + 1}/${maxAttempts})...`);
      const conn = await amqp.connect('amqp://rabbitmq');
      console.log('Notification Service connected to RabbitMQ');
      return conn;
    } catch (err) {
      attempts++;
      console.error(`Failed to connect to RabbitMQ: ${err.message}. Retrying in ${retryInterval / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }
  }
  throw new Error('Could not connect to RabbitMQ after maximum attempts');
}

async function processNotification(msg) {
  // Simula éxito o fallo aleatorio
  if (Math.random() < 0.3) {
    throw new Error("Simulated processing failure");
  }
  console.log("✅ Processed notification:", msg);
}

async function start() {
  try {
    const conn = await connectWithRetry();
    const channel = await conn.createChannel();
    await channel.assertQueue('notifications', {durable: true});
    console.log('Notification Service waiting for messages...');

    channel.consume('notifications', async (msg) => {
      const content = msg.content.toString();
      try {
        console.log('Received:', content);
        await processNotification(content); // <-- lo que haría realmente
        channel.ack(msg); // confirmamos que se procesó
      } catch (err) {
        console.error('Processing failed:', err.message);
        
        // 🔁 reintentamos en 5 segundos
        setTimeout(() => {
          channel.nack(msg, false, true); // true = requeue
        }, 5000);
      }
    });

    // Gestión de errores de conexión
    conn.on('error', (err) => {
      console.error('RabbitMQ connection error:', err.message);
    });

    conn.on('close', () => {
      console.error('RabbitMQ coneccion cerrada.Reconectando...');
      setTimeout(start, 5000); // Intenta reiniciar en 5 segundos
    });
  } catch (err) {
    console.error('Failed to start Notification Service:', err.message);
    setTimeout(start, 5000); // Intenta reiniciar en 5 segundos
  }
}

start();