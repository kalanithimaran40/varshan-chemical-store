// server/src/controllers/orderController.js
const db = require('../db');

/**
 * Creates a new order (Authenticated user or Guest checkout)
 */
async function createOrder(req, res, next) {
  try {
    const userId = req.user ? req.user.id : null;
    const { items, totalAmount, shippingAddress, phone, paymentMethod, customerName, billNo } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item.' });
    }

    if (!shippingAddress || !phone) {
      return res.status(400).json({ error: 'Shipping address and phone number are required.' });
    }

    const order = await db.createOrder({
      userId,
      items,
      totalAmount: Number(totalAmount) || 0,
      shippingAddress,
      phone,
      paymentMethod: paymentMethod || 'Cash on Delivery (COD)',
      customerName: customerName || (req.user ? req.user.name : 'Customer'),
      billNo
    });

    db.logAudit('ORDER_CREATED', `Order #${order.orderNumber} created for ${order.customerName} (₹${order.totalAmount})`, req.user ? req.user.email : 'Guest');

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully.',
      order
    });
  } catch (error) {
    if (error.code === 'INSUFFICIENT_STOCK') {
      return res.status(409).json({
        success: false,
        error: 'INSUFFICIENT_STOCK',
        message: `Sorry, "${error.itemTitle}" has only ${error.availableStock} units remaining in stock. Another customer may have just ordered it.`,
        itemTitle: error.itemTitle,
        availableStock: error.availableStock,
        requestedStock: error.requestedStock
      });
    }
    next(error);
  }
}

/**
 * IDOR-PROTECTED: Fetch order details
 * Strictly requires either admin role or matching userId
 */
async function getOrderById(req, res, next) {
  try {
    const orderId = req.params.orderId;
    const authenticatedUserId = req.user
      ? (req.user.role === 'admin' ? null : req.user.id)
      : '__unauthenticated_guest__';

    const order = await db.findOrderByIdAndUser(orderId, authenticatedUserId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    return res.status(200).json({ success: true, order });
  } catch (error) {
    next(error);
  }
}

/**
 * Fetch orders for authenticated user
 */
async function getMyOrders(req, res, next) {
  try {
    const orders = await db.findOrdersByUser(req.user.id);
    return res.status(200).json({ success: true, orders });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Fetch all orders across store
 */
async function getAllOrders(req, res, next) {
  try {
    const orders = await db.getAllOrders();
    return res.status(200).json({ success: true, count: orders.length, orders });
  } catch (error) {
    next(error);
  }
}

/**
 * Update order status & delivery details (Admin or receipt confirmation)
 */
async function updateOrderStatus(req, res, next) {
  try {
    const { orderId } = req.params;
    const { status, expectedDeliveryDate, expectedDeliveryTime, adminConfirmed, customerReceivedConfirmation } = req.body;

    const updated = await db.updateOrderStatus(orderId, status, {
      expectedDeliveryDate,
      expectedDeliveryTime,
      adminConfirmed,
      customerReceivedConfirmation,
      adminConfirmedAt: new Date().toISOString()
    });

    if (!updated) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    db.logAudit('ORDER_STATUS_UPDATE', `Order #${updated.orderNumber || orderId} updated to "${status}"`, req.user ? req.user.email : 'Customer');

    return res.status(200).json({ success: true, order: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * Pre-flight Batch Stock Check (Clientside Cart Verification)
 */
async function checkStockAvailability(req, res, next) {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array is required.' });
    }
    const result = await db.checkBatchStock(items);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createOrder,
  getOrderById,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  checkStockAvailability
};
