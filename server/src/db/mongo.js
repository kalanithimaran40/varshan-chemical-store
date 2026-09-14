// server/src/db/mongo.js
let mongoose;
try {
  mongoose = require('mongoose');
} catch (e) {
  mongoose = null;
}

let isConnected = false;

// 1. Schemas
let OrderModel = null;
let ProductModel = null;
let RawMaterialModel = null;
let PurchaseOrderModel = null;
let CouponModel = null;
let AuditLogModel = null;

if (mongoose) {
  const OrderSchema = new mongoose.Schema({
    orderId: { type: String, required: true, unique: true, index: true },
    date: { type: String, default: () => new Date().toISOString().slice(0, 10) },
    time: { type: String, default: () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) },
    customer: {
      name: { type: String, default: 'Customer' },
      mobile: { type: String, default: '' },
      address: { type: String, default: '' }
    },
    items: { type: Array, default: [] },
    totalQty: { type: Number, default: 1 },
    grandTotal: { type: Number, default: 0 },
    paymentMode: { type: String, default: 'Cash on Delivery (COD)' },
    status: { type: String, default: 'placed', index: true },
    notes: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
  });

  const ProductSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    category: { type: String, default: 'floor' },
    price: { type: Number, required: true },
    mrp: { type: Number, default: 0 },
    cost: { type: Number, default: 0 },
    stock: { type: Number, default: 50 },
    unitSize: { type: String, default: '1 L' },
    badge: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now }
  });

  const RawMaterialSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    stock: { type: Number, default: 100 },
    unit: { type: String, default: 'Kg' },
    cost: { type: Number, default: 0 },
    min: { type: Number, default: 50 }
  });

  const PurchaseOrderSchema = new mongoose.Schema({
    poId: { type: String, required: true, unique: true },
    vendor: { type: String, required: true },
    material: { type: String, required: true },
    amount: { type: Number, default: 0 },
    status: { type: String, default: 'PO Issued' },
    createdAt: { type: Date, default: Date.now }
  });

  const CouponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    discount: { type: String, default: '10% OFF' },
    minSpend: { type: String, default: '₹300' },
    status: { type: String, default: 'Active' },
    active: { type: Boolean, default: true }
  });

  const AuditLogSchema = new mongoose.Schema({
    timestamp: { type: String, default: () => new Date().toLocaleString('en-IN') },
    action: { type: String, required: true },
    details: { type: String, default: '' },
    user: { type: String, default: 'System Admin' },
    type: { type: String, default: 'audit' },
    createdAt: { type: Date, default: Date.now }
  });

  OrderModel = mongoose.models.Order || mongoose.model('Order', OrderSchema);
  ProductModel = mongoose.models.Product || mongoose.model('Product', ProductSchema);
  RawMaterialModel = mongoose.models.RawMaterial || mongoose.model('RawMaterial', RawMaterialSchema);
  PurchaseOrderModel = mongoose.models.PurchaseOrder || mongoose.model('PurchaseOrder', PurchaseOrderSchema);
  CouponModel = mongoose.models.Coupon || mongoose.model('Coupon', CouponSchema);
  AuditLogModel = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
}

/**
 * Connect to MongoDB Atlas
 */
async function connectMongo() {
  const uri = process.env.MONGO_URI;
  if (!uri || !mongoose) {
    console.log('[Database] No MONGO_URI provided in environment. Running with local persistent JSON store.');
    return false;
  }

  try {
    console.log('[MongoDB Atlas] Attempting to connect to Cloud Database...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log('=======================================================');
    console.log('🌿 [MongoDB Atlas] SUCCESS: Connected to Cloud Database!');
    console.log('=======================================================');
    return true;
  } catch (err) {
    console.warn('⚠️ [MongoDB Atlas] Connection failed. Safely falling back to local JSON store:', err.message);
    isConnected = false;
    return false;
  }
}

function isMongoConnected() {
  return isConnected && mongoose && mongoose.connection.readyState === 1;
}

module.exports = {
  connectMongo,
  isMongoConnected,
  OrderModel,
  ProductModel,
  RawMaterialModel,
  PurchaseOrderModel,
  CouponModel,
  AuditLogModel
};
