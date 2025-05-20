import jwt from 'jsonwebtoken';

// Doctor authentication middleware
// authDoctor.js
const authDoctor = async (req, res, next) => {
  try {
    const { dtoken } = req.headers;

    if (!dtoken) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please login again.',
      });
    }

    const token_decode = jwt.verify(dtoken, process.env.JWT_SECRET);

    req.doctorId = token_decode.id; // ✅ FIXED

    next();
  } catch (error) {
    console.log('Auth error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: error.message,
    });
  }
};


export default authDoctor;
