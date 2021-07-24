const mongoose = require("mongoose");
const user = require("../models/userMongo");
const orderSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderProd: {
        items: [{
            prodId: {
                _id: {
                    type: mongoose.Schema.Types.ObjectId
                },
                title: {
                    type: String
                },
                description: {
                    type: String
                },
                price: {
                    type: Number
                },
                imageurl:{
                    type:String
                }
            },
            quantity: {
                type: Number,
                required: true
            }
        }]
    }
});
orderSchema.methods.AddOrder = function (order,id) {
    return user.findOne({_id:id})
        .populate("cart.items.prodId")
        .then((userIns) => {
            if (order && order.userId.toString() == userIns._id.toString()) {
                order.orderProd = userIns.cart;
                userIns.cart.items = [];
                userIns.save();
                return order.save();
            }
            else {
                this.userId = userIns._id;
                this.orderProd = userIns.cart;
                userIns.cart.items = [];
                userIns.save();
                return this.save();
            }
        });
}
orderSchema.statics.displayProd = function (order,id) {
    let prod = order.orderProd.items.findIndex(prods => {
        return prods.prodId._id.toString() == id;
    })
    return new Promise((resolve,reject) => {
        resolve(order.orderProd.items[prod]);
    })
}
orderSchema.statics.deleteOrderById = function(order,id) {
    let updatedOrder = order.orderProd.items.filter(prod => {
        if(prod.prodId._id.toString() != id){
            return prod;
        }
    })
    order.orderProd.items = updatedOrder;
    return order.save();
}
module.exports = mongoose.model("Order", orderSchema);