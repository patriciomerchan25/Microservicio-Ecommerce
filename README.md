# Sistema de tienda en línea distribuida

El proyecto es un sistema de comercio electrónico distribuido construido utilizando una arquitectura de microservicios. Demuestra una tienda online totalmente funcional con servicios para gestionar productos, carritos, pedidos y notificaciones, junto con una interfaz frontend fácil de usar.

---

## Funcionalidad

Consiste en varios microservicios que se comunican entre sí para proporcionar una experiencia de compra fluida. El frontend permite a los usuarios navegar por los productos, añadirlos al carrito, ajustar las cantidades y pagar. Los servicios de backend gestionan el catálogo de productos, las operaciones del carrito, el procesamiento de pedidos y las notificaciones. 

---

## Tecnologías utilizadas

- **Frontend**: HTML, CSS, JavaScript  
- **Backend**: Node.js (Express.js)  
- **Database**: MongoDB  
- **Message Queue**: RabbitMQ  
- **Containerization**: Docker, Docker Compose  
- **Monitoring**: Prometheus, Grafana  
---

## Prerequisitos

- Docker and Docker Compose (se recomienda la última versión estable)  
- Node.js (v20.x recomendada para desarrollo frontend)  
- Git (para clonar el repositorio)  
- Ubuntu (o WSL en Windows) para desarrollo local
---

## Estructura del proyecto

- `frontend/`: Aplicación Frontend  (HTML, CSS, JavaScript).
- `catalog/`: Servicio de catalogo para gestión de productos (connected to MongoDB).
- `cart/`: Servicio de carrito para administrar carritos de compra (conectado a MongoDB, escalado a 3 instancias).
- `order/`: Servicio de pedidos para procesar pedidos (conectado a MongoDB, escalado a 3 instancias).
- `notification/`: Servicio de notificación para enviar mensajes a través de RabbitMQ.
- `prometheus/`: Configuración de Prometheus para la recopilación de métricas
- `grafana/`: Configuración de Grafana para visualizar métricas
- `docker-compose.yml`: Configuración de múltiples contenedores.

---

## Características de los microservicios

- **Exploración de productos**: Consulta los productos disponibles en el catálogo.
- **Gestión del carrito**: Añada productos al carrito, ajuste las cantidades con los botones "+" y "−" y elimine artículos.
- **Procesamiento de pedidos**: Complete las compras con un proceso de pago y reciba una confirmación del pedido.
- **Escalabilidad**: Servicios de carrito y pedidos con balanceo de carga en múltiples instancias.
- **Monitorización**: Visualización de métricas en tiempo real con Prometheus y Grafana.

---

## Monitoreo con Grafana

- Acceda a Grafana en [http://localhost:3000](http://localhost:3000).
- Utilice las credenciales predeterminadas: `admin/admin`.
- Cree o visualice paneles para monitorear métricas como el número de solicitudes HTTP para los servicios de carrito y pedido.
- Ejemplo de consulta PromQL para solicitudes de servicio de carrito:
  ```promql
  http_requests_total{job="cart"}

