exports.displayError = (error,req,res,next) => {
    res.render("../views/errorPage.ejs",{
        status:error.statusCode,
        message:error.message
    })
}