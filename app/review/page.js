'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  HomeIcon,
  UsersIcon,
  ShoppingBagIcon,
  FolderIcon,
  XMarkIcon,
  StarIcon,
  Bars3Icon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  BellIcon,
} from '@heroicons/react/24/outline'
import { db } from '../firebase'
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  {
    name: 'Products',
    icon: ShoppingBagIcon,
    children: [
      { name: 'Live Grass', href: '/products/livegrass' },
      { name: 'Artificial Grass', href: '/products/artificialgrass' },
      { name: 'Product Plants', href: '/products/productplants' },
      { name: 'Decorative Plants', href: '/products/decorativeplants' },
      { name: 'Boulders Rocks', href: '/products/bouldersplants' },
      { name: 'Pebbles Rocks', href: '/products/pebblesrocks' },
    ],
  },
  { name: 'Customers', href: '/customers', icon: UsersIcon },
  { name: 'Orders', href: '/orders', icon: FolderIcon },
  { name: 'Reviews and Inquiries', href: '/review', icon: StarIcon },
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

// Helper function to format phone number for WhatsApp
function formatPhoneForWhatsApp(phone) {
  if (!phone || phone === '—') return null
  // Remove all non-numeric characters
  const cleaned = String(phone).replace(/[^0-9]/g, '')
  // If phone starts with 0, assume it's a local number and might need country code
  // For now, just return the cleaned number - user should ensure country code is included
  return cleaned
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
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [openMenus, setOpenMenus] = useState({ products: false })
  const [reviews, setReviews] = useState([])
  const [inquiries, setInquiries] = useState([])
  const [activeNav, setActiveNav] = useState('Reviews and Inquiries')
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

  // Function to toggle inquiry status
  const toggleInquiryStatus = async (inquiryId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'Replied' ? 'Pending' : 'Replied'
      await updateDoc(doc(db, 'Contact', inquiryId), {
        status: newStatus
      })
    } catch (error) {
      console.error('Error updating inquiry status:', error)
      alert('Failed to update inquiry status. Please try again.')
    }
  }

  // Status badge helper function
  const getStatusBadge = (status) => {
    const normalizedStatus = status || 'Pending'
    if (normalizedStatus === 'Replied') {
      return 'px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800'
    }
    return 'px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800'
  }

  return (
    <div className="bg-gray-50 min-h-screen flex">
      {/* Mobile Sidebar */}
      <div
        className={`lg:hidden fixed inset-0 z-50 bg-gray-900 bg-opacity-75 ${
          sidebarOpen ? 'block' : 'hidden'
        }`}
      >
        <div className="flex flex-col w-64 bg-white h-full shadow-lg border-r">
          <div className="flex flex-col gap-y-6 overflow-y-auto px-4 py-6">
            {/* Logo */}
            <div className="flex items-center justify-between px-2 mb-2">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
                <span className="text-lg font-semibold text-gray-900">Admin</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-400 hover:text-gray-700 transition"
              >
                <XMarkIcon className="h-6 w-6 shrink-0" />
              </button>
            </div>
            
            <nav className="flex-1">
              <ul role="list" className="space-y-1">
                {navigation.map((item) => {
                  const isParentActive = item.children && item.children.some((c) => activeNav === c.name)
                  const isOpen = openMenus[item.name.toLowerCase()] || false
                  const isActive = activeNav === item.name

                  if (item.children) {
                    return (
                      <li key={item.name}>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenus((prev) => ({
                              ...prev,
                              [item.name.toLowerCase()]: !prev[item.name.toLowerCase()],
                            }))
                          }}
                          className={classNames(
                            isParentActive
                              ? 'bg-gray-900 text-white'
                              : 'text-gray-700 hover:bg-gray-100',
                            'group flex items-center gap-x-3 rounded-lg px-3 py-2.5 text-sm font-medium w-full text-left transition-all duration-200'
                          )}
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                          <span className="flex-1">{item.name}</span>
                          <svg
                            className={classNames(
                              'h-4 w-4 shrink-0',
                              isParentActive ? 'text-white' : 'text-gray-400',
                              isOpen ? 'rotate-90' : 'rotate-0',
                              'transform transition-transform duration-200'
                            )}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        {isOpen && (
                          <ul className="mt-1 ml-8 space-y-1">
                            {item.children.map((subitem) => {
                              const isSubActive = activeNav === subitem.name
                              return (
                                <li key={subitem.name}>
                                  <a
                                    href={subitem.href}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      setActiveNav(subitem.name)
                                      router.push(subitem.href)
                                      setSidebarOpen(false)
                                    }}
                                    className={classNames(
                                      isSubActive
                                        ? 'text-gray-900 font-semibold'
                                        : 'text-gray-600 hover:text-gray-900',
                                      'block px-2 py-1.5 text-sm transition-colors duration-200'
                                    )}
                                  >
                                    {subitem.name}
                                  </a>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </li>
                    )
                  }

                  return (
                    <li key={item.name}>
                      <a
                        href={item.href}
                        onClick={(e) => {
                          e.preventDefault()
                          if (item.name === 'Logout') {
                            // Handle logout
                          } else {
                            setActiveNav(item.name)
                            router.push(item.href)
                            setSidebarOpen(false)
                          }
                        }}
                        className={classNames(
                          isActive
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-700 hover:bg-gray-100',
                          'group flex items-center gap-x-3 rounded-lg px-3 py-2.5 text-sm font-medium w-full transition-all duration-200'
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                        <span className="flex-1">{item.name}</span>
                      </a>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar - HR Dashboard Style */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:bg-white lg:fixed lg:inset-y-0 lg:z-50 border-r border-gray-200">
        <div className="flex flex-col gap-y-6 overflow-y-auto px-4 py-6">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 mb-2">
            <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
            <span className="text-lg font-semibold text-gray-900">Admin</span>
          </div>
          
          <nav className="flex-1">
            <ul role="list" className="space-y-1">
              {navigation.map((item) => {
                const isParentActive = item.children && item.children.some((c) => activeNav === c.name)
                const isActive = activeNav === item.name
                const isOpen = openMenus[item.name.toLowerCase()] || false

                if (item.children) {
                  return (
                    <li key={item.name}>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenus((prev) => ({
                            ...prev,
                            [item.name.toLowerCase()]: !prev[item.name.toLowerCase()],
                          }))
                        }}
                        className={classNames(
                          isParentActive
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-700 hover:bg-gray-100',
                          'group flex items-center gap-x-3 rounded-lg px-3 py-2.5 text-sm font-medium w-full text-left transition-all duration-200'
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="flex-1">{item.name}</span>
                        <svg
                          className={classNames(
                            'h-4 w-4 shrink-0',
                            isParentActive ? 'text-white' : 'text-gray-400',
                            isOpen ? 'rotate-90' : 'rotate-0',
                            'transform transition-transform duration-200'
                          )}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      {isOpen && (
                        <ul className="mt-1 ml-8 space-y-1">
                          {item.children.map((subitem) => {
                            const isSubActive = activeNav === subitem.name
                            return (
                              <li key={subitem.name}>
                                <a
                                  href={subitem.href}
                                  onClick={(e) => {
                                    e.preventDefault()
                                    setActiveNav(subitem.name)
                                    router.push(subitem.href)
                                  }}
                                  className={classNames(
                                    isSubActive
                                      ? 'text-gray-900 font-semibold'
                                      : 'text-gray-600 hover:text-gray-900',
                                    'block px-2 py-1.5 text-sm transition-colors duration-200'
                                  )}
                                >
                                  {subitem.name}
                                </a>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </li>
                  )
                }

                return (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      onClick={(e) => {
                        e.preventDefault()
                        if (item.name === 'Logout') {
                          // Handle logout
                        } else {
                          setActiveNav(item.name)
                          router.push(item.href)
                        }
                      }}
                      className={classNames(
                        isActive
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-700 hover:bg-gray-100',
                        'group flex items-center gap-x-3 rounded-lg px-3 py-2.5 text-sm font-medium w-full transition-all duration-200'
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="flex-1">{item.name}</span>
                    </a>
                  </li>
                )
              })}
            </ul>
          </nav>
          
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:pl-64 w-full">
        {/* Top Header Bar - HR Dashboard Style */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="px-4 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              {/* Left: Hamburger Menu and Search Bar */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden text-gray-600 hover:text-gray-900 p-2"
                  aria-label="Open menu"
                >
                  <Bars3Icon className="h-6 w-6" />
                </button>
              </div>
              
              {/* Center: Title and Date */}
              <div className="flex-1 lg:flex-none lg:text-center">
                <h1 className="text-2xl font-bold text-gray-900">Review and Inquiry</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              
              {/* Right: Actions */}
              <div className="flex items-center gap-3">
                <button className="hidden lg:block p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                  <BellIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </header>
        
        <main className="p-4 lg:p-8 flex-1 overflow-auto bg-gray-50">
          <div className="max-w-7xl mx-auto">
            {/* Mobile: Search Bar */}
            <div className="lg:hidden mb-4">
              <div className="relative w-full">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                />
              </div>
            </div>

          {/* Header - Mobile: Compact, Desktop: Spacious */}
          <div className="mb-4 lg:mb-6">
            <h1 className="text-xl lg:text-3xl font-bold text-gray-900 mb-1 lg:mb-2">Reviews and Inquiries</h1>
          </div>

          {/* Tabs - Mobile: Scrollable, Desktop: Fixed */}
          <div className="bg-white rounded-xl lg:rounded-lg shadow-sm lg:shadow-md mb-4 lg:mb-6 border border-gray-200">
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

            {/* Content Area - Mobile: Stacked, Desktop: Grid */}
            <div className="p-3 lg:p-6">
              {activeTab === 'reviews' ? (
                /* Reviews Cards */
                filteredReviews.length === 0 ? (
                  <div className="px-4 py-8 lg:py-12 text-center text-gray-500">
                    <StarIcon className="h-10 w-10 lg:h-12 lg:w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm lg:text-base">
                      {searchQuery || selectedRating
                        ? 'No reviews match your filters.'
                        : 'No reviews found yet.'}
                    </p>
                  </div>
                      ) : (
                  <>
                    {/* Mobile: Simple vertical cards */}
                    <div className="lg:hidden space-y-3">
                      {filteredReviews.map((review) => {
                        const rating = review.rating || review.stars || review.starRating || 0
                        const customerName = review.customerName || review.name || review.customer || 'Anonymous'
                        const comment = review.description || '—'
                        const date = formatDate(review.date, review.timestamp)
                        
                        return (
                          <div key={review.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="text-sm font-semibold text-gray-900">{customerName}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{date}</div>
                              </div>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <StarIcon
                                    key={star}
                                    className={`h-3 w-3 ${
                                      star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-gray-700 leading-relaxed">{comment}</p>
                          </div>
                        )
                      })}
                    </div>
                    
                    {/* Desktop: Grid layout */}
                    <div className="hidden lg:grid lg:grid-cols-2 gap-4">
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
                  </>
                )
              ) : (
                /* Inquiries Cards */
                filteredInquiries.length === 0 ? (
                  <div className="px-4 py-8 lg:py-12 text-center text-gray-500">
                    <ChatBubbleLeftRightIcon className="h-10 w-10 lg:h-12 lg:w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm lg:text-base">
                      {searchQuery
                        ? 'No inquiries match your search.'
                        : 'No inquiries found yet.'}
                    </p>
                  </div>
                      ) : (
                  <>
                    {/* Mobile: Simple vertical cards */}
                    <div className="lg:hidden space-y-3">
                      {filteredInquiries.map((inquiry) => {
                        const name = inquiry.name || inquiry.customerName || inquiry.customer || 'Anonymous'
                        const email = inquiry.email || '—'
                        const phone = inquiry.phoneNumber ? String(inquiry.phoneNumber).trim() : '—'
                        const message = inquiry.message || inquiry.description || inquiry.comment || '—'
                        const date = formatDate(inquiry.date, inquiry.timestamp)
                        const status = inquiry.status || 'Pending'

                        return (
                          <div key={inquiry.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex-1">
                                <div className="text-sm font-semibold text-gray-900 mb-1">{name}</div>
                                <div className="text-xs text-gray-500 mb-2">{date}</div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <span className={getStatusBadge(status)}>{status}</span>
                                <button
                                  onClick={() => toggleInquiryStatus(inquiry.id, status)}
                                  className="text-xs px-2 py-1 bg-gray-900 hover:bg-gray-800 text-white rounded transition-colors"
                                >
                                  {status === 'Replied' ? 'Mark Pending' : 'Mark Replied'}
                                </button>
                              </div>
                            </div>
                            <div className="space-y-1.5 text-xs">
                              <div className="flex items-start">
                                <span className="text-gray-500 w-16 shrink-0">Email:</span>
                                <span className="text-gray-700 flex-1 break-words">{email}</span>
                              </div>
                              <div className="flex items-start">
                                <span className="text-gray-500 w-16 shrink-0">Phone:</span>
                                {formatPhoneForWhatsApp(phone) ? (
                                  <a
                                    href={`https://wa.me/${formatPhoneForWhatsApp(phone)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 hover:underline flex-1 break-words flex items-center gap-1"
                                  >
                                    {phone}
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                    </svg>
                                  </a>
                                ) : (
                                  <span className="text-gray-700 flex-1 break-words">{phone}</span>
                                )}
                              </div>
                              <div className="flex items-start">
                                <span className="text-gray-500 w-16 shrink-0">Message:</span>
                                <span className="text-gray-700 flex-1 break-words leading-relaxed">{message}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    
                    {/* Desktop: Grid layout */}
                    <div className="hidden lg:grid lg:grid-cols-2 gap-4">
                      {filteredInquiries.map((inquiry) => {
                        const name = inquiry.name || inquiry.customerName || inquiry.customer || 'Anonymous'
                        const email = inquiry.email || '—'
                        const phone = inquiry.phoneNumber ? String(inquiry.phoneNumber).trim() : '—'
                        const message = inquiry.message || inquiry.description || inquiry.comment || '—'
                        const date = formatDate(inquiry.date, inquiry.timestamp)
                        const status = inquiry.status || 'Pending'

                        return (
                          <div key={inquiry.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="text-base font-semibold text-gray-900 mb-0.5">{name}</div>
                                <div className="text-sm text-gray-500">{date}</div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <span className={getStatusBadge(status)}>{status}</span>
                                <button
                                  onClick={() => toggleInquiryStatus(inquiry.id, status)}
                                  className="text-xs px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded transition-colors"
                                >
                                  {status === 'Replied' ? 'Mark Pending' : 'Mark Replied'}
                                </button>
                              </div>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="text-gray-500">Email: </span>
                                <span className="text-gray-700">{email}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Phone: </span>
                                {formatPhoneForWhatsApp(phone) ? (
                                  <a
                                    href={`https://wa.me/${formatPhoneForWhatsApp(phone)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                                  >
                                    {phone}
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                    </svg>
                                  </a>
                                ) : (
                                  <span className="text-gray-700">{phone}</span>
                                )}
                              </div>
                              <div>
                                <span className="text-gray-500">Message: </span>
                                <span className="text-gray-700 leading-relaxed">{message}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )
              )}
            </div>
          </div>
        </div>
        </main>
      </div>

    </div>
  )
}
