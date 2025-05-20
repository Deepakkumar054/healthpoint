import validator from 'validator'
import bcrypt from 'bcrypt'
import userModel from '../models/userModel.js'
import doctorModel from '../models/doctorsModel.js'
import jwt from 'jsonwebtoken'
import { v2 as cloudinaray } from 'cloudinary'
import razorpay from 'razorpay'


//api to register user

const registerUser = async (req, res) => {

  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(500).json({
        success: false,
        message: "All field are required"
      })
    }

    //validating the email
    if (!validator.isEmail(email)) {
      return res.status(500).json({
        success: false,
        message: "Enter a valid email"
      })
    }

    //validating strong password
    if (password.length < 8) {
      return res.status(500).json({
        success: false,
        message: "Enter a strong password"
      })
    }

    //hashing user password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const userData = {
      name,
      email,
      password: hashedPassword
    }

    const newUser = new userModel(userData)
    const user = await newUser.save()

    //propertry to generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)

    return res.status(200).json({
      success: true,
      token
    })

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong! please try again"
    })

  }
}

//Api for userLogin
const loginUser = async (req, res) => {

  try {

    const { email, password } = req.body
    //valid the email
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and Password are required"
      })
    }

    //check if user is exist
    const user = await userModel.findOne({ email })
    //validate user
    if (!user) {
      return res.status(401).json({
        success: false,
        success: "User does not exist"
      })
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if (isMatch) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)
      return res.status(200).json({
        success: true,
        token
      })
    }
    else {
      return res.status(500).json({
        success: false,
        message: "Invalid credentials"
      })
    }



  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message
    })
  }

}


// Api to get user profile data
const getProfile = async (req, res) => {

  try {

    const userId = req.userId
    const userData = await userModel.findById(userId).select('-password')

    res.json({
      success: true,
      userData
    })


  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message
    })
  }
}


//Api to update userProfile
import { Readable } from 'stream'
// import userModel from '../models/userModel.js'
import appointmentModel from '../models/appointmentModel.js'
// import { v2 as cloudinaray } from 'cloudinary'

function bufferToStream(buffer) {
  const stream = new Readable()
  stream.push(buffer)
  stream.push(null)
  return stream
}

const updateProfile = async (req, res) => {
  try {
    const userId = req.userId
    const { name, phone, address, dob, gender } = req.body
    const imageFile = req.file

    if (!name || !phone || !dob || !gender) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided"
      })
    }

    let parsedAddress = address
    try {
      parsedAddress = typeof address === 'string' ? JSON.parse(address) : address
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Invalid address format'
      })
    }

    const updateFields = { name, phone, address: parsedAddress, dob, gender }

    if (imageFile && imageFile.buffer) {
      const streamUpload = () =>
        new Promise((resolve, reject) => {
          const stream = cloudinaray.uploader.upload_stream(
            { resource_type: 'image' },
            (error, result) => {
              if (result) resolve(result)
              else reject(error)
            }
          )
          bufferToStream(imageFile.buffer).pipe(stream)
        })

      const result = await streamUpload()
      updateFields.image = result.secure_url
    }

    // Update user profile
    const updatedUser = await userModel.findByIdAndUpdate(userId, updateFields, { new: true })

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      })
    }

    // Sync user data inside all appointments for this user
    await appointmentModel.updateMany(
      { userId: userId },
      {
        $set: {
          "userData.name": updatedUser.name,
          "userData.phone": updatedUser.phone,
          "userData.address": updatedUser.address,
          "userData.dob": updatedUser.dob,
          "userData.gender": updatedUser.gender,
          "userData.image": updatedUser.image,
        }
      }
    )

    return res.status(200).json({
      success: true,
      message: "Profile updated and appointments synced"
    })
  } catch (error) {
    console.error("Update profile error:", error)
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    })
  }
}



// Api to book appointment
const bookAppointment = async (req, res) => {
  try {
    const userId = req.userId; // get from auth middleware, NOT req.body
    const { docId, slotDate, slotTime } = req.body;

    if (!docId || !slotDate || !slotTime) {
      return res.status(400).json({
        success: false,
        message: 'docId, slotDate, and slotTime are required'
      });
    }

    const docData = await doctorModel.findById(docId).select('-password');

    if (!docData || !docData.available) {
      return res.json({
        success: false,
        message: 'Doctor not available'
      });
    }

    let slots_booked = docData.slots_booked || {};

    // checking for slot availability
    if (slots_booked[slotDate]) {
      if (slots_booked[slotDate].includes(slotTime)) {
        return res.json({
          success: false,
          message: 'Slot not available'
        });
      } else {
        slots_booked[slotDate].push(slotTime);
      }
    } else {
      slots_booked[slotDate] = [slotTime];
    }

    const userData = await userModel.findById(userId).select('-password');

    // Prepare doctor data without slots_booked to store with appointment
    const docDataToSave = { ...docData.toObject() };
    delete docDataToSave.slots_booked;

    const appointmentData = {
      userId,
      docId,
      userData,
      docData: docDataToSave,
      amount: docData.fees,
      slotTime,
      slotDate,
      date: Date.now()
    };

    const newAppointment = new appointmentModel(appointmentData);
    await newAppointment.save();

    // Save new slots data in doctor document
    await doctorModel.findByIdAndUpdate(docId, { slots_booked });

    return res.json({
      success: true,
      message: 'Appointment Booked'
    });

  } catch (error) {
    console.log(error);
    res.json({
      success: false,
      message: error.message
    });
  }
};


// Api to get user appointment for frontend my-appointments page
const listAppointment = async (req, res) => {
  try {

    const userId = req.userId
    const appointments = await appointmentModel.find({ userId })

    res.json({
      success: true,
      appointments
    })


  } catch (error) {
    console.log(error);
    res.json({
      success: false,
      message: error.message
    })

  }
}

//Api to cancel the appointment
const cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const userId = req.userId;

    const appointmentData = await appointmentModel.findById(appointmentId);

    if (!appointmentData) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found"
      });
    }

    // verify the appointment user
    if (appointmentData.userId.toString() !== userId.toString()) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user"
      });
    }

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


const razorpayInstance = new razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
})
// Api to make payment using RazorPay

const paymentRazorpay = async (req, res) => {

  try {
    const { appointmentId } = req.body
    const appointmentData = await appointmentModel.findById(appointmentId)

    if (!appointmentData || appointmentData.cancelled) {
      return res.status(401).json({
        success: false,
        message: "Appointment Cancelled or Not found"
      })
    }

    //creating options for razorpay payment
    const options = {
      amount: appointmentData.amount * 100,
      currency: process.env.CURRENCY,
      receipt: appointmentId,
    }
    //creation of an order
    const order = await razorpayInstance.orders.create(options)
    return res.json({
      success: true,
      order
    })


  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

//Api to verify payment of razorpay
const verifyRazorpay = async (req, res) => {
  try {

    const {razorpay_order_id} = req.body
    const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id)

   
    if(orderInfo.status === 'paid'){
      await appointmentModel.findByIdAndUpdate(orderInfo.receipt,{payment:true})
      return res.status(200).json({
        success:true,
        message:"Payment Successful"
      })
    }
    else{
      return res.status(501).json({
        success:false,
        message:"Payment Failed"
      })
    }
    

  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

export { registerUser, loginUser, getProfile, updateProfile, bookAppointment, listAppointment, cancelAppointment, paymentRazorpay,verifyRazorpay }
