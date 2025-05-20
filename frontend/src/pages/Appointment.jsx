import React, { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import { assets } from '../assets/assets'
import RelatedDoctors from '../components/RelatedDoctors'
import { toast } from 'react-toastify'
import axios from 'axios'

const Appointment = () => {
  const { docId } = useParams()
  const { doctors, currencySymbol, token, backendUrl, getDoctorsData } = useContext(AppContext)
  const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

  const navigate = useNavigate()

  const [docInfo, setDocInfo] = useState(null)
  const [docSlots, setDocSlots] = useState([])
  const [slotIndex, setSlotIndex] = useState(0)
  const [slotTime, setSlotTime] = useState('')

  const bookTheAppointment = async () => {
    if (!token) {
      toast.warn('Login to book appointment')
      return navigate('/login')
    }

    if (!slotTime) {
      toast.warn('Please select a time slot')
      return
    }

    try {
      const date = docSlots[slotIndex].fullDate
      let day = date.getDate()
      let month = date.getMonth() + 1
      let year = date.getFullYear()
      const slotDate = `${day}_${month}_${year}`

      const { data } = await axios.post(
        backendUrl + '/api/user/book-appointment',
        { docId, slotDate, slotTime },
        { headers: { token } }
      )

      if (data.success) {
        toast.success(data.message)

        // Remove the booked time slot from docSlots
        const updatedSlots = [...docSlots]
        updatedSlots[slotIndex].slots = updatedSlots[slotIndex].slots.filter(
          (slot) => slot.time !== slotTime
        )

        // If no slots left for the selected day, remove the entire day
        if (updatedSlots[slotIndex].slots.length === 0) {
          updatedSlots.splice(slotIndex, 1)
          setSlotIndex(0) // reset to first available day
        }

        setDocSlots(updatedSlots)
        setSlotTime('')

        getDoctorsData()
        navigate('/my-appointments')
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.error('Booking error:', error)
      toast.error(error.message)
    }
  }

  useEffect(() => {
    if (doctors.length > 0) {
      const info = doctors.find(doc => doc._id === docId)
      setDocInfo(info)
    }
  }, [doctors, docId])

  useEffect(() => {
    if (!docInfo) return

    const today = new Date()
    const allSlots = []

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(today)
      currentDate.setDate(today.getDate() + i)

      const startTime = new Date(currentDate)
      const endTime = new Date(currentDate)
      endTime.setHours(21, 0, 0, 0) // 9:00 PM end time

      if (i === 0) {
        const currentHour = currentDate.getHours()
        startTime.setHours(currentHour >= 10 ? currentHour + 1 : 10)
        startTime.setMinutes(currentDate.getMinutes() > 30 ? 30 : 0)
      } else {
        startTime.setHours(10, 0, 0, 0)
      }

      const timeSlots = []
      const slotTimeLoop = new Date(startTime)

      while (slotTimeLoop < endTime) {
        let day = currentDate.getDate()
        let month = currentDate.getMonth() + 1
        let year = currentDate.getFullYear()

        const slotDate = `${day}_${month}_${year}`
        const slotTime = slotTimeLoop.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        const isSlotAvailable = !(docInfo.slots_booked[slotDate]?.includes(slotTime))

        if (isSlotAvailable) {
          timeSlots.push({
            datetime: new Date(slotTimeLoop),
            time: slotTime
          })
        }

        slotTimeLoop.setMinutes(slotTimeLoop.getMinutes() + 30)
      }

      if (timeSlots.length > 0) {
        allSlots.push({
          day: daysOfWeek[currentDate.getDay()],
          date: currentDate.getDate(),
          fullDate: new Date(currentDate),
          slots: timeSlots
        })
      }
    }

    setDocSlots(allSlots)
  }, [docInfo])

  return docInfo && (
    <div>
      {/* Doctor Details */}
      <div className='flex flex-col sm:flex-row gap-4'>
        <div>
          <img className='bg-primary w-full sm:max-w-72 rounded-lg' src={docInfo.image} alt="" />
        </div>

        <div className='flex-1 border border-gray-400 rounded-lg p-8 py-7 bg-white mx-2 sm:mx-0 mt-[-80px] sm:mt-0'>
          <p className='flex items-center gap-2 text-2xl font-medium text-gray-900'>
            {docInfo.name}
            <img className='w-5' src={assets.verified_icon} alt="" />
          </p>
          <div className='flex items-center gap-2 text-sm mt-1 text-gray-600'>
            <p>{docInfo.degree} - {docInfo.speciality}</p>
            <button className='py-0.5 px-2 border text-xs rounded-full'>{docInfo.experience}</button>
          </div>

          <div>
            <p className='flex items-center gap-1 text-sm font-medium text-gray-900 mt-3'>
              About <img src={assets.info_icon} alt="" />
            </p>
            <p className='text-sm text-gray-500 max-w-[700px] mt-1'>{docInfo.about}</p>
          </div>

          <p className='text-gray-500 font-medium mt-4'>
            Appointment fee: <span className='text-gray-600'>{currencySymbol}{docInfo.fees}</span>
          </p>
        </div>
      </div>

      {/* Booking Slots */}
      <div className='sm:ml-72 sm:pl-4 mt-4 font-medium text-gray-700'>
        <p>Booking Slots</p>

        {/* Date selector */}
        <div className='flex gap-3 items-center w-full overflow-x-scroll mt-4 pb-2'>
          {docSlots.length > 0 && docSlots.map((daySlot, index) => (
            <div
              key={index}
              onClick={() => {
                setSlotIndex(index)
                setSlotTime('')
              }}
              className={`text-center py-6 min-w-16 rounded-full cursor-pointer px-4 
                ${slotIndex === index ? 'bg-primary text-white' : 'border border-gray-200'}
              `}
            >
              <p>{daySlot.day}</p>
              <p>{daySlot.date}</p>
            </div>
          ))}
        </div>

        {/* Time slots */}
        {docSlots[slotIndex] && (
          <div className='flex items-center gap-3 w-full overflow-x-scroll mt-4'>
            {docSlots[slotIndex].slots.map((slot, idx) => (
              <div
                key={idx}
                onClick={() => setSlotTime(slot.time)}
                className={`border px-4 py-2 rounded-full text-sm cursor-pointer 
                  ${slotTime === slot.time ? 'bg-primary text-white' : 'bg-white'}
                `}
              >
                {slot.time}
              </div>
            ))}
          </div>
        )}

        {/* Selected time summary */}
        {slotTime && (
          <p className='mt-6 text-green-600'>
            You have selected: <strong>{slotTime}</strong> on <strong>{docSlots[slotIndex].day}</strong>
          </p>
        )}

        <button onClick={bookTheAppointment} className='bg-primary text-white text-sm font-light px-14 py-3 rounded-full my-6 '>
          Book an Appointment
        </button>
      </div>

      {/* Related Doctors */}
      <RelatedDoctors docId={docId} speciality={docInfo.speciality} />
    </div>
  )
}

export default Appointment
