// server/src/db/index.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let mongo = null;
try {
  mongo = require('./mongo');
} catch (e) {
  mongo = null;
}

const DATA_DIR = path.join(__dirname, '../../data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

/**
 * Production-Safe Persistent File-Backed Data Store
 * Persists data to server/data/store.json automatically on every change.
 */
class PersistentDatabase {
  constructor() {
    this.users = new Map();
    this.orders = new Map();
    this.products = new Map();
    this.otps = new Map();
    this.auditLogs = [];

    this._ensureStorage();
    this._loadFromDisk();
    this._seedInitialData();
  }

  _ensureStorage() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (err) {
      console.warn('[DB Storage Init Notice]:', err.message);
    }
  }

  _loadFromDisk() {
    try {
      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, 'utf-8');
        const data = JSON.parse(raw);

        if (Array.isArray(data.users)) {
          data.users.forEach(u => this.users.set(u.id, u));
        }
        if (Array.isArray(data.orders)) {
          data.orders.forEach(o => this.orders.set(o.id, o));
        }
        if (Array.isArray(data.products)) {
          data.products.forEach(p => this.products.set(p.id, p));
        }
        if (Array.isArray(data.auditLogs)) {
          this.auditLogs = data.auditLogs;
        }
        console.log(`[DB] Loaded ${this.users.size} users, ${this.orders.size} orders, ${this.products.size} products from disk.`);
      }
    } catch (err) {
      console.warn('[DB Disk Load Error]:', err.message);
    }
  }

  _saveToDisk() {
    try {
      this._ensureStorage();
      const payload = {
        users: Array.from(this.users.values()),
        orders: Array.from(this.orders.values()),
        products: Array.from(this.products.values()),
        auditLogs: this.auditLogs.slice(-200),
        lastSaved: new Date().toISOString()
      };
      fs.writeFileSync(STORE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[DB Disk Save Error]:', err.message);
    }
  }

  _seedInitialData() {
    // Seed default admin account if not present
    const hasAdmin = Array.from(this.users.values()).some(u => u.role === 'admin');
    if (!hasAdmin) {
      // Default admin password: Admin@Varshan2026 (hashed with scrypt)
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.scryptSync('Admin@Varshan2026', salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
      const adminId = 'admin-root-01';
      this.users.set(adminId, {
        id: adminId,
        email: 'admin@varshanchemicals.com',
        passwordHash: `scrypt:${salt}:${hash}`,
        name: 'Varshan Admin',
        role: 'admin',
        createdAt: new Date().toISOString()
      });
    }

    // Seed core products if empty
    if (this.products.size === 0) {
      const seedCatalog = [
        {
          id: 'pin-oil-1l',
          title: 'VARSHAN Pin-Oil Formula Disinfectant Cleaner (1 L Bottle)',
          price: 160,
          mrp: 220,
          cat: 'floor',
          pack: '1 L Bottle',
          stock: 65,
          img: 'varshan_phenyl_perfect.png'
        },
        {
          id: 'french-rose-1l',
          title: 'VARSHAN French Rose Surface Cleaner & Room Freshener (1 L)',
          price: 169,
          mrp: 240,
          cat: 'floor',
          pack: '1 L Bottle',
          stock: 45,
          img: 'varshan_rose_phenyl.png'
        },
        {
          id: 'toilet-cleaner-10x',
          title: 'VARSHAN 10X Power Blue Toilet Bowl Cleaner (1 L)',
          price: 155,
          mrp: 210,
          cat: 'toilet',
          pack: '1 L Bottle',
          stock: 55,
          img: 'varshan_toilet_cleaner_real.png'
        },
        {
          id: 'soap-oil-5l',
          title: 'VARSHAN Concentrated Soap Oil Can (5 L)',
          price: 349,
          mrp: 450,
          cat: 'floor',
          pack: '5 L Can',
          stock: 30,
          img: 'varshan_soap_oil.png'
        },
        {
          id: 'dishwash-lemon-can-5l',
          title: 'VARSHAN Lime Active Dishwash Gel Can (5 L Bulk)',
          price: 299,
          mrp: 380,
          cat: 'kitchen',
          pack: '5 L Can',
          stock: 40,
          img: 'varshan_dishwash_gel.png'
        },
        {
          id: 'glass-cleaner-500ml',
          title: 'VARSHAN Streak-Free Glass & Mirror Cleaner Spray (500 ml)',
          price: 119,
          mrp: 160,
          cat: 'kitchen',
          pack: '500 ml Spray',
          stock: 50,
          img: 'varshan_glass_cleaner.png'
        },
        {
          id: 'caustic-soda-flakes-1kg',
          title: 'VARSHAN 99% Pure Caustic Soda Flakes Heavy Degreaser (1 kg)',
          price: 135,
          mrp: 180,
          cat: 'kitchen',
          pack: '1 kg Pack',
          stock: 40,
          img: 'varshan_caustic_soda.png'
        },
        {
          id: 'bleaching-powder-1kg',
          title: 'VARSHAN Stable Bleaching Powder (Chlorine Disinfectant 1 kg)',
          price: 95,
          mrp: 140,
          cat: 'kitchen',
          pack: '1 kg Pack',
          stock: 60,
          img: 'varshan_bleaching_powder.png'
        }
      ];

      seedCatalog.forEach(p => this.products.set(p.id, p));
      this._saveToDisk();
    }
  }

  // ==========================================
  // USER REPOSITORY
  // ==========================================
  async createUser({ email, passwordHash, name, role = 'customer' }) {
    const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const user = {
      id,
      email: email.toLowerCase().trim(),
      passwordHash,
      name: name || 'Customer',
      role,
      createdAt: new Date().toISOString()
    };
    this.users.set(id, user);
    this._saveToDisk();
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  async findUserByEmail(email) {
    const cleanEmail = (email || '').toLowerCase().trim();
    for (const user of this.users.values()) {
      if (user.email === cleanEmail) {
        return user;
      }
    }
    return null;
  }

  async findUserById(id) {
    return this.users.get(id) || null;
  }

  _resolveProduct(itemId, itemTitle) {
    if (itemId && this.products.has(itemId)) {
      return this.products.get(itemId);
    }
    if (itemTitle) {
      const cleanTitle = itemTitle.toLowerCase().trim();
      for (const prod of this.products.values()) {
        if (prod.title && prod.title.toLowerCase().trim() === cleanTitle) {
          return prod;
        }
      }
      for (const prod of this.products.values()) {
        if (prod.title && (prod.title.toLowerCase().includes(cleanTitle) || cleanTitle.includes(prod.title.toLowerCase()))) {
          return prod;
        }
      }
    }
    return null;
  }

  // ==========================================
  // ORDER REPOSITORY & ATOMIC INVENTORY CONCURRENCY
  // ==========================================
  async checkBatchStock(items) {
    const results = [];
    let hasInsufficient = false;

    if (Array.isArray(items)) {
      items.forEach(item => {
        const prod = this._resolveProduct(item.id, item.name || item.title);
        const reqQty = Math.max(1, parseInt(item.quantity) || 1);
        const avail = prod ? (prod.stock !== undefined ? prod.stock : 50) : 50;
        const isSufficient = avail >= reqQty;
        if (!isSufficient) hasInsufficient = true;

        results.push({
          id: item.id,
          name: prod ? prod.title : (item.name || item.title || 'Product'),
          requested: reqQty,
          available: avail,
          isSufficient
        });
      });
    }

    return {
      allSufficient: !hasInsufficient,
      items: results
    };
  }

  async createOrder({ userId, items, totalAmount, shippingAddress, phone, paymentMethod, customerName, billNo }) {
    const validItems = Array.isArray(items) ? items : [];
    const matchedProducts = [];

    // 1. ATOMIC INVENTORY CHECK (Prevent Race Conditions / Overselling)
    for (const item of validItems) {
      const prod = this._resolveProduct(item.id, item.name || item.title);
      const requestedQty = Math.max(1, parseInt(item.quantity) || 1);

      if (prod) {
        const availableStock = prod.stock !== undefined ? prod.stock : 50;
        if (availableStock < requestedQty) {
          const err = new Error(`Insufficient stock for "${prod.title || item.name}". Available: ${availableStock}, Requested: ${requestedQty}.`);
          err.code = 'INSUFFICIENT_STOCK';
          err.itemTitle = prod.title || item.name || 'Chemical Product';
          err.availableStock = availableStock;
          err.requestedStock = requestedQty;
          throw err;
        }
        matchedProducts.push({ prod, qty: requestedQty });
      }
    }

    // 2. ATOMIC DECREMENT (Executed only when ALL cart items have verified stock)
    matchedProducts.forEach(({ prod, qty }) => {
      prod.stock = Math.max(0, (prod.stock !== undefined ? prod.stock : 50) - qty);
    });

    const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const orderNumber = billNo || `VC-${Math.floor(10000 + Math.random() * 90000)}`;

    const order = {
      id,
      orderNumber,
      userId: userId || `guest-${phone.replace(/\D/g, '').slice(-10)}`,
      customerName: customerName || 'Valued Customer',
      items: validItems,
      totalAmount: Number(totalAmount) || 0,
      shippingAddress: shippingAddress || 'Sivakasi Factory Dispatch',
      phone: phone || '',
      paymentMethod: paymentMethod || 'Cash on Delivery (COD)',
      status: 'Placed & Confirmed',
      adminConfirmed: false,
      createdAt: new Date().toISOString()
    };

    this.orders.set(id, order);
    this._saveToDisk();

    if (mongo && mongo.isMongoConnected() && mongo.OrderModel) {
      try {
        mongo.OrderModel.create({
          orderId: order.orderNumber,
          date: new Date().toISOString().slice(0, 10),
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          customer: {
            name: order.customerName,
            mobile: order.phone,
            address: order.shippingAddress
          },
          items: order.items,
          totalQty: order.items.reduce((s, it) => s + (parseInt(it.quantity) || 1), 0),
          grandTotal: order.totalAmount,
          paymentMode: order.paymentMethod,
          status: order.status,
          notes: ''
        }).catch(err => console.warn('[Mongo Order Create Notice]:', err.message));
      } catch (err) {}
    }

    return order;
  }

  async findOrderByIdAndUser(orderId, userId) {
    let order = this.orders.get(orderId);
    if (!order) {
      for (const o of this.orders.values()) {
        if (o.orderNumber === orderId || o.id === orderId) {
          order = o;
          break;
        }
      }
    }
    if (!order) return null;
    if (userId && order.userId !== userId) {
      return null; // IDOR Protection
    }
    return order;
  }

  async findOrdersByUser(userId) {
    const list = [];
    for (const order of this.orders.values()) {
      if (order.userId === userId) {
        list.push(order);
      }
    }
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async getAllOrders() {
    if (mongo && mongo.isMongoConnected() && mongo.OrderModel) {
      try {
        const mongoOrders = await mongo.OrderModel.find().sort({ createdAt: -1 }).lean().exec();
        if (mongoOrders && mongoOrders.length > 0) {
          return mongoOrders.map(mo => ({
            id: mo._id ? mo._id.toString() : mo.orderId,
            orderNumber: mo.orderId,
            orderId: mo.orderId,
            customerName: mo.customer?.name || 'Customer',
            shippingAddress: mo.customer?.address || '',
            phone: mo.customer?.mobile || '',
            items: mo.items || [],
            totalAmount: mo.grandTotal || 0,
            grandTotal: mo.grandTotal || 0,
            status: mo.status || 'Placed',
            createdAt: mo.createdAt || new Date().toISOString()
          }));
        }
      } catch (err) {
        console.warn('[Mongo Get Orders Notice]:', err.message);
      }
    }
    return Array.from(this.orders.values())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async updateOrderStatus(orderId, newStatus, meta = {}) {
    let order = this.orders.get(orderId);
    if (!order) {
      for (const o of this.orders.values()) {
        if (o.orderNumber === orderId || o.id === orderId) {
          order = o;
          break;
        }
      }
    }
    if (!order) return null;

    order.status = newStatus;
    if (meta.expectedDeliveryDate) order.expectedDeliveryDate = meta.expectedDeliveryDate;
    if (meta.expectedDeliveryTime) order.expectedDeliveryTime = meta.expectedDeliveryTime;
    if (meta.adminConfirmed !== undefined) order.adminConfirmed = meta.adminConfirmed;
    if (meta.adminConfirmedAt) order.adminConfirmedAt = meta.adminConfirmedAt;
    if (meta.customerReceivedConfirmation) {
      order.customerReceivedConfirmation = meta.customerReceivedConfirmation;
    }

    order.updatedAt = new Date().toISOString();
    this._saveToDisk();

    if (mongo && mongo.isMongoConnected() && mongo.OrderModel) {
      try {
        mongo.OrderModel.findOneAndUpdate(
          { $or: [{ orderId: orderId }, { orderId: order.orderNumber }] },
          { $set: { status: newStatus, ...meta } }
        ).catch(err => console.warn('[Mongo Order Update Notice]:', err.message));
      } catch (err) {}
    }

    return order;
  }

  // ==========================================
  // PRODUCT CATALOG REPOSITORY
  // ==========================================
  async getAllProducts() {
    return Array.from(this.products.values());
  }

  async getProductById(id) {
    return this.products.get(id) || null;
  }

  async saveProduct(data) {
    const id = data.id || `prod-${Date.now()}`;
    const product = {
      id,
      title: data.title,
      price: Number(data.price),
      mrp: Number(data.mrp) || Number(data.price),
      cat: data.cat || 'floor',
      img: data.img || 'varshan_phenyl_perfect.png',
      pack: data.pack || '1 L Bottle',
      stock: data.stock !== undefined ? Number(data.stock) : 50,
      updatedAt: new Date().toISOString()
    };
    this.products.set(id, product);
    this._saveToDisk();
    return product;
  }

  async updateProduct(id, updates) {
    const prod = this.products.get(id);
    if (!prod) return null;

    if (updates.title !== undefined) prod.title = updates.title;
    if (updates.price !== undefined) prod.price = Number(updates.price);
    if (updates.mrp !== undefined) prod.mrp = Number(updates.mrp);
    if (updates.cat !== undefined) prod.cat = updates.cat;
    if (updates.img !== undefined) prod.img = updates.img;
    if (updates.pack !== undefined) prod.pack = updates.pack;
    if (updates.stock !== undefined) prod.stock = Number(updates.stock);

    prod.updatedAt = new Date().toISOString();
    this._saveToDisk();
    return prod;
  }

  async deleteProduct(id) {
    const exists = this.products.has(id);
    if (exists) {
      this.products.delete(id);
      this._saveToDisk();
      return true;
    }
    return false;
  }

  // ==========================================
  // AUDIT LOG REPOSITORY
  // ==========================================
  logAudit(action, details, user = 'System') {
    const entry = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      timestamp: new Date().toISOString(),
      action,
      details,
      user
    };
    this.auditLogs.push(entry);
    this._saveToDisk();

    if (mongo && mongo.isMongoConnected() && mongo.AuditLogModel) {
      try {
        mongo.AuditLogModel.create({
          action,
          details: typeof details === 'object' ? JSON.stringify(details) : String(details),
          user,
          timestamp: new Date().toLocaleString('en-IN')
        }).catch(() => {});
      } catch (e) {}
    }

    return entry;
  }

  getAuditLogs(limit = 100) {
    return this.auditLogs.slice(-limit).reverse();
  }

  // ==========================================
  // OTP REPOSITORY
  // ==========================================
  async storeOtp(email, code, ttlMinutes = 5) {
    const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
    this.otps.set(email.toLowerCase().trim(), {
      code,
      expiresAt,
      attempts: 0
    });
  }

  async verifyOtp(email, inputCode) {
    const cleanEmail = (email || '').toLowerCase().trim();
    const record = this.otps.get(cleanEmail);

    if (!record) {
      return { valid: false, reason: 'OTP not requested or expired.' };
    }

    if (Date.now() > record.expiresAt) {
      this.otps.delete(cleanEmail);
      return { valid: false, reason: 'OTP has expired. Please request a new one.' };
    }

    record.attempts += 1;
    if (record.attempts > 3) {
      this.otps.delete(cleanEmail);
      return { valid: false, reason: 'Too many incorrect attempts. OTP invalidated.' };
    }

    const isMatch = crypto.timingSafeEqual(
      Buffer.from(record.code.toString().padEnd(6, ' ')),
      Buffer.from(inputCode.toString().padEnd(6, ' '))
    );

    if (isMatch) {
      this.otps.delete(cleanEmail);
      return { valid: true };
    }

    return { valid: false, reason: 'Incorrect OTP code.' };
  }

  // ==========================================
  // RAW MATERIALS REPOSITORY
  // ==========================================
  getRawMaterials() {
    if (!this.rawMaterials) {
      this.rawMaterials = [
        { id: 'raw_labsa', name: 'LABSA 90% (Acid Slurry)', stock: 420, unit: 'Kg', cost: 140, min: 100 },
        { id: 'raw_pine', name: 'Pine Oil 85% (Commercial)', stock: 280, unit: 'Litres', cost: 190, min: 80 },
        { id: 'raw_bkc', name: 'BKC 50% Disinfectant', stock: 140, unit: 'Litres', cost: 120, min: 50 },
        { id: 'raw_caustic', name: 'Caustic Soda Lye / Flakes', stock: 310, unit: 'Kg', cost: 65, min: 80 },
        { id: 'raw_perfume', name: 'French Rose & Pine Perfumes', stock: 45, unit: 'Litres', cost: 480, min: 30 },
        { id: 'raw_bottle1l', name: '1L HDPE Bottles & Caps', stock: 1850, unit: 'Pcs', cost: 7.5, min: 500 },
        { id: 'raw_can5l', name: '5L Heavy Canisters', stock: 340, unit: 'Pcs', cost: 28, min: 100 }
      ];
    }
    return this.rawMaterials;
  }

  adjustRawMaterial(id, delta) {
    const list = this.getRawMaterials();
    const item = list.find(r => r.id === id);
    if (item) {
      item.stock = Math.max(0, item.stock + delta);
      this._saveToDisk();

      if (mongo && mongo.isMongoConnected() && mongo.RawMaterialModel) {
        try {
          mongo.RawMaterialModel.findOneAndUpdate(
            { id: item.id },
            { $set: { stock: item.stock, name: item.name, unit: item.unit, cost: item.cost, min: item.min } },
            { upsert: true }
          ).catch(() => {});
        } catch (e) {}
      }
    }
    return item;
  }

  // ==========================================
  // PROCUREMENT REPOSITORY
  // ==========================================
  getPurchaseOrders() {
    if (!this.purchaseOrders) {
      this.purchaseOrders = [
        { poId: 'PO-2026-081', vendor: 'Manali Petrochem', material: '500 Kg LABSA 90%', amount: 70000, status: 'Received & Verified', chip: 'green' },
        { poId: 'PO-2026-082', vendor: 'Sivakasi Polymers', material: '2,000 HDPE Bottles', amount: 15000, status: 'Stocked in Plant', chip: 'green' },
        { poId: 'PO-2026-083', vendor: 'Tuticorin Alkali', material: '300 Kg Caustic Lye', amount: 19500, status: 'In Transit (Tomorrow)', chip: 'cyan' },
        { poId: 'PO-2026-084', vendor: 'Madurai Aroma Lab', material: '40 L Pine & Rose Essences', amount: 19200, status: 'PO Issued', chip: 'amber' }
      ];
    }
    return this.purchaseOrders;
  }

  addPurchaseOrder(po) {
    const list = this.getPurchaseOrders();
    list.unshift(po);
    this._saveToDisk();

    if (mongo && mongo.isMongoConnected() && mongo.PurchaseOrderModel) {
      try {
        mongo.PurchaseOrderModel.create({
          poId: po.poId,
          vendor: po.vendor,
          material: po.material,
          amount: Number(po.amount) || 0,
          status: po.status || 'PO Issued'
        }).catch(() => {});
      } catch (e) {}
    }

    return po;
  }

  // ==========================================
  // PROMOTIONS & COUPONS REPOSITORY
  // ==========================================
  getCoupons() {
    if (!this.coupons) {
      this.coupons = [
        { code: 'VARSHAN10', discount: '10% OFF', minSpend: '₹300', status: 'Active', active: true },
        { code: 'BULK50', discount: '₹50 OFF', minSpend: '₹500', status: 'Active', active: true },
        { code: 'HOTEL20', discount: '20% B2B', minSpend: '₹2,000', status: 'Active', active: true },
        { code: 'FESTIVE15', discount: '15% OFF', minSpend: '₹400', status: 'Draft', active: false }
      ];
    }
    return this.coupons;
  }

  addCoupon(coupon) {
    const list = this.getCoupons();
    list.unshift(coupon);
    this._saveToDisk();

    if (mongo && mongo.isMongoConnected() && mongo.CouponModel) {
      try {
        mongo.CouponModel.create({
          code: coupon.code,
          discount: coupon.discount,
          minSpend: coupon.minSpend,
          status: coupon.status || 'Active',
          active: coupon.active !== false
        }).catch(() => {});
      } catch (e) {}
    }

    return coupon;
  }
}

const db = new PersistentDatabase();
module.exports = db;
