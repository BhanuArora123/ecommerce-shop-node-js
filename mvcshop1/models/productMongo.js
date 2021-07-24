const mongoose = require("mongoose");
const mongodb = require("mongodb");
const Schema = mongoose.Schema;
const productSchema = new Schema({
    title:{
        type : String,
        required:true
    },
    description:{
        type : String
    },
    price:{
        type: Number,
        required:true
    },
    imageurl:{
        type:String,
        required:true
    },
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    }
});
module.exports = mongoose.model("Product",productSchema);