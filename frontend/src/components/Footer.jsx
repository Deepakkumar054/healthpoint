import React from 'react'
import { assets } from '../assets/assets'

const Footer = () => {
  return (
    <div className='mx-4 md:mx-10'>
      {/* Footer Main Section */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-20 my-10 mt-40 text-sm items-start justify-center'>

        {/* Left Section (Logo & Description) */}
        <div className='flex flex-col'>
          <img className='mb-[-16px] w-40' src={assets.logo} alt="logo" />
          <p className='text-gray-600 leading-6 max-w-[300px]'>
            Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.
          </p>
        </div>

        {/* Center Section */}
        <div>
          <p className='text-xl font-medium mt-16 '>Company</p>
          <ul className='flex flex-col gap-2 text-gray-600'>
            <li>Home</li>
            <li>About us</li>
            <li>Contact us</li>
            <li>Privacy & Policy</li>
          </ul>
        </div>

        {/* Right Section */}
        <div>
          <p className='text-xl font-medium mb-5 mt-16'>GET IN TOUCH</p>
          <ul className='flex flex-col gap-2 text-gray-600'>
            <li>+2 122-221-553</li>
            <li>deepak6355kr@gmail.com</li>
          </ul>
        </div>
      </div>

      {/* Bottom Footer */}
      <div>
        <hr />
        <p className='py-5 text-sm text-center text-gray-500'>
          © 2025 HealthPoint — All Rights Reserved
        </p>
      </div>
    </div>
  )
}

export default Footer
