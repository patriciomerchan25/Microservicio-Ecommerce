// === Variables globales ===
const API_TOKEN = window.API_TOKEN || 'my-secret-api-token-2025';
let cart = [];

// === Funciones para trabajar con productos ===
async function loadProducts() {
  const productList = document.getElementById('productList');
  productList.innerHTML = '<p>Cargando productos...</p>';
  try {
    const response = await fetch('http://localhost:3001/products');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const products = await response.json();
    console.log('Productos cargados:', products);
    productList.innerHTML = '';
    if (products.length === 0) {
      productList.innerHTML = '<p>No hay productos disponibles</p>';
      return;
    }
    products.forEach(product => {
      console.log('Product:', product);
      console.log('Product ID:', product.id, 'Product _id:', product._id);
      const productId = product.id || product._id;
      if (!productId) {
        console.error('El producto no tiene un ID válido:', product);
        return;
      }
      const productDiv = document.createElement('div');
      productDiv.className = 'product-item';
      productDiv.innerHTML = `
        <span>${product.name} ($${product.price})</span>
        <button onclick="addToCart('${productId}', '${product.name}', ${product.price})">Agregar al carrito</button>
      `;
      productList.appendChild(productDiv);
    });
  } catch (error) {
    console.error('Error al cargar products:', error);
    productList.innerHTML = '<p>Error al cargar products: ' + error.message + '</p>';
  }
}

// === Funciones para trabajar con la cesta ===
async function addToCart(productId, productName, productPrice) {
  console.log('addToCart called with:', { productId, type: typeof productId }, productName, productPrice);
  const addMessage = document.getElementById('addMessage');
  console.log('API_TOKEN:', API_TOKEN);
  console.log('Authorization header:', `Bearer ${API_TOKEN}`);

  if (!productId || productId === 'undefined') {
    addMessage.textContent = 'Error: ID del producto no válido';
    addMessage.style.color = 'red';
    return;
  }

  try {
    const response = await fetch('http://localhost:3002/cart/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`
      },
      body: JSON.stringify({ productId })
    });

    if (response.ok) {
      const result = await response.text();
      addMessage.textContent = result;
      addMessage.style.color = 'green';

      console.log('Carrito actual:', cart);
      const existingItem = cart.find(item => {
        console.log('Comparando:', { itemId: item.id, type: typeof item.id }, { productId, type: typeof productId });
        return String(item.id) === String(productId);
      });
      if (existingItem) {
        existingItem.quantity += 1;
        console.log('Producto ya en carrito, se incrementa cantidad:', existingItem);
      } else {
        cart.push({ id: productId, name: productName, price: productPrice, quantity: 1 });
        console.log('Producto nuevo agregado al carrito:', { id: productId, name: productName, price: productPrice, quantity: 1 });
      }
      console.log('Carrito después de agregar:', cart);
      updateCartDisplay();
    } else {
      const error = await response.text();
      addMessage.textContent = error;
      addMessage.style.color = 'red';
    }
  } catch (error) {
    console.error('Error al agregar al carrito:', error);
    addMessage.textContent = 'Error: ' + error.message;
    addMessage.style.color = 'red';
  }
}

function updateCartDisplay() {
  const cartItems = document.getElementById('cartItems');
  cartItems.innerHTML = '';
  if (cart.length === 0) {
    cartItems.innerHTML = '<p>Tu carrito está vacío</p>';
  } else {
    cart.forEach((item, index) => {
      const cartItem = document.createElement('div');
      cartItem.className = 'cart-item';
      cartItem.innerHTML = `
        <span>${item.name} ($${item.price}) x ${item.quantity}</span>
        <button class="add-btn" onclick="addToCart('${item.id}', '${item.name}', ${item.price})">+</button>
        <button class="remove-btn" onclick="removeFromCart(${index})">-</button>
      `;
      cartItems.appendChild(cartItem);
    });

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalDiv = document.createElement('div');
    totalDiv.className = 'cart-total';
    totalDiv.innerHTML = `<strong>Total: $${total}</strong>`;
    cartItems.appendChild(totalDiv);
  }
}

function removeFromCart(index) {
  const item = cart[index];
  if (item.quantity > 1) {
    item.quantity -= 1;
  } else {
    cart.splice(index, 1);
  }
  updateCartDisplay();
}

// === Funciones para trabajar con la ventana modal ===
function showModal(message) {
  const modal = document.getElementById('orderModal');
  const orderMessage = document.getElementById('orderMessage');
  orderMessage.textContent = message;
  modal.style.display = 'block';
}

function closeModal() {
  const modal = document.getElementById('orderModal');
  modal.style.display = 'none';
}

// === Funciones para realizar un pedido ===
async function checkout() {
  try {
    const items = cart.map(item => item.id);
    if (items.length === 0) {
      showModal('Tu carrito está vacío!');
      return;
    }

    const response = await fetch('http://localhost:3003/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ items })
    });
    if (!response.ok) throw new Error('No se pudo completar la compra');

    const result = await response.json();
    const orderId = result.orderId;

    const clearCartResponse = await fetch('http://localhost:3002/cart/checkout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`
      }
    });
    if (!clearCartResponse.ok) throw new Error('No se pudo limpiar el carrito');

    cart = [];
    updateCartDisplay();
    showModal(`Compra realizada con éxito! Tu número de pedido es ${orderId}`);
  } catch (error) {
    console.error('Error durante el proceso de compra:', error);
    showModal('Error durante la compra: ' + error.message);
  }
}

// === Inicialización ===
window.onload = () => {
  loadProducts();
  updateCartDisplay();
};