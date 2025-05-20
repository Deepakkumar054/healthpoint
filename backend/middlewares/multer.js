// middlewares/multer.js
import multer from 'multer'

const storage = multer.memoryStorage() // store file in memory buffer

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Only JPEG, JPG, PNG files are allowed'), false)
    }
  }
})

export default upload
