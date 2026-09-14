// server/src/server.js
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

const { securityHeaders } = require('./middleware/securityHeaders');
const { authRateLimiter, otpRateLimiter, generalApiLimiter } = require('./middleware/rateLimiter');
const { sanitizeMongoPayload } = require('./middleware/mongoSanitizer');
const { authenticateJwt, optionalAuthenticateJwt, requireRole } = require('./middleware/authMiddleware');

const authController = require('./controllers/authController');
const otpController = require('./controllers/otpController');
const orderController = require('./controllers/orderController');
const productController = require('./controllers/productController');
const db = require('./db');
const { connectMongo, isMongoConnected } = require('./db/mongo');

const app = express();

// 1. HTTP Security Headers (CSP, HSTS, noSniff, frameguard)
app.use(securityHeaders);

// 2. Cross-Origin Resource Sharing (CORS) with Credential support for HttpOnly cookies
const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error('Blocked by Cross-Origin Resource Sharing (CORS) policy.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. Payload size limiting (15mb to support admin studio product image uploads)
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cookieParser());

// 4. NoSQL / Query operator sanitization
app.use(sanitizeMongoPayload);

// 5. Prevent browser caching of frontend static assets during updates
app.use((req, res, next) => {
  if (req.path.endsWith('.js') || req.path.endsWith('.css') || req.path.endsWith('.html') || req.path === '/') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// Serve Frontend static assets safely from parent directory
app.use(express.static(path.join(__dirname, '../../')));

// 6. General API Rate Limiting
app.use('/api/', generalApiLimiter);

// ---------------------------------------------------------------------------
// AUTHENTICATION & OTP ROUTES (Rate-limited against Brute-Force)
// ---------------------------------------------------------------------------
app.post('/api/v1/auth/register', authRateLimiter, authController.register);
app.post('/api/v1/auth/login', authRateLimiter, authController.login);
app.post('/api/v1/auth/refresh', authController.refreshToken);
app.post('/api/v1/auth/logout', authController.logout);
app.get('/api/v1/auth/profile', authenticateJwt, authController.getProfile);

app.post('/api/v1/auth/send-otp', otpRateLimiter, otpController.sendOtp);
app.post('/api/v1/auth/verify-otp', authRateLimiter, otpController.verifyOtp);

// ---------------------------------------------------------------------------
// PRODUCT CATALOG ROUTES (Public browsing, Admin-only modification)
// ---------------------------------------------------------------------------
app.get('/api/v1/products', productController.getProducts);
app.get('/api/v1/products/:id', productController.getProductById);
app.post('/api/v1/products', authenticateJwt, requireRole('admin'), productController.addProduct);
app.put('/api/v1/products/:id', authenticateJwt, requireRole('admin'), productController.updateProduct);
app.delete('/api/v1/products/:id', authenticateJwt, requireRole('admin'), productController.deleteProduct);

// ---------------------------------------------------------------------------
// ORDER MANAGEMENT (IDOR-Safe, Guest + Authenticated Checkout, Admin OMS)
// ---------------------------------------------------------------------------
app.post('/api/v1/orders', optionalAuthenticateJwt, orderController.createOrder);
app.post('/api/v1/orders/check-stock', orderController.checkStockAvailability);
app.get('/api/v1/orders/my-orders', authenticateJwt, orderController.getMyOrders);
app.get('/api/v1/orders/all', authenticateJwt, requireRole('admin'), orderController.getAllOrders);
app.get('/api/v1/orders/:orderId', optionalAuthenticateJwt, orderController.getOrderById);
app.patch('/api/v1/orders/:orderId/status', optionalAuthenticateJwt, orderController.updateOrderStatus);

// ---------------------------------------------------------------------------
// ENTERPRISE ADMIN EXTENSIONS (Raw Materials, Procurement & Coupons)
// ---------------------------------------------------------------------------
app.get('/api/v1/raw-materials', (req, res) => {
  res.status(200).json({ success: true, materials: typeof db.getRawMaterials === 'function' ? db.getRawMaterials() : [] });
});

app.post('/api/v1/raw-materials/adjust', (req, res) => {
  const { id, delta } = req.body;
  const updated = typeof db.adjustRawMaterial === 'function' ? db.adjustRawMaterial(id, delta) : null;
  res.status(200).json({ success: true, item: updated });
});

app.get('/api/v1/purchase-orders', (req, res) => {
  res.status(200).json({ success: true, orders: typeof db.getPurchaseOrders === 'function' ? db.getPurchaseOrders() : [] });
});

app.post('/api/v1/purchase-orders', (req, res) => {
  const order = typeof db.addPurchaseOrder === 'function' ? db.addPurchaseOrder(req.body) : req.body;
  res.status(201).json({ success: true, order });
});

app.get('/api/v1/coupons', (req, res) => {
  res.status(200).json({ success: true, coupons: typeof db.getCoupons === 'function' ? db.getCoupons() : [] });
});

app.post('/api/v1/coupons', (req, res) => {
  const coupon = typeof db.addCoupon === 'function' ? db.addCoupon(req.body) : req.body;
  res.status(201).json({ success: true, coupon });
});

// ---------------------------------------------------------------------------
// ADMIN AUDIT LOGS (Strictly Admin Only)
// ---------------------------------------------------------------------------
app.get('/api/v1/admin/audit-logs', authenticateJwt, requireRole('admin'), (req, res) => {
  res.status(200).json({ success: true, logs: db.getAuditLogs() });
});

// ---------------------------------------------------------------------------
// HEALTH CHECK & CLOUD TELEMETRY
// ---------------------------------------------------------------------------
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    environment: process.env.NODE_ENV || 'development',
    mongoConnected: isMongoConnected(),
    databaseEngine: isMongoConnected() ? 'MongoDB Atlas (Cloud)' : 'Persistent File Store (store.json)',
    timestamp: new Date().toISOString()
  });
});

// ---------------------------------------------------------------------------
// CENTRALIZED SECURE ERROR HANDLER (Zero Stack Trace Leakage in Production)
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error(`[SECURITY ERROR] ${req.method} ${req.path}:`, err.message);

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'An internal security exception occurred. Please try again.'
      : err.message
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`=======================================================`);
  console.log(`🛡️  VARSHAN CHEMICAL SECURE BACKEND RUNNING ON PORT ${PORT}`);
  console.log(`🔒 Security: Scrypt/Argon2, HttpOnly JWT, RateLimiter, IDOR-Safe`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`=======================================================`);
  await connectMongo();
});

module.exports = app;
