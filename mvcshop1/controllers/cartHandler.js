const userCart = require("../models/userMongo");
const orders = require("../models/orderMongoose");
let ITEM_PER_PAGE = 3;
const stripe = require("stripe")(process.env.STRIPE_KEY);
exports.getCart = (req, res, next) => {
    let page = parseInt(req.query.page);
    if (!page) {
        page = 1;
    }
    let loggedIn = req.session.loggedIn;
    userCart.findOne({ _id: req.session.user._id })
        .populate({
            path: "cart.items",
            populate: { path: "prodId" }
        })
        .then((product) => {
            let totalPages = Math.ceil(product.cart.items.length / ITEM_PER_PAGE);
            let upperbound = ((page - 1) * ITEM_PER_PAGE) + ITEM_PER_PAGE;
            let pageLimit = upperbound > product.cart.items.length ? product.cart.items.length : upperbound;
            res.render("../views/cart.ejs", {
                prods: product.cart.items.slice((page - 1) * ITEM_PER_PAGE, pageLimit), loggedIn: loggedIn,
                currentPage: page,
                totalPages: totalPages,
                nextPage: page + 1 > totalPages ? totalPages : page + 1,
                prevPage: page - 1 >= 1 ? page - 1 : 1
            });
        })
        .catch((err) => {
            let error = new Error(err);
                error.statusCode = 400;
                return next(error);
        });
}
exports.postCart = (req, res, next) => {
    req.user.AddToCart(JSON.parse(req.body.cartObj))
        .then(() => {
            res.redirect("/cart");
        })
        .catch((err) => {
            let error = new Error(err);
                error.statusCode = 400;
                return next(error);
        })
}
exports.deleteInCart = (req, res, next) => {
    req.user.deleteCartById(req.params.productId).then(() => {
        res.redirect("/cart");
    })
    .catch((err) => {
        let error = new Error(err);
                error.statusCode = 400;
                return next(error);
    })
}
exports.getCheckout = (req, res, next) => {
    let page = parseInt(req.query.page);
    let prods;
    let total = 0;
    if (!page) {
        page = 1;
    }
    let loggedIn = req.session.loggedIn;
    userCart.findOne({ _id: req.session.user._id })
        .populate("cart.items.prodId")
        .then((product) => {
            product.cart.items.forEach(element => {
                total += element.quantity * element.prodId.price;
            });
            prods = product.cart.items;
            return stripe.checkout.sessions.create({
                payment_method_types:['card'],
                line_items:product.cart.items.map(p => {
                    return {
                        name:p.prodId.title,
                        description:p.prodId.description,
                        amount:p.prodId.price*100,
                        currency:"INR",
                        quantity:p.quantity
                    }
                }),
                success_url:req.protocol + "://" + req.get("host") + "/checkout/success",
                cancel_url:req.protocol + "://" + req.get("host") + "/checkout/cancel"
            })
        })
        .then((session) => {
            let totalPages = Math.ceil(prods.length / ITEM_PER_PAGE);
            let upperbound = ((page - 1) * ITEM_PER_PAGE) + ITEM_PER_PAGE;
            let pageLimit = upperbound > prods.length ? prods.length : upperbound;
            return res.render("../views/checkout.ejs", {
                prods: prods.slice((page - 1) * ITEM_PER_PAGE, pageLimit), loggedIn: loggedIn,
                currentPage: page,
                totalPages: totalPages,
                nextPage: page + 1 > totalPages ? totalPages : page + 1,
                prevPage: page - 1 >= 1 ? page - 1 : 1,
                totalSum: total,
                apikey:process.env.API_KEY,
                sessionId:session.id
            });
        })
        .catch((err) => {
            let error = new Error(err);
            error.statusCode = 400;
            return next(error);
        });
}