import jwt from 'jsonwebtoken';

// user authentication middleware
const authUser = async (req, res, next) => {
  try {
    const { token } = req.headers;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please login again.',
      });
    }

    const token_decode = jwt.verify(token, process.env.JWT_SECRET);

    req.userId = token_decode.id;  // <-- use 'id' here, not 'userId'

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

export default authUser;
