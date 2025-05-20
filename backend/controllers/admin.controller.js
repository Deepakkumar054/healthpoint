
// Add Doctor API
import validator from 'validator'
import bcrypt from 'bcrypt'
import { v2 as cloudinary } from 'cloudinary'
import streamifier from 'streamifier'
import doctorModel from '../models/doctorsModel.js'
import jwt from 'jsonwebtoken'
import appointmentModel from '../models/appointmentModel.js'
import userModel from '../models/userModel.js'

const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'image' },
      (error, result) => {
        if (result) {
          resolve(result)
        } else {
          reject(error)
        }
      }
    )
    streamifier.createReadStream(buffer).pipe(stream)
  })
}

const addDoctor = async (req, res) => {
  try {
    const {
      name, email, password, speciality, degree,
      experience, about, fees, address
    } = req.body

    const imageFile = req.file

    if (
      !name || !email || !password || !speciality || !degree ||
      !experience || !about || !fees || !address
    ) {
      return res.status(400).json({ success: false, message: "All fields are required" })
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format" })
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters long" })
    }

    if (!imageFile) {
      return res.status(400).json({ success: false, message: "Doctor profile image is required" })
    }

    const existingDoctor = await doctorModel.findOne({ email })
    if (existingDoctor) {
      return res.status(400).json({ success: false, message: "Doctor with this email already exists" })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // Upload directly to cloudinary from buffer
    const imageUpload = await uploadToCloudinary(imageFile.buffer)
    const imageUrl = imageUpload.secure_url

    const doctorData = {
      name,
      email,
      password: hashedPassword,
      image: imageUrl,
      speciality,
      degree,
      experience,
      about,
      fees,
      address: JSON.parse(address),
      date: Date.now()
    }

    const newDoctor = new doctorModel(doctorData)
    await newDoctor.save()

    res.status(200).json({ success: true, message: "Doctor added successfully" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: error.message })
  }
}


// Admin Login API
const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body

        if (
            email === process.env.ADMIN_EMAIL &&
            password === process.env.ADMIN_PASSWORD
        ) {
            const token = jwt.sign(email + password, process.env.JWT_SECRET)

            return res.status(200).json({
                success: true,
                token
            })
        } else {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            })
        }
    } catch (error) {
        console.error(error)
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

// Api to get all doctors list for admin panel

const allDoctors = async(req,res)=>{
  
  try {
    
    const doctors = await doctorModel.find({}).select('-password')
    return res.status(200).json({
      success:true,
      doctors:doctors
    });

  } catch (error) {
    console.error(error)
        return res.status(500).json({
            success: false,
            message:  "Something went wrong while fetching doctors"
        })
  }
}

//Api to get all appointment list
const appointmentsAdmin = async(req,res)=>{
  try {
    
    const appointments = await appointmentModel.find({})
    return res.status(200).json({
      success:true,
      appointments
    })

  } catch (error) {
    console.error(error)
        return res.status(500).json({
            success: false,
            message:  "Something went wrong while fetching doctors"
        })
  }
}

//API For Appointement cancelletion
const appointmentCancel = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const appointmentData = await appointmentModel.findById(appointmentId);


    await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true });

    // releasing doctor slot
    const { docId, slotDate, slotTime } = appointmentData;
    const doctorData = await doctorModel.findById(docId);

    let slots_booked = doctorData.slots_booked;
    slots_booked[slotDate] = slots_booked[slotDate].filter(e => e !== slotTime);

    await doctorModel.findByIdAndUpdate(docId, { slots_booked });

    return res.status(200).json({
      success: true,
      message: "Appointment Cancelled"
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

//Api to get dashboard data for admin panel

const adminDashboard = async(req,res)=>{

  try {
    
    const doctors = await doctorModel.find({})
    const users = await userModel.find({})
    const appointments = await appointmentModel.find({})

    const dashData = {
      doctors:doctors.length,
      appointments:appointments.length,
      patients:users.length,
      latestAppointment:appointments.reverse().slice(0,5)
    }
    return res.json({
      success:true,
      dashData
    })

  } catch (error) {
     console.log(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

export { addDoctor, adminLogin,allDoctors,appointmentsAdmin,appointmentCancel,adminDashboard}
