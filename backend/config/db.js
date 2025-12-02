const mongoose = require("mongoose")

const connectDB = async () => {
    try {
        const db = await mongoose.connect(process.env.MONGO_URI);
        if (db) {
            console.log("mongodb connected");
        }
    } catch (error) {
        console.log("mongodb connection error", error);
        
    }
}

module.exports = connectDB