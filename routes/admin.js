// Package import
const express = require('express');
const expressValidator = require('express-validator');

// My import
const adminController = require('../controllers/admin.js');
const isAuthentication = require('../middleware/is-auth.js');

const router = express.Router();

// /admin/'path' => GET
router.get('/add-product', isAuthentication, adminController.getAddProduct);

router.get('/products', isAuthentication, adminController.getProducts);

// /:productId => request.params.productId
router.get('/edit-product/:productId', isAuthentication, adminController.getEditProduct);

// /admin/'path' => POST
router.post('/add-product', isAuthentication, [
    expressValidator.body('title').isString().isLength({min: 3}).trim(),
    expressValidator.body('price').isFloat(),
    expressValidator.body('description').isLength({min: 5, max: 200}).trim()
], adminController.postAddProduct);

router.post('/edit-product', isAuthentication, [
    expressValidator.body('title').isString().isLength({min: 3}).trim(),
    expressValidator.body('price').isFloat(),
    expressValidator.body('description').isLength({min: 5, max: 200}).trim()
], adminController.postEditProduct);

router.delete('/product/:productId', isAuthentication, adminController.deleteProduct);

module.exports = router;