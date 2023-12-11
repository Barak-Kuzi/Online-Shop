const crypto = require('crypto');
const bcryptjs = require('bcryptjs');
const User = require("../models/userModel.js");
const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    auth: {
        user: "barakkuzi1994@gmail.com",
        pass: "xsmtpsib-d276cd3796256b5546f2777a95bdde0054b1cdaaaa4b7b9a67353dbc72f4cf03-31ZVxAWC9P0MwXaL",
    },
});
const expressValidator = require('express-validator');


exports.getSignup = (request, response, next) => {
    let message = request.flash('error');
    message.length > 0 ? message = message[0] : message = null;
    response.render('auth/signup', {
        path: '/signup',
        pageTitle: 'Signup',
        errorMessage: message,
        oldInput: {
            name: '',
            email: '',
            password: '',
            confirmPassword: ''
        },
        validationErrors: []
    });
};

exports.getLogin = (request, response, next) => {
    let message = request.flash('error');
    message.length > 0 ? message = message[0] : message = null;
    response.render('auth/login', {
        pageTitle: 'Login',
        path: '/login',
        errorMessage: message,
        oldInput: {
            email: '',
            pass: ''
        },
        validationErrors: []
    });
};

exports.postSignup = (request, response, next) => {
    const name = request.body.name;
    const email = request.body.email;
    const password = request.body.password;
    const errors = expressValidator.validationResult(request);
    console.log(errors.array())
    if (!errors.isEmpty()) {
        return response.status(422).render('auth/signup', {
            path: '/signup',
            pageTitle: 'Signup',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                name: name,
                email: email,
                password: password,
                confirmPassword: request.body.confirmPassword
            },
            validationErrors: errors.array()
        });
    }

    bcryptjs.hash(password, 12)
        .then(hashPassword => {
            const user = new User({
                name: name,
                email: email,
                password: hashPassword,
                cart: {items: [] }
            })
            return user.save();
        })
        .then(result => {
            response.redirect('/login');
            return transporter.sendMail({
                from: 'info@online-shop.com',
                to: email,
                subject: 'Signup succeeded!',
                html: '<h1>You Successfully signed up!</h1>'
            })
        })
        .catch(err => {
            const error = new Error(err);
            err.httpStatusCode = 500;
            return next(error);
        });
}

exports.postLogin = (request, response, next) => {
    const email = request.body.email;
    const password = request.body.password;
    const errors = expressValidator.validationResult(request);
    if (!errors.isEmpty()) {
        return response.status(422).render('auth/login', {
            pageTitle: 'Login',
            path: '/login',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email: email,
                password: password
            },
            validationErrors: errors.array()
        });
    }
    User.findOne({email: email})
        .then(user => {
            if (!user) {
                return response.status(422).render('auth/login', {
                    pageTitle: 'Login',
                    path: '/login',
                    errorMessage: 'Invalid email or password.',
                    oldInput: {
                        email: email,
                        password: password
                    },
                    validationErrors: []
                });
            }
            bcryptjs.compare(password, user.password)
                .then(doMatch => {
                    if (!doMatch) {
                        return response.status(422).render('auth/login', {
                            pageTitle: 'Login',
                            path: '/login',
                            errorMessage: 'Invalid email or password.',
                            oldInput: {
                                email: email,
                                password: password
                            },
                            validationErrors: []
                        });
                    }
                    request.session.isLoggedIn = true;
                    request.session.user = user;
                    return request.session.save((err) => {
                        console.log(err);
                        response.redirect('/');
                    });
                }).catch(err => {
                    const error = new Error(err);
                    err.httpStatusCode = 500;
                    return next(error);
                });
        }).catch(err => {
            const error = new Error(err);
            err.httpStatusCode = 500;
            return next(error);
        });
};

exports.postLogout = (request, response, next) => {
    request.session.destroy((err) => {
        console.log('postLogout Function', err);
        response.redirect('/');
    })
};

exports.getResetPassword = (request, response, next) => {
    let message = request.flash('error');
    message.length > 0 ? message = message[0] : message = null;
    response.render('auth/reset', {
        pageTitle: 'Reset Password',
        path: '/reset',
        errorMessage: message
    });
}

exports.postResetPassword = (request, response, next) => {
    crypto.randomBytes(32, (err, buffer) => {
        if (err){
            console.log(err);
            response.redirect('/reset');
        }
        const token = buffer.toString('hex');
        User.findOne({email: request.body.email})
            .then(user => {
                if (!user) {
                    request.flash('error', 'No account with that email found.');
                    return response.redirect('/reset');
                }
                user.resetToken = token;
                user.resetTokenExpiration = Date.now() + (60 * 60 * 1000);
                return user.save();
            })
            .then(result => {
                transporter.sendMail({
                    from: 'info@online-shop.com',
                    to: request.body.email,
                    subject: 'Password reset',
                    html: `
                    <p>You requested a password reset</p>
                    <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password</p>`
                })
            })
            .catch(err => {
                const error = new Error(err);
                err.httpStatusCode = 500;
                return next(error);
            });
    })
}

exports.getNewPassword = (request, response, next) => {
    const token = request.params.token;
    User.findOne({resetToken: token, resetTokenExpiration: {$gt: Date.now()}})
        .then(user => {
            let message = request.flash('error');
            message.length > 0 ? message = message[0] : message = null;
            response.render('auth/new-password', {
                path: '/new-password',
                pageTitle: 'New Password',
                errorMessage: message,
                userId: user._id.toString(),
                passwordToken: token
            });
        })
        .catch(err => {
            const error = new Error(err);
            err.httpStatusCode = 500;
            return next(error);
        });
}

exports.postNewPassword = (request, response, next) => {
    const newPassword = request.body.password;
    const userId = request.body.userId;
    const passwordToken = request.body.passwordToken;
    let updatedUser;
    User.findOne({
        resetToken: passwordToken,
        resetTokenExpiration: {$gt: Date.now()},
        _id: userId
    })
        .then(user => {
            updatedUser = user;
            return bcryptjs.hash(newPassword, 12);
        })
        .then(hashedPassword => {
            updatedUser.password = hashedPassword;
            updatedUser.resetToken = undefined;
            updatedUser.resetTokenExpiration = undefined;
            return updatedUser.save();
        })
        .then(result => {
            response.redirect('/login')
        })
        .catch(err => {
            const error = new Error(err);
            err.httpStatusCode = 500;
            return next(error);
        });
}

