// Package import
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

// Node core import
const path = require('path');
const fs = require('fs');

// My import
const adminRoutes = require('./routes/admin.js');
const shopRoutes = require('./routes/shop.js');
const authRoutes = require('./routes/auth.js');
const errorController = require('./controllers/error.js');
const User = require('./models/userModel.js');


const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}
@cluster0.rf7zuzc.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}`;
const myStore = new MongoDBStore({
    uri: MONGODB_URI,
    collection: 'sessions'
});
const csrfProtection = csrf();
const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images');
    },
    filename: (req, file, cb) => {
        const date = Date.now();
        cb(null, date + '-' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    if (
        file.mimetype === 'image/png' ||
        file.mimetype === 'image/jpg' ||
        file.mimetype === 'image/jpeg'
    ) {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

const app = express();

// Change the settings of the application to accept the new view engine
// Define the location of the view files (root/views/...)
app.set('view engine', 'ejs');
app.set('views', 'views');

const accessLogStream = fs.createWriteStream(
    path.join(__dirname, 'access.log'), {flags: 'a'}
);
// Secure , Compression, log all the request
app.use(helmet());
app.use(compression());
app.use(morgan('combined', {stream: accessLogStream}));

// Middleware
// Receiving information from the user
// Loading the files statically at the moment of activating the application
app.use(bodyParser.urlencoded({extended: false}));
app.use(multer({storage: fileStorage, fileFilter: fileFilter}).single('image'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images',express.static(path.join(__dirname, 'images')));
app.use(session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store: myStore
}));
app.use(csrfProtection);
app.use(flash());

app.use((request, response, next) => {
    if (!request.session.user)
        return next();
    User.findById(request.session.user)
        .then(user => {
           if (!user) {
               return next();
           }
            request.user = user;
            next();
        })
        .catch(err => {
            next(new Error(err));
        })
});

// Forwarding variables to all renders view
app.use((request, response, next) => {
    response.locals.isAuthenticated = request.session.isLoggedIn;
    response.locals.csrfToken = request.csrfToken();
    next();
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get('/500', errorController.get500);
app.use(errorController.get404Page);

app.use((error, request, response, next) => {
    response.status(500).render('500', {
        pageTitle: 'Error!',
        path: '/500',
        isAuthenticated: request.session.isLoggedIn
    });
})

mongoose.connect(MONGODB_URI)
    .then(() => {
        app.listen(process.env.PORT || 3000);
    })
    .catch(err => console.log(err));




