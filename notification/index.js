const amqp = require('amqplib');

async function connectWithRetry() {
  let attempts = 0;
  const maxAttempts = 10;
  const retryInterval = 5000; // 5 segundos

  while (attempts < maxAttempts) {
    try {
      console.log(`Intento de conexion a RabbitMQ (attempt ${attempts + 1}/${maxAttempts})...`);
      const conn = await amqp.connect('amqp://rabbitmq');
      console.log('Servicio de notificación conectado a RabbitMQ');
      return conn;
    } catch (err) {
      attempts++;
      console.error(`No se ha podido conectar con RabbitMQ: ${err.message}. Retrying in ${retryInterval / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }
  }
  throw new Error('No se ha podido conectar a RabbitMQ tras el máximo de intentos');
}

async function processNotification(msg) {
  // Simula éxito o fallo aleatorio
  if (Math.random() < 0.3) {
    throw new Error('Fallo simulado');
  }
  console.log("Notificación procesada:", msg);
}

async function start() {
  try {
    const conn = await connectWithRetry();
    const channel = await conn.createChannel();
    await channel.assertQueue('notifications', {durable: true});

    console.log("Esperando notificaciones...");

    channel.consume('notifications', async (msg) => {
      const content = msg.content.toString();
      try {
        await processNotification(msg.content.toString());
        channel.ack(msg);
      } catch (err) {
        console.error('❌ Error al procesar:', err.message);
        // reintentamos en 5 segundos
        setTimeout(() => {
          channel.nack(msg, false, true); // true = requeue
        }, 5000);
      }
    });
    
    // Reconexión si la conexión muere
    conn.on('close', () => {
      console.error('RabbitMQ coneccion cerrada.Reconectando...');
      setTimeout(start, 5000); // Intenta reiniciar en 5 segundos
    });
    
    conn.on('error', (err) => {
      console.error('Error en conexión::', err.message);
    });
    
  } catch (err) {
    console.error('No se pudo conectar. Reintentando...', err.message);
    setTimeout(start, 5000); // Intenta reiniciar en 5 segundos
  }
}

start();