const fs = require("fs");
const fileHelper = require("../util/fileHelper.js");
const path = require("path");
const pdfDocument = require("pdfkit");
const orders = require("../models/orderMongoose");
const User = require("../models/userMongo");
const ITEM_PER_PAGE = 3;
exports.getOrder = (req, res, next) => {
    let loggedIn = req.session.loggedIn;
    let totalProds;
    let page = parseInt(req.query.page);
    if(!page){
        page = 1;
    }
    orders.countDocuments()
        .then((nums) => {
            totalProds = nums;
            return orders.find({ userId: req.session.user._id })
                .skip((page - 1) * ITEM_PER_PAGE)
                .limit(ITEM_PER_PAGE);
        })
        .then((product) => {
            if (product) {
                let totalPages = Math.ceil(totalProds/ITEM_PER_PAGE);
                res.render("../views/orders.ejs", {
                    prods: product,
                    loggedIn: loggedIn,
                    orderId: product._id,
                    currentPage: page,
                    totalPages:totalPages,
                    nextPage:page+1>totalPages?totalPages:page+1,
                    prevPage:page-1>=1?page-1:1
                });
            }
            else {
                res.render("../views/orders.ejs", {
                    prods: [],
                    loggedIn: loggedIn,
                    orderId: product._id
                });
            }
        })
        .catch((err) => {
            let error = new Error(err);
                error.statusCode = 400;
                return next(error);
        })
}
exports.checkoutSuccess = (req, res, next) => {
    User.findOne({ _id: req.session.user._id })
        .populate("cart.items.prodId")
        .then((user) => {
            if (!user) {
                return res.redirect("/errors");
            }
            let order = new orders({
                userId: req.user._id,
                orderProd: {
                    items: user.cart.items
                }
            })
            return order.save();
        })
        .then(() => {
            req.user.cart.items = [];
            return req.user.save();
        })
        .then(() => {
            res.redirect("/orders");
        })
        .catch((err) => {
            let error = new Error(err);
                error.statusCode = 400;
                return next(error);
        })
}
exports.orderDesc = (req, res, next) => {
    let loggedIn = req.session.loggedIn;
    orders.findOne({ userId: req.session.user._id, _id: req.params.orderId })
        .then((order) => {
            orders.displayProd(order, req.params.productId)
                .then((product) => {
                    product.prodId.loggedIn = loggedIn;
                    res.render("../views/productDesc.ejs", product.prodId);
                })
        })
        .catch((err) => {
            let error = new Error(err);
                error.statusCode = 400;
                return next(error);
        })
}
exports.invoiceDownload = (req, res, next) => {
    let filename = "invoice-" + req.params.orderId + ".pdf";
    orders.findOne({ userId: req.session.user, _id: req.params.orderId })
        .then((order) => {
            if (!order) {
                return res.redirect("/errors");
            }
            //     fs.readFile(path.join(__dirname,"..","invoice","invoice33.pdf")
            // ,(err,data) => {
            //     if(err){
            //         console.log(err);
            //         return err;
            //     }
            const pdfDoc = new pdfDocument();
            // setting headers in browser to render the type of data we want to provide
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
            pdfDoc.pipe(fs.createWriteStream(path.join(__dirname, "..", "invoice", filename)));
            pdfDoc.pipe(res);
            pdfDoc.fontSize(26).text("Invoice");
            let price = 0;
            order.orderProd.items.forEach(element => {
                price += element.quantity * element.prodId.price;
                pdfDoc.fontSize(16).text(`
                ${element.prodId.title} - ${element.quantity} x ${element.prodId.price}
            `)
            });
            pdfDoc.fontSize(20).text(`Total Price = ${price}`);
            pdfDoc.end();
        })
        .catch((err) => {
            let error = new Error(err);
                error.statusCode = 400;
                return next(error);
        });
}