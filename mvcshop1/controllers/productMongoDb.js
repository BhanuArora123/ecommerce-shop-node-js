const { validationResult } = require("express-validator");
const productClass = require("../models/productMongo");
const fileHelper = require("../util/fileHelper.js");
const path = require("path");
const nonce = require("../middleware/nonce");
const ITEMS_PER_PAGE = 3;
function getAddProduct(req, res, next) {
    let loggedIn = req.session.loggedIn;
    res.render("../views/add-product.ejs", {
        editProd: "false",
        loggedIn: loggedIn,
        errors: [],
        oldInput: {
            title: "",
            description: "",
            price: "",
            imageurl: ""
        }
    });
}
const getProduct = (req, res, next) => {
    let page = req.query.page != undefined ? parseInt(req.query.page) : 1;
    let totalProds;
    productClass.find()
        .countDocuments()
        .then((productNum) => {
            totalProds = productNum;
            return productClass.find().skip((page - 1) * (ITEMS_PER_PAGE)).limit(ITEMS_PER_PAGE);
        })
        .then((product) => {
            let loggedIn = req.session.loggedIn;
            let totalPages = Math.ceil(totalProds / ITEMS_PER_PAGE);
            res.render("../views/product.ejs", {
                prods: product,
                editProd: "false",
                loggedIn: loggedIn,
                userId: req.session.user != undefined ? req.session.user._id : "",
                currentPage: page,
                totalPages: totalPages,
                nextPage: page + 1 > totalPages ? totalPages : page + 1,
                prevPage: page - 1 >= 1 ? page - 1 : 1,
                nonce: nonce
            });
        })
        .catch(err => {
            let error = new Error(err);
            error.statusCode = 400;
            return next(error);
        });
}
const displayProduct = (req, res, next) => {
    let errors = validationResult(req);
    if (!(errors.isEmpty() && req.file) && (req.body.editProd == "false")) {
        return res.render("../views/add-product.ejs", {
            editProd: "false",
            errors: errors.array().length != 0 ? errors.array() : [
                {
                    param: "imageurl",
                    msg: "this is a valid image format or it is empty"
                }
            ],
            oldInput: {
                title: req.body.title,
                description: req.body.description,
                price: req.body.price,
                imageurl: req.body.imageurl
            }
        });
    }
    else if (!(errors.isEmpty()) && (req.body.editProd == "true")) {
        productClass.findOne({ userId: req.user._id, _id: req.body.id })
            .then((item) => {
                item.title = req.body.title;
                item.description = req.body.description;
                item.price = req.body.price;
                if (!item) {
                    return res.redirect("/error");
                }
                res.render("../views/add-product.ejs",
                    {
                        prodObj: item,
                        editProd: "true",
                        errors: errors.array()
                    });
            })
            .catch((err) => {
                let error = new Error(err);
                error.statusCode = 400;
                return next(error);
            })
    }
    else if (req.body.editProd == "true") {
        productClass.findById(req.body.id)
            .then((product) => {
                if (product.userId.toString() == req.session.user._id.toString()) {
                    product.title = req.body.title;
                    product.description = req.body.description;
                    product.price = req.body.price;
                    if (req.file) {
                        fileHelper.deleteFile(path.join(product.imageurl));
                        product.imageurl = req.file.path;
                    }
                    return product.save()
                        .then(() => {
                            res.redirect("/products");
                        })
                }
                return res.redirect("/products")
            })
            .catch((err) => {
                let error = new Error(err);
                error.statusCode = 400;
                return next(error);
            })
    }
    else {
        if (req.method == "POST" && req.body != undefined) {
            let productCreds = new productClass({
                title: req.body.title,
                description: req.body.description,
                price: req.body.price,
                userId: req.user._id
            });
            if (req.file) {
                productCreds.imageurl = req.file.path;
            }
            return productCreds.save()
                .then(othername => {
                    res.redirect("/products");
                })
                .catch(err => {
                    let error = new Error(err);
                    // error.statusCode = 400;
                    next(error);
                });
        }
        res.redirect("/products");
    }
};
const homePage = (req, res, next) => {
    let loggedIn = req.session.loggedIn;
    // res.render("../views/homePage.ejs", {
    //     loggedIn: loggedIn,
    //     csrfToken: req.csrfToken()
    // });
    res.redirect("/products");
}

// for handling requests of differents product
const productDesc = (req, res, next) => {
    let loggedIn = req.session.loggedIn;
    productClass.findById(req.params.productId).then((item) => {
        item.loggedIn = loggedIn;
        item.nonce = nonce;
        res.render("../views/productDesc.ejs", item);
    })
}
const editProduct = (req, res, next) => {
    // catching query parameter 
    let editProd = req.query.edit;
    productClass.findOne({ userId: req.user._id, _id: req.params.productId })
        .then((item) => {
            if (!item) {
                return res.redirect("/products");
            }
            item.image = req.file;
            res.render("../views/add-product.ejs", { prodObj: item, editProd: editProd, errors: [] });
        })
        .catch((err) => {
            let error = new Error(err);
            error.statusCode = 400;
            return next(error);
        })
}

// deleting the product 

const deleteProduct = (req, res, next) => {
    productClass.findOne({ userId: req.session.user._id, _id: req.params.productId })
        .then((product) => {
            if (!product) {
                return res.status(500).json({
                    message: "failed"
                });
            }
            fileHelper.deleteFile(path.join(__dirname, "..", "..", product.imageurl));
            productClass.findByIdAndRemove(req.params.productId).then(() => {
                res.status(200).json({
                    message: "success"
                })
            })
        })
        .catch((err) => {
            let error = new Error(err);
            error.statusCode = 400;
            return next(error);
        })
}
module.exports = { getAddProduct: getAddProduct, displayProduct: displayProduct, homePage: homePage, productDesc: productDesc, editProduct: editProduct, deleteProduct: deleteProduct, getProduct: getProduct };

