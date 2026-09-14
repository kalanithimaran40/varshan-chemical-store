// server/src/controllers/productController.js
const db = require('../db');

/**
 * Get all chemical products from store catalog
 */
async function getProducts(req, res, next) {
  try {
    const products = await db.getAllProducts();
    return res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single product by ID
 */
async function getProductById(req, res, next) {
  try {
    const { id } = req.params;
    const product = await db.getProductById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    return res.status(200).json({ success: true, product });
  } catch (error) {
    next(error);
  }
}

/**
 * Add a new product (Admin only)
 */
async function addProduct(req, res, next) {
  try {
    const { title, price, mrp, cat, img, pack, stock } = req.body;

    if (!title || !price) {
      return res.status(400).json({ error: 'Product title and price are required.' });
    }

    const newProduct = await db.saveProduct({
      title,
      price: Number(price),
      mrp: Number(mrp) || Number(price),
      cat: cat || 'floor',
      img: img || 'varshan_phenyl_perfect.png',
      pack: pack || '1 L Bottle',
      stock: stock !== undefined ? Number(stock) : 50
    });

    return res.status(201).json({
      success: true,
      message: 'Product added successfully.',
      product: newProduct
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update existing product (Admin only)
 */
async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updated = await db.updateProduct(id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      product: updated
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete product (Admin only)
 */
async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;
    const deleted = await db.deleteProduct(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Product removed successfully.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct
};
