import express from "express"
import cors from 'cors'
import 'dotenv/config'
import connectDB from "./config/database.js"
import connectCloudinary from "./config/cloudinary.js"
import adminRouter from './routes/admin.route.js'
import doctorRouter from './routes/doctor.route.js'
import userRouter from "./routes/user.route.js"

//app config

const app = express()
const port = process.env.PORT || 5001
connectDB()
connectCloudinary()


//middleware
app.use(express.json())
app.use(cors())

//Api endpoint
app.use('/api/admin',adminRouter)   //localhost:6001/api/admin
app.use('/api/doctor',doctorRouter)  
app.use('/api/user',userRouter)


app.get('/',(req,res)=>{
    res.send("Api Working")
})

app.listen(port,()=>console.log("Server started",port))