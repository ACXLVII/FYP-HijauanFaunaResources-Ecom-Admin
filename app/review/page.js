'use client'

import { useEffect, useState } from 'react'
import {
  HomeIcon,
  UsersIcon,
  ShoppingBagIcon,
  FolderIcon,
  XMarkIcon,
  Bars3Icon,
  StarIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { db } from '../firebase'
import { collection, onSnapshot } from 'firebase/firestore'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Products', href: '/products', icon: ShoppingBagIcon },
  { name: 'Customers', href: '/customers', icon: UsersIcon },
  { name: 'Orders', href: '/orders', icon: FolderIcon },
  { name: 'Review and Inquiry', href: '/review', icon: StarIcon },
  { name: 'Logout', href: '/logout', icon: XMarkIcon },
]

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

function StarRating({ rating }) {
  const stars = []
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <StarIcon
        key={i}
        className={`h-5 w-5 ${
          i <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    )
  }
  return <div className="flex gap-0.5">{stars}</div>
}

function formatDate(dateField, timestampField) {
  let date = '—'
  
  // Use date field first (string format like "2025-10-01")
  if (dateField) {
    if (typeof dateField === 'string') {
      try {
        const dateObj = new Date(dateField)
        if (!isNaN(dateObj.getTime())) {
          date = dateObj.toLocaleDateString()
        } else {
          const [year, month, day] = dateField.split('-')
          if (year && month && day) {
            date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString()
          } else {
            date = dateField
          }
        }
      } catch (e) {
        date = dateField
      }
    } else if (dateField.toDate && typeof dateField.toDate === 'function') {
      date = dateField.toDate().toLocaleDateString()
    } else if (dateField.seconds) {
      date = new Date(dateField.seconds * 1000).toLocaleDateString()
    } else if (dateField instanceof Date) {
      date = dateField.toLocaleDateString()
    } else {
      date = String(dateField)
    }
  }
  // Fallback to timestamp if date is not available
  else if (timestampField) {
    if (timestampField.toDate && typeof timestampField.toDate === 'function') {
      date = timestampField.toDate().toLocaleDateString()
    } else if (timestampField.seconds) {
      date = new Date(timestampField.seconds * 1000).toLocaleDateString()
    } else if (timestampField instanceof Date) {
      date = timestampField.toLocaleDateString()
    }
  }
  
  return date
}

export default function ReviewAndInquiryPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [reviews, setReviews] = useState([])
  const [inquiries, setInquiries] = useState([])
  const [activeNav, setActiveNav] = useState('Review and Inquiry')
  const [activeTab, setActiveTab] = useState('reviews') // 'reviews' or 'inquiries'
  const [selectedRating, setSelectedRating] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  

  // Connect to Review collection
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'Review'), (snap) => {
      const list = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      setReviews(list)
    })
    return unsub
  }, [])

  // Connect to Contact collection for inquiries
  useEffect(() => {
    const unsubContact = onSnapshot(collection(db, 'Contact'), (snap) => {
      const contactList = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      setInquiries(contactList)
    })

    return () => {
      unsubContact()
    }
  }, [])

  // Filter reviews by rating and search
  const filteredReviews = reviews.filter((review) => {
    if (selectedRating) {
      const rating = review.rating || review.stars || review.starRating
      if (Number(rating) !== selectedRating) return false
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const customerName = (review.customerName || review.name || review.customer || '').toLowerCase()
      const comment = (review.description || '').toLowerCase()
      if (!customerName.includes(query) && !comment.includes(query)) return false
    }
    return true
  })

  // Filter inquiries by search
  const filteredInquiries = inquiries.filter((inquiry) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const name = (inquiry.name || inquiry.customerName || inquiry.customer || '').toLowerCase()
      const email = (inquiry.email || '').toLowerCase()
      const phone = (inquiry.phoneNumber || '').toLowerCase()
      const message = (inquiry.message || inquiry.description || inquiry.comment || '').toLowerCase()
      if (!name.includes(query) && !email.includes(query) && !phone.includes(query) && !message.includes(query)) {
        return false
      }
    }
    return true
  })

  return (
    <div className="bg-gray-50 min-h-screen flex">
      {/* Mobile Sidebar */}
      <div
        className={`lg:hidden fixed inset-0 z-50 bg-gray-900 bg-opacity-75 ${
          sidebarOpen ? 'block' : 'hidden'
        }`}
      >
        <div className="flex flex-col w-64 bg-white h-full shadow-lg border-r">
          <div className="flex items-center px-4 pt-4 mb-8">
            <img alt="Logo" src="/logo.png" className="h-14 w-auto" />
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 ml-auto hover:text-gray-700 transition"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1">
            <ul role="list" className="space-y-2 px-2">
              {navigation.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    onClick={() => {
                      setActiveNav(item.name)
                      setSidebarOpen(false)
                    }}
                    className={classNames(
                      activeNav === item.name
                        ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                        : 'text-gray-500 hover:bg-blue-50 hover:text-blue-700',
                      'group flex gap-x-4 rounded-md p-3 text-lg font-semibold transition-colors duration-200'
                    )}
                  >
                    <item.icon className="h-6 w-6" aria-hidden="true" />
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* Sidebar (Desktop) */}
      <div className="hidden lg:flex lg:flex-col lg:w-72 lg:bg-white lg:fixed lg:inset-y-0 lg:z-50 shadow-lg border-r">
        <div className="flex flex-col gap-y-6 overflow-y-auto px-6 py-6">
          <div className="flex items-center justify-center mb-8">
            <img alt="Logo" src="/logo.png" className="h-16 w-auto" />
          </div>
          <nav className="flex-1">
            <ul role="list" className="space-y-2">
              {navigation.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    onClick={() => setActiveNav(item.name)}
                    className={classNames(
                      activeNav === item.name
                        ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                        : 'text-gray-500 hover:bg-blue-50 hover:text-blue-700',
                      'group flex gap-x-4 rounded-md p-3 text-lg font-semibold transition-colors duration-200'
                    )}
                  >
                    <item.icon className="h-6 w-6" aria-hidden="true" />
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-10 bg-white min-h-screen overflow-auto lg:ml-72">
        {/* Mobile Header with Menu Button */}
        <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-200 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 flex items-center justify-between mb-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-2"
            aria-label="Open menu"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <img alt="Logo" src="/logo.png" className="h-10 w-auto" />
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Reviews and Inquiries</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage customer reviews and inquiries in one place</p>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-md mb-4 sm:mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px overflow-x-auto">
                <button
                  onClick={() => {
                    setActiveTab('reviews')
                    setSearchQuery('')
                    setSelectedRating(null)
                  }}
                  className={classNames(
                    activeTab === 'reviews'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                    'flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-3 sm:py-4 border-b-2 font-semibold transition-colors text-sm sm:text-base whitespace-nowrap'
                  )}
                >
                  <StarIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  Reviews
                  {reviews.length > 0 && (
                    <span className="ml-1 sm:ml-2 bg-blue-100 text-blue-700 px-1.5 sm:px-2 py-0.5 rounded-full text-xs">
                      {reviews.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    setActiveTab('inquiries')
                    setSearchQuery('')
                    setSelectedRating(null)
                  }}
                  className={classNames(
                    activeTab === 'inquiries'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                    'flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-3 sm:py-4 border-b-2 font-semibold transition-colors text-sm sm:text-base whitespace-nowrap'
                  )}
                >
                  <ChatBubbleLeftRightIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  Inquiries
                  {inquiries.length > 0 && (
                    <span className="ml-1 sm:ml-2 bg-blue-100 text-blue-700 px-1.5 sm:px-2 py-0.5 rounded-full text-xs">
                      {inquiries.length}
                    </span>
                  )}
                </button>
              </nav>
            </div>

            {/* Search Bar */}
            <div className="p-3 sm:p-4 border-b border-gray-200">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={activeTab === 'reviews' ? 'Search reviews...' : 'Search inquiries...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Star Rating Filter (only for Reviews tab) */}
            {activeTab === 'reviews' && (
              <div className="p-3 sm:p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                  <span className="text-xs sm:text-sm font-semibold text-gray-700">Filter by Rating:</span>
                  <div className="flex gap-1 sm:gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() =>
                          setSelectedRating(selectedRating === rating ? null : rating)
                        }
                        className={classNames(
                          'px-2 sm:px-4 py-1.5 sm:py-2 rounded-md border transition text-xs sm:text-sm',
                          selectedRating === rating
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        )}
                      >
                        <div className="flex items-center gap-1">
                          <StarIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>{rating}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  {selectedRating && (
                    <button
                      onClick={() => setSelectedRating(null)}
                      className="text-sm text-blue-600 hover:text-blue-700 underline"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Content Area */}
            <div className="p-4 sm:p-6">
              {activeTab === 'reviews' ? (
                /* Reviews Cards */
                filteredReviews.length === 0 ? (
                  <div className="px-4 py-12 text-center text-gray-500">
                    {searchQuery || selectedRating
                      ? 'No reviews match your filters.'
                      : 'No reviews found yet.'}
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {filteredReviews.map((review, idx) => {
                      const rating = review.rating || review.stars || review.starRating || 0
                      const customerName =
                        review.customerName ||
                        review.name ||
                        review.customer ||
                        'Anonymous'
                      const comment = review.description || '—'
                      const date = formatDate(review.date, review.timestamp)
                      
                      // Extract images - handle multiple formats
                      let images = []
                      if (review.images && Array.isArray(review.images)) {
                        images = review.images
                      } else if (review.image) {
                        images = Array.isArray(review.image) ? review.image : [review.image]
                      } else if (review.photos && Array.isArray(review.photos)) {
                        images = review.photos
                      } else if (review.photo) {
                        images = Array.isArray(review.photo) ? review.photo : [review.photo]
                      }
                      // Handle if images are objects with url/src property
                      images = images.map(img => {
                        if (typeof img === 'string') return img
                        if (img && typeof img === 'object') return img.url || img.src || img.image || ''
                        return ''
                      }).filter(img => img && img.trim() !== '')

                      return (
                        <div
                          key={review.id}
                          className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <div className="text-sm sm:text-base font-semibold text-gray-900 mb-0.5">{customerName}</div>
                                  <div className="text-xs sm:text-sm text-gray-500">{date}</div>
                                </div>
                                <div className="sm:ml-4">
                                  <StarRating rating={Number(rating)} />
                                </div>
                              </div>
                              <div className="mt-2 space-y-1">
                                <div className="text-xs sm:text-sm">
                                  <span className="text-gray-500">Comment: </span>
                                  <span className="text-gray-700">{comment}</span>
                                </div>
                                {images.length > 0 && (
                                  <div className="text-xs sm:text-sm">
                                    <span className="text-gray-500">Images: </span>
                                    <div className="flex gap-2 flex-wrap mt-1">
                                      {images.slice(0, 3).map((imgUrl, imgIdx) => (
                                        <img
                                          key={imgIdx}
                                          src={imgUrl}
                                          alt={`Review image ${imgIdx + 1}`}
                                          className="h-12 w-12 sm:h-16 sm:w-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition"
                                          onClick={() => {
                                            window.open(imgUrl, '_blank')
                                          }}
                                          onError={(e) => {
                                            e.target.style.display = 'none'
                                          }}
                                        />
                                      ))}
                                      {images.length > 3 && (
                                        <div className="h-12 w-12 sm:h-16 sm:w-16 flex items-center justify-center bg-gray-100 rounded-lg border border-gray-200 text-xs font-medium text-gray-600">
                                          +{images.length - 3}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              ) : (
                /* Inquiries Cards */
                filteredInquiries.length === 0 ? (
                  <div className="px-4 py-12 text-center text-gray-500">
                    {searchQuery
                      ? 'No inquiries match your search.'
                      : 'No inquiries found yet.'}
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {filteredInquiries.map((inquiry, idx) => {
                      const name = inquiry.name || inquiry.customerName || inquiry.customer || 'Anonymous'
                      const email = inquiry.email || '—'
                      const phone = inquiry.phoneNumber ? String(inquiry.phoneNumber).trim() : '—'
                      const message = inquiry.message || inquiry.description || inquiry.comment || '—'
                      const date = formatDate(inquiry.date, inquiry.timestamp)

                      return (
                        <div
                          key={inquiry.id}
                          className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                            <div className="flex-1">
                              <div className="mb-2">
                                <div className="text-sm sm:text-base font-semibold text-gray-900 mb-0.5">{name}</div>
                                <div className="text-xs sm:text-sm text-gray-500">{date}</div>
                              </div>
                              <div className="mt-2 space-y-1">
                                <div className="text-xs sm:text-sm">
                                  <span className="text-gray-500">Email: </span>
                                  <span className="text-gray-700">{email}</span>
                                </div>
                                <div className="text-xs sm:text-sm">
                                  <span className="text-gray-500">Phone: </span>
                                  <span className="text-gray-700">{phone}</span>
                                </div>
                                <div className="text-xs sm:text-sm">
                                  <span className="text-gray-500">Message: </span>
                                  <span className="text-gray-700">{message}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile menu button */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden bg-white p-2 rounded-full shadow-md border border-gray-200"
        onClick={() => setSidebarOpen(true)}
      >
        <Bars3Icon className="h-6 w-6 text-gray-700" />
      </button>
    </div>
  )
}
