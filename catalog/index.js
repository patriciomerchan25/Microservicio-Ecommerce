const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect('mongodb://mongodb:27017/catalog', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const ProductSchema = new mongoose.Schema({
  id: String,
  name: String,
  price: Number
});
const Product = mongoose.model('Product', ProductSchema);

const initializeProducts = async () => {
  try {
    const count = await Product.countDocuments();
    if (count === 0) {
      const initialProducts = [
        { id: '1', name: 'Camiseta básica', price: 10 },
        { id: '2', name: 'Pantalón de mezclilla', price: 20 },
        { id: '3', name: 'Zapatos deportivos', price: 65 },
        { id: '4', name: 'Chaqueta impermeable', price: 80 },
        { id: '5', name: 'Gorra clásica', price: 10 },
        { id: '6', name: 'Mochila escolar', price: 35 },
        { id: '7', name: 'Reloj digital', price: 55 },
        { id: '8', name: 'Audífonos inalámbricos', price: 70 },
        { id: '9', name: 'Cartera de cuero', price: 25 },
        { id: '10', name: 'Bufanda de lana', price: 20 }
      ];
      await Product.insertMany(initialProducts);
      console.log('Productos iniciales añadidos a la base de datos');
    }
  } catch (err) {
    console.error('Error al inicializar productos:', err);
  }
};

initializeProducts();

app.get('/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    console.error('Error al recuperar productos:', err);
    res.status(500).send('Error al recuperar productos: ' + err.message);
  }
});

app.listen(3001, () => {
  console.log('Servicio de catálogo ejecutándose en el puerto 3001');
});