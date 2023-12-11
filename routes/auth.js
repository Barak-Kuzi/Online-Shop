// Package import
const express = require('express');
const expressValidator = require('express-validator');

// My import
const authController = require('../controllers/auth.js');
const User = require("../models/userModel");

const router = express.Router();

// Get Routes
router.get('/signup', authController.getSignup);

router.get('/login',authController.getLogin);

router.get('/reset', authController.getResetPassword);

router.get('/new-password/:token', authController.getNewPassword);

// Post Routes
router.post('/signup', [
        expressValidator.check('email').isEmail().withMessage('Please enter a valid email.')
            .custom((value, {req}) => {
                return User.findOne({email: value})
                    .then(userDoc => {
                        if (userDoc)
                            return Promise.reject('E-Mail exists already, please pick a different one.')
                    })
        }).normalizeEmail(),
        expressValidator.body('password', `Please enter a password with only numbers and
         text and least 5 characters.`)
            .isLength({min: 5}).isAlphanumeric().trim(),
        expressValidator.body('confirmPassword').trim()
            .custom((value, {req}) => {
            if (value !== req.body.password) {
                throw new Error('Passwords have to match, please try again.');
            }
            return true;
        })
    ], authController.postSignup);

router.post('/login', [
    expressValidator.body('email').isEmail().withMessage('Please enter a valid email.').normalizeEmail(),
    expressValidator.body('password', `Password has to be valid.`)
        .isLength({min: 5}).isAlphanumeric().trim()
], authController.postLogin);

router.post('/logout', authController.postLogout);

router.post('/reset', authController.postResetPassword);

router.post('/new-password', authController.postNewPassword);

module.exports = router;