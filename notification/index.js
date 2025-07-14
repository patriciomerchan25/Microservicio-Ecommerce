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

async function start() {
  try {
    const conn = await connectWithRetry();
    const channel = await conn.createChannel();
    await channel.assertQueue('notifications');
    console.log('Notification Service waiting for messages...');

    channel.consume('notifications', (msg) => {
      console.log('Received:', msg.content.toString());
      channel.ack(msg);
    });

    // Gestión de errores de conexión
    conn.on('error', (err) => {
      console.error('RabbitMQ connection error:', err.message);
    });

    conn.on('close', () => {
      console.error('RabbitMQ connection closed. Reconnecting...');
      setTimeout(start, 5000); // Intenta reiniciar en 5 segundos
    });
  } catch (err) {
    console.error('Failed to start Notification Service:', err.message);
    setTimeout(start, 5000); // Intenta reiniciar en 5 segundos
  }
}

start();