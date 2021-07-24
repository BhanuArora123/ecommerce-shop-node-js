const crypto = require("crypto");
let User = require("../models/userMongo");
let bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { validationResult } = require("express-validator");
const { google } = require("googleapis");
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
console.log(CLIENT_ID+CLIENT_SECRET+REDIRECT_URI+REFRESH_TOKEN)
const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oauth2Client.setCredentials({
    refresh_token: REFRESH_TOKEN
});
const accessToken = oauth2Client.getAccessToken().catch((err) => {
    let error = new Error(err);
    error.statusCode = 400;
    return next(error);
});
const transporter = nodemailer.createTransport(
    {
        service: 'gmail', // no need to set host or port etc.
        auth: {
            type: "OAuth2",
            user: process.env.EMAIL,
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            refreshToken: REFRESH_TOKEN,
            accessToken: accessToken
        }
    }
)
exports.getLogin = (req, res, next) => {
    let loggedIn = req.session.loggedIn;
    res.render("../views/login.ejs", {
        loggedIn: loggedIn,
        errors: [],
        successMessage: req.flash("success")[0],
        oldInput: {
            email: '',
            pass: ''
        }
    });
}
exports.postLogin = (req, res, next) => {
    let email = req.body.email;
    let password = req.body.pass;
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render("../views/login.ejs", {
            errors: errors.array(),
            successMessage: undefined,
            oldInput: {
                email: email,
                pass: password
            }
        })
    }
    User.findOne({ email: email })
        .then((user) => {
            bcrypt.compare(password, user.password)
                .then((isMatched) => {
                    if (!isMatched) {
                        return res.render("../views/login.ejs", {
                            errors: [{
                                param: 'pass',
                                msg: 'Incorrect Password !'
                            }],
                            successMessage: undefined,
                            oldInput: {
                                email: email,
                                pass: password
                            }
                        });
                    }
                    else {
                        req.session.user = user;
                        req.session.loggedIn = true;
                        return req.session.save(() => {
                            res.redirect("/");
                        })
                    }
                })
                .catch((err) => {
                    let error = new Error(err);
                        error.statusCode = 400;
                        return next(error);
                })
        })
        .catch((err) => {
            let error = new Error(err);
                error.statusCode = 400;
                return next(error);
        })
}
exports.postLogout = (req, res, next) => {
    req.session.destroy((err) => {
        res.redirect("/");
    })
}
exports.getSignup = (req, res, next) => {
    let loggedIn = req.session.loggedIn;
    res.render("../views/sign-up.ejs", {
        loggedIn: loggedIn,
        errorMessage: req.flash('error'),
        oldInput: {
            email: "",
            pass: "",
            conPass: ""
        },
        errors: []
    });
}
exports.postSignup = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.pass;
    const conPass = req.body.conPass;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render("../views/sign-up.ejs", {
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email: email,
                pass: password,
                conPass: conPass
            },
            errors: errors.array()
        });
    }
    bcrypt.hash(password, 12)
        .then((hashPass) => {
            let newUser = new User({
                email: email,
                password: hashPass,
                cart: {
                    items: []
                }
            })
            return newUser.save()
        })
        .then(() => {
            transporter.sendMail({
                to: email,
                from: process.env.EMAIL,
                subject: "sign up succeeded congrats!",
                html: "<h1>Welcome to my node shop</h1>"
            })
                .catch((err) => {
                    let error = new Error(err);
                    error.statusCode = 400;
                    return next(error);
                })
            res.redirect("/login");
        })
        .catch((err) => {
            let error = new Error(err);
                error.statusCode = 400;
                return next(error);
        })
}
exports.getReset = (req, res, next) => {
    res.render("../views/reset.ejs", {
        errorMessage: req.flash("error")[0],
        successMessage: req.flash("success")[0]
    })
}
exports.postReset = (req, res, next) => {
    crypto.randomBytes(32, (err, buffer) => {
        if (err) {
            let error = new Error(err);
            error.statusCode = 400;
            return next(error);
        }
        let token = buffer.toString('hex');
        User.findOne({ email: req.body.email })
            .then((user) => {
                if (!user) {
                    req.flash('error', 'No such account found');
                    return res.redirect("/reset");
                }
                user.resetToken = token;
                user.resetExpires = Date.now() + 1200000;
                user.save()
                    .then(() => {
                        req.flash("success", 'Email Sent Successfully');
                        res.redirect("/reset");
                        transporter.sendMail({
                            to: req.body.email,
                            from: process.env.EMAIL,
                            subject: "Reset Password",
                            html: `
                    <h1> Reset Your Password </h1>
                    <p> Reset Your Password by clicking on <a href="http://localhost:3000/reset/${token}">here</a> </p>
                    `
                        })
                    });
            })
            .catch((err) => {
                let error = new Error();
                error.statusCode = 400;
                return next(error);
            })
    })
}
exports.getNewPass = (req, res, next) => {
    const token = req.params.token;
    User.findOne({
        resetToken: token,
        resetExpires: {
            $gt: Date.now()
        }
    })
        .then((user) => {
            if (!user) {
                req.flash('error', 'Invalid Token or Token Expired');
                return res.redirect("/reset");
            }
            return res.render("../views/new-password.ejs", {
                userId: user._id,
                token: token,
                tokenExpire: user.resetExpires,
                successMessage: req.flash("success")[0],
                errorMessage: undefined
            });
        })
        .catch((err) => {
            let error = new Error(err);
                error.statusCode = 400;
                return next(error);
        })
}
exports.postUpdate = (req, res, next) => {
    let userId = req.body.userId;
    let password = req.body.pass;
    let token = req.body.token;
    let resetUser;
    let errors = validationResult(req);
    if (errors.length) {
        return res.render("../views/new-password.ejs", {
            userId: userId,
            token: token,
            tokenExpire: "",
            errorMessage: "Invalid Password , should be of length greater than equal to 16",
            successMessage: undefined
        });
    }
    User.findOne({
        _id: userId, resetToken: token, resetExpires: {
            $gt: Date.now()
        }
    })
        .then((user) => {
            if (!user) {
                req.flash('error', 'Invalid Token or Token Expired');
                return res.redirect("/reset");
            }
            resetUser = user;
            return bcrypt.hash(password, 12)
        })
        .then((hashPassword) => {
            resetUser.password = hashPassword;
            resetUser.resetToken = undefined;
            resetUser.resetExpires = undefined;
            return resetUser.save();
        })
        .then((result) => {
            req.flash("success", 'Password Changed Successfully');
            res.redirect("/login");
        })
        .catch((err) => {
            let error = new Error(err);
                error.statusCode = 400;
                return next(error);
        })
}
