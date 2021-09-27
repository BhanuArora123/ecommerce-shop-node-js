const express = require("express");

const nonce = require("../middleware/nonce");

// const https = require("https");

// for creating a ssl certificate and public and private key

// run this command

// openssl req -nodes -new -x509 -keyout server.key -out server.cert

const mongoose = require("mongoose");

const fs = require("fs");

const compression = require("compression");

const helmet = require("helmet");

const morgan = require("morgan");

const User = require("../models/userMongo");

const auth = require("../controllers/auth");

const authen = require("../middleware/isAuth.js")

const orders = require("../controllers/ordersMongo");

const session = require("express-session");

const csrf = require("csurf");

const flash = require("connect-flash");
const path = require("path");

// const privateKey = fs.readFileSync(path.join(__dirname,"..","..","server.key"));

// const sslCertificate = fs.readFileSync(path.join(__dirname,"..","..","server.cert"));

const { check, body } = require("express-validator/check");

const mongodbSession = require("connect-mongodb-session")(session);

const store = new mongodbSession({
    uri: `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.kpq9o.mongodb.net/${process.env.MONGO_DATABASE}`,
    connection: "sessions"
})

const app = express();

const bodyParser = require("body-parser");

const multer = require("multer");

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "mvcshop1/images");
    },
    filename: (req, file, cb) => {
        cb(null, new Date().toISOString().replace(/:/g, '-') + "-" + file.originalname);
    }
})

const filefilter = (req, file, cb) => {
    if (file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
        cb(null, true);
    }
    else {
        cb(null, false);
    }
}



const errorPage = require("../controllers/error");

const productControl = require("../controllers/productMongoDb");

const cartControl = require("../controllers/cartHandler");


app.set("view engine", "ejs");
app.set("views", "mvcshop1/views");

app.use(helmet({
    contentSecurityPolicy:{
        useDefaults:true,
        directives:{
            "default-src":"'self'",
            "script-src":["'self'","cdn.jsdelivr.net","kit.fontawesome.com","ka-f.fontawesome.com","js.stripe.com"],
            "style-src":["'self'","cdn.jsdelivr.net","kit.fontawesome.com","'unsafe-inline'"],
            "connect-src":["'self'","ka-f.fontawesome.com"],
            "frame-src":["'self'","js.stripe.com"]
        }
    }
}));

app.use(compression());

console.log(path.join(__dirname, "..", "logs"))

let logFileStream = fs.createWriteStream(
    path.join(__dirname, "..", "logs","access.log"),
    {
        flags: "a"
    }
);

app.use(morgan('combined', { stream: logFileStream }))

app.use(bodyParser.urlencoded({ extended: false }));


app.use(multer({
    storage: fileStorage,
    fileFilter: filefilter
})
    .single("imageurl"));

app.use(session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store: store
}));

const csrfProtection = csrf();

app.use(csrfProtection);

app.use(flash());

app.use("/mvcshop1/public", express.static(path.join(__dirname, "../public")));

app.use("/mvcshop1/images", express.static(path.join(__dirname, "../images")));

app.use((req, res, next) => {
    if (req.session.user) {
        User.findById(req.session.user._id)
            .then((user) => {
                if (!(req.user)) {
                    req.user = user;
                }
                next();
            })
    }
    else {
        next();
    }
})

app.use((req, res, next) => {
    res.locals.loggedIn = req.session.loggedIn;
    res.locals.csrfToken = req.csrfToken();
    next();
})

app.post("/webhook",express.json(),(req,res,next) => {
    console.log(req.body.data);
    res.status(200).json({
        executed:true
    })
});

app.post("/updatePass",
    [
        body('pass', "please enter a password with atleast 16 characters")
            .isLength({ min: 16 })
            .trim()
    ]
    ,
    auth.postUpdate);

app.get("/reset/:token", auth.getNewPass);

app.get("/reset", auth.getReset);

app.post("/reset", auth.postReset);

app.get("/sign-up", auth.getSignup);

app.post("/sign-up",
    [
        check('email')
            .isEmail().
            withMessage("Please enter a valid email address")
            .custom((value, { req }) => {
                return User.findOne({ email: value })
                    .then((user) => {
                        if (user) {
                            return Promise.reject("Email already exists there !");
                        }
                    })
            })
            .normalizeEmail()
        ,
        body('pass', "please enter a password with atleast 16 characters")
            .isLength({ min: 16 })
            .trim()
        ,
        body('conPass')
            .trim()
            .custom((value, { req }) => {
                if (value !== req.body.pass) {
                    throw new Error("the passwords have to match!");
                }
                return true;
            })
    ]
    , auth.postSignup);

app.post("/logout", authen.isAuth, auth.postLogout);

app.get("/login", auth.getLogin);

app.post("/login",
    [
        check("email")
            .isEmail()
            .withMessage("Invalid email entered !")
            .normalizeEmail()
            .custom((value, { req }) => {
                return User.findOne({ email: value })
                    .then((user) => {
                        if (!user) {
                            return Promise.reject("Email doesn't exist ! Please &nbsp;<a href='/sign-up'>Sign up</a>&nbsp; here first")
                        }
                    })
            })
    ]
    , auth.postLogin);

app.get("/add-product",
    authen.isAuth,
    productControl.getAddProduct)

app.post("/products",
    [
        body("title", "the title must be of length less than 50 and must be a string")
            .isString()
            .isLength({
                min: 3,
                max: 80
            }),
        body('description', "the description must be of length greater than 15 and less than 200")
            .isLength({
                min: 15,
                max: 500
            }),
        body("price", "price should be numeric")
            .isNumeric()
    ]
    ,
    productControl.displayProduct);

app.use("/products", productControl.getProduct);

app.use("/product/:productId", productControl.productDesc);

app.use("/edit-product/:productId",
    authen.isAuth,
    productControl.editProduct);

app.delete("/delete/:productId", authen.isAuth, productControl.deleteProduct);

app.get("/checkout", authen.isAuth, cartControl.getCheckout);

app.use("/cart/delete/:productId", authen.isAuth, cartControl.deleteInCart);

app.post("/cart", authen.isAuth, cartControl.postCart);

app.use("/cart", authen.isAuth, cartControl.getCart);

app.get("/orders", authen.isAuth, orders.getOrder);

app.get("/checkout/success", authen.isAuth, orders.checkoutSuccess);

app.get("/checkout/cancel", authen.isAuth, cartControl.getCheckout);

app.use("/orders/:orderId/:productId", authen.isAuth, orders.orderDesc);

app.post("/invoice/orders/:orderId", authen.isAuth, orders.invoiceDownload);

app.get("/", productControl.homePage);

app.use((error,req,res,next) => {
    res.render("../views/errorPage.ejs",{
        status:error.statusCode,
        message:error.message,
        loggedIn:req.session != undefined ? req.session.loggedIn : undefined
    })
})

mongoose.connect(`mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.kpq9o.mongodb.net/${process.env.MONGO_DATABASE}?retryWrites=true&w=majority`)
    .then(() => {
        // https.createServer({key:privateKey,cert:sslCertificate},app).listen(3000);
        app.listen(process.env.PORT || 3000);
    })
    .catch((err) => {
        console.log(err);
    })
// mongoconnect().then(() => {
//     app.listen(3000);
// }).catch(err => console.log(err));
// https://picsum.photos/200/300

// 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