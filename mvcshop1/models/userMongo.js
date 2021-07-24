const mongoose = require("mongoose");
const users = new mongoose.Schema({
    email:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    resetToken:String,
    resetExpires:Date,
    cart:{
        items:[{prodId:{type:mongoose.Schema.Types.ObjectId,ref:'Product'},quantity:{type:Number}}]
    }
});
users.methods.AddToCart = function(product){
    let cartIndex = this.cart.items.findIndex(prod => {
        return prod.prodId == product._id.toString();
    });
    if(cartIndex != -1){
        this.cart.items[cartIndex].quantity ++;
    }
    else{
        this.cart.items.push({
            prodId:mongoose.Types.ObjectId(product._id),
            quantity:1
        });
    }
    return this.save();
}
users.methods.deleteCartById = function (id){
    let updateCart = this.cart.items.filter(prod =>{
        if(prod.prodId != id.toString()){
            return prod;
        }
    })
    this.cart.items = updateCart;
    return this.save();
}
module.exports = mongoose.model("User",users);