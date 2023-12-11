const expressValidator = require('express-validator');
const Product = require('../models/productModel.js');
const fileHelper = require('../helper/fileHelper.js');


exports.getAddProduct = (request, response, next) => {
    response.render('admin/edit-product.ejs', {
        pageTitle: 'Add Product',
        path: '/admin/add-product',
        editProd: false,
        hasError: false,
        errorMessage: null,
        validationErrors: []
    });
}

// Passing data with POST Request
exports.postAddProduct = (request, response, next) => {
    const title = request.body.title;
    const image = request.file;
    const price = request.body.price;
    const description = request.body.description;
    const errors = expressValidator.validationResult(request);
    if (!image) {
        return response.status(422).render('admin/edit-product.ejs', {
            pageTitle: 'Add Product',
            path: '/admin/add-product',
            editProd: false,
            hasError: true,
            product: {
                title: title,
                price: price,
                description: description
            },
            errorMessage: 'Attached file is not an image',
            validationErrors: []
        });
    }
    const imageUrl = `/${image.path}`;
    if (!errors.isEmpty()) {
        return response.status(422).render('admin/edit-product.ejs', {
            pageTitle: 'Add Product',
            path: '/admin/add-product',
            editProd: false,
            hasError: true,
            product: {
                title: title,
                imageUrl: imageUrl,
                price: price,
                description: description
            },
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array()
        });
    }
    const product = new Product({
        title: title,
        price: price,
        description: description,
        imageUrl: imageUrl,
        userId: request.user
    });
    product.save()
        .then(result => {
            console.log('Created Product');
            response.redirect('/admin/products');
        })
        .catch(err => {
            const error = new Error(err);
            err.httpStatusCode = 500;
            return next(error);
        });
}

// // Using query params
exports.getEditProduct = (request, response, next) => {
    const editMode = request.query.edit;
    if (!editMode) {
        return response.redirect('/');
    }
    const prodID = request.params.productId;
    Product.findById(prodID)
        .then(product => {
            if (!product)
                response.redirect('/');

            response.render('admin/edit-product.ejs', {
                pageTitle: 'Edit Product',
                path: '/admin/edit-product',
                editProd: editMode,
                product: product,
                hasError: false,
                errorMessage: null,
                validationErrors: []
            });
        })
        .catch(err => {
            const error = new Error(err);
            err.httpStatusCode = 500;
            return next(error);
        });
}

exports.postEditProduct = (request, response, next) => {
    const prodId = request.body.productId;
    const updatedTitle = request.body.title;
    const image = request.file;
    const updatedPrice = request.body.price;
    const updatedDescription = request.body.description;
    const errors = expressValidator.validationResult(request);
    if (!errors.isEmpty()) {
        return response.status(422).render('admin/edit-product.ejs', {
            pageTitle: 'Edit Product',
            path: '/admin/edit-product',
            editProd: true,
            hasError: true,
            product: {
                _id: prodId,
                title: updatedTitle,
                price: updatedPrice,
                description: updatedDescription
            },
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array()
        });
    }
    Product.findById(prodId).then(product => {
        if (product.userId.toString() !== request.user._id.toString())
            return response.redirect('/');

        product.title = updatedTitle;
        product.price = updatedPrice;
        product.description = updatedDescription;
        if (image) {
            fileHelper.deleteFile(product.imageUrl);
            product.imageUrl = image.path;
        }
        return product.save()
            .then(() => {
            console.log('--- The Product Updated! ---');
            response.redirect('/admin/products');
        })
    })
        .catch(err => {
            const error = new Error(err);
            err.httpStatusCode = 500;
            return next(error);
        });
}

exports.getProducts = (request, response, next) => {
    Product.find({userId: request.user._id})
        // .select('title price -_id')
        // .populate('userId', 'name')
        .then(products => {
            // console.log(products)
            response.render('admin/products', {
                pageTitle: 'Shop',
                path: '/admin/products',
                productArray: products
            });
        })
        .catch(err => {
            const error = new Error(err);
            err.httpStatusCode = 500;
            return next(error);
        });
}

exports.deleteProduct = (request, response, next) => {
    const productId = request.params.productId;
    Product.findById(productId)
        .then(product => {
            if (!product)
                return next(new Error('Product not found.'));

            fileHelper.deleteFile(product.imageUrl);
            return Product.deleteOne({_id: productId, userId: request.user._id})
        })
        .then(() => {
            console.log('--- The Product Deleted! ---');
            response.status(200).json({message: 'Success!'});
        })
        .catch(err => {
            response.status(200).json({message: 'Deleting product failed!'});
        });


}