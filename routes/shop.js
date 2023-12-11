// Package import
const express = require('express');

// Node core import
const myPath = require('path');

// My import
const shopController = require('../controllers/shop.js');
const isAuthentication = require("../middleware/is-auth");

const router = express.Router();

router.get('/', shopController.getIndex);

router.get('/products', shopController.getProducts);

router.get('/products/:productId', shopController.getProduct);

router.post('/cart', isAuthentication, shopController.postCart);

router.get('/cart', isAuthentication, shopController.getCart);

router.post('/delete-item-from-cart', isAuthentication, shopController.postCartDeleteProduct);

// router.post('/create-order', isAuthentication, shopController.postOrders);

router.get('/orders', isAuthentication, shopController.getOrders);

router.get('/orders/:orderId', isAuthentication, shopController.getInvoiceOrder);

router.get('/checkout', isAuthentication, shopController.getCheckout);

router.get('/checkout/success', shopController.getCheckoutSuccess);

router.get('/checkout/cancel', shopController.getCheckout);

module.exports = router;