import mongoose, { mongo } from "mongoose";

const connectDB = async ()=>{
    mongoose.connection.on('connected',()=>console.log("Database Connected successfully"))
    
    await mongoose.connect(`${process.env.MONGODB_URL}/HealthPoint`)
}

export default connectDB