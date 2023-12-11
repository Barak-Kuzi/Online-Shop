const Product = require('../models/productModel.js');
const Order = require('../models/order.js');

const fs = require('fs');
const path = require('path');

const PDFDocument = require('pdfkit');
const stripe = require('stripe')(`${process.env.STRIPE_SECRET_KEY}`);

const PROD_PER_PAGE = 1;

exports.getProducts = (request, response, next) => {
    const page = +request.query.page || 1;
    let totalProducts;
    Product.find()
        .countDocuments()
        .then(amountProducts => {
            totalProducts = amountProducts;
            return Product.find()
                .skip((page - 1) * PROD_PER_PAGE)
                .limit(PROD_PER_PAGE)
        })
        .then(products => {
            response.render('shop/product-list', {
                pageTitle: 'All Products',
                path: '/products',
                productArray: products,
                currentPage: page,
                previousPage: page - 1,
                nextPage: page + 1,
                lastPage: Math.ceil(totalProducts / PROD_PER_PAGE)
            });
        })
        .catch(err => {
            const error = new Error(err);
            err.httpStatusCode = 500;
            return next(error);
        });
};

exports.getIndex = (request, response, next) => {
    const page = +request.query.page || 1;
    let totalProducts;
    Product.find()
        .countDocuments()
        .then(amountProducts => {
            totalProducts = amountProducts;
            return Product.find()
                .skip((page - 1) * PROD_PER_PAGE)
                .limit(PROD_PER_PAGE)
        })
        .then(products => {
            response.render('shop/index', {
                pageTitle: 'Shop',
                path: '/',
                productArray: products,
                currentPage: page,
                previousPage: page - 1,
                nextPage: page + 1,
                lastPage: Math.ceil(totalProducts / PROD_PER_PAGE)
            });
        })
        .catch(err => {
            const error = new Error(err);
            err.httpStatusCode = 500;
            return next(error);
        });
};

exports.getProduct = (request, response, next) => {
    const productID = request.params.productId;
    Product.findById(productID)
        .then((product) => {
            response.render('shop/product-detail', {
                pageTitle: product.title,
                path: '/products',
                product: product
            });
        })
        .catch(err => {
            const error = new Error(err);
            err.httpStatusCode = 500;
            return next(error);
        });
};

exports.postCart = (request, response, next) => {
    const prodID = request.body.productId;
    Product.findById(prodID)
        .then(product => {
            return request.user.addProductToCart(product);
        })
        .then(result => {
            console.log(result);
            response.redirect('/cart');
        })
        .catch(err => {
            const error = new Error(err);
            err.httpStatusCode = 500;
            return next(error);
        });
}

exports.getCart = (request, response, next) => {
    request.user.populate('cart.items.productId')
        .then(user => {
            const cartProducts = user.cart.items;
            response.render('shop/cart', {
                pageTitle: 'Your Cart',
                path: '/cart',
                cartProducts: cartProducts
            });
        })
        .catch(err => {
            const error = new Error(err);
            err.httpStatusCode = 500;
            return next(error);
        });
};

exports.postCartDeleteProduct = (request, response, next) => {
    const prodId = request.body.productId;
    request.user.deleteProductFromCart(prodId)
        .then(result => {
            response.redirect('/cart');
        })
        .catch(err => {
            const error = new Error(err);
            err.httpStatusCode = 500;
            return next(error);
        });
}

exports.postOrders = (request, response, next) => {
    request.user.populate('cart.items.productId')
        .then(user => {
            const products = user.cart.items.map(prod => {
                return {product: {...prod.productId._doc}, quantity: prod.quantity}
            });
            const order = new Order({
                products: products,
                user: {
                    name: request.user.name,
                    email: request.user.email,
                    userId: request.user
                }
            })
            return order.save();
        })
        .then(() => {
            return request.user.clearCart();
        })
        .then(() => {
            response.redirect('/orders');
        })
        .catch(err => {
            const error = new Error(err);
            err.httpStatusCode = 500;
            return next(error);
        });
};

exports.getOrders = (request, response, next) => {
    Order.find({'user.userId': request.user._id})
        .then(orders => {
            console.log(orders);
            response.render('shop/orders', {
                pageTitle: 'Your Orders',
                path: '/orders',
                orders: orders
            });
        })
        .catch(err => {
            const error = new Error(err);
            err.httpStatusCode = 500;
            return next(error);
        });
};

exports.getCheckout = (request, response, next) => {
    let cartProducts;
    let total = 0;
    request.user.populate('cart.items.productId')
        .then(user => {
            cartProducts = user.cart.items;
            total = 0;
            cartProducts.forEach(prod => {
                total += prod.quantity * prod.productId.price;
            });

            return stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: cartProducts.map(prod => {
                    return {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: prod.productId.title
                            },
                            unit_amount: prod.productId.price * 100,
                        },
                        quantity: prod.quantity
                    }
                }),
                mode: 'payment',
                success_url: request.protocol + '://' + request.get('host') + '/checkout/success',
                cancel_url: request.protocol + '://' + request.get('host') + '/checkout/cancel'
            })
        })
        .then(session => {
            response.render('shop/checkout', {
                pageTitle: 'Checkout',
                path: '/checkout',
                cartProducts: cartProducts,
                totalSum: total,
                sessionId: session.id
            });
        })
        .catch(err => {
            const error = new Error(err);
            err.httpStatusCode = 500;
            return next(error);
        });
};

exports.getCheckoutSuccess = (request, response, next) => {
    request.user.populate('cart.items.productId')
        .then(user => {
            const products = user.cart.items.map(prod => {
                return {product: {...prod.productId._doc}, quantity: prod.quantity}
            });
            const order = new Order({
                products: products,
                user: {
                    name: request.user.name,
                    email: request.user.email,
                    userId: request.user
                }
            })
            return order.save();
        })
        .then(() => {
            return request.user.clearCart();
        })
        .then(() => {
            response.redirect('/orders');
        })
        .catch(err => {
            const error = new Error(err);
            err.httpStatusCode = 500;
            return next(error);
        });
};

exports.getInvoiceOrder = (request, response, next) => {
    const orderId = request.params.orderId;
    Order.findById(orderId)
        .then(order => {
            if (!order)
                return next(new Error('No order found'));

            if (order.user.userId.toString() !== request.user._id.toString())
                return next(new Error('Unauthorized'));

            const invoiceNameFile = `invoice-${orderId}.pdf`
            const invoicePath = path.join('data', 'invoices', invoiceNameFile)

            const pdfDoc = new PDFDocument();
            response.setHeader('Content-Type', 'application/pdf');
            response.setHeader('Content-Disposition', `inline; filename=${invoiceNameFile}`);
            pdfDoc.pipe(fs.createWriteStream(invoicePath));
            pdfDoc.pipe(response);

            pdfDoc.fontSize(26).text('Invoice', {underline: true});
            pdfDoc.text('----------------');
            let totalPrice = 0;
            order.products.forEach((prod, index) => {
                totalPrice += prod.quantity * prod.product.price;
                pdfDoc.fontSize(16).text(`${index + 1}) ${prod.product.title} - Price: ${prod.product.price}, Quantity: ${prod.quantity}`)
            })
            pdfDoc.fontSize(20).text('----------------');
            pdfDoc.fontSize(20).text(`Total Price: $${totalPrice}`);
            pdfDoc.end();
        })
        .catch(err => next(err));
}

