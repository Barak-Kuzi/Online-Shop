const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    resetToken: String,
    resetTokenExpiration: Date,
    cart: {
        items: [{
            productId: {type: Schema.Types.ObjectId, ref: 'Product', required: true},
            quantity: {type: Number, required: true}
        }]
    }
})

userSchema.methods.deleteProductFromCart = function (productId){
    const updatedCart = this.cart.items.filter(prod => {
        return prod.productId.toString() !== productId.toString()
        })
    this.cart.items = updatedCart;
    return this.save();
}

userSchema.methods.addProductToCart = function (product) {
    const cartProductIndex = this.cart.items.findIndex(currentProduct => {
        return currentProduct.productId.toString() === product._id.toString();
    });
    let newQuantity = 1;
    const updatedCartProducts = [...this.cart.items];
    if (cartProductIndex !== -1) {
        newQuantity = updatedCartProducts[cartProductIndex].quantity + 1;
        updatedCartProducts[cartProductIndex].quantity = newQuantity;
    } else {
        updatedCartProducts.push({productId: product._id, quantity: newQuantity});
    }
    this.cart = {items: updatedCartProducts};
    return this.save();
}

userSchema.methods.clearCart = function () {
    this.cart = {items: []};
    return this.save();
}

module.exports = mongoose.model('User', userSchema);
