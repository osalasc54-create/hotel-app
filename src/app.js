require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth.routes');
const hotelRoutes = require('./routes/hotel.routes');
const reservationRoutes = require('./routes/reservation.routes');

// Stripe solo se carga si existe la clave
let paymentRoutes = null;
if (process.env.STRIPE_SECRET_KEY) {
  paymentRoutes = require('./routes/payment.routes');
}

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/reservations', reservationRoutes);

if (paymentRoutes) {
  app.use('/api/payments', paymentRoutes);
  logger.info('Rutas de Stripe activadas');
} else {
  logger.info('Rutas de Stripe desactivadas por falta de STRIPE_SECRET_KEY');
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  logger.info(`Servidor iniciado en puerto ${PORT}`);
});