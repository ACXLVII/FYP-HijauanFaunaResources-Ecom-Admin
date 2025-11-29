'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  HomeIcon,
  UsersIcon,
  ShoppingBagIcon,
  FolderIcon,
  XMarkIcon,
  StarIcon,
  Bars3Icon,
  MagnifyingGlassIcon,
  BellIcon,
} from '@heroicons/react/24/outline'
import { db } from '../firebase'
import { collection, onSnapshot } from 'firebase/firestore'
import { useRouter } from 'next/navigation'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

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
      { name: 'Furniture', href: '/products/furniture' },
      { name: 'Ornaments', href: '/products/ornaments' },
    ],
  },
  { name: 'Customers', href: '/customers', icon: UsersIcon },
  { name: 'Orders', href: '/orders', icon: FolderIcon },
  { name: 'Reviews and Inquiries', href: '/review', icon: StarIcon },
  { name: 'Logout', href: '/logout', icon: XMarkIcon },
]

export default function CustomerPage() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [orders, setOrders] = useState([])
  const [activeNav, setActiveNav] = useState('Customers')
  const [openMenus, setOpenMenus] = useState({ products: false })
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'Orders'), (snap) => {
      const list = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      setOrders(list)
    })
    return unsub
  }, [])

  const customersListRaw = useMemo(() => {
    const map = new Map()
    orders.forEach((order) => {
      const key = `${order.name || ''}-${order.phone || ''}-${order.email || ''}`
      
      // Get address from shippingDetails first, then top-level
      const shippingDetails = order.shippingDetails || {}
      const addressValue = shippingDetails.address || order.address
      const addressLine2Value = shippingDetails.addressLine2 || order.addressLine2
      const cityValue = shippingDetails.city || order.city
      const stateValue = shippingDetails.state || order.state
      const postcodeValue = shippingDetails.postcode || order.postcode
      
      // Combine address fields if they exist
      const addressParts = []
      if (addressValue && addressValue !== '—' && typeof addressValue === 'string') addressParts.push(addressValue)
      if (addressLine2Value && typeof addressLine2Value === 'string') addressParts.push(addressLine2Value)
      if (cityValue && typeof cityValue === 'string') addressParts.push(cityValue)
      if (stateValue && typeof stateValue === 'string') addressParts.push(stateValue)
      if (postcodeValue && typeof postcodeValue === 'string') addressParts.push(postcodeValue)
      const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : (addressValue || '—')
      
      if (!map.has(key)) {
        // First time seeing this customer - add them
        map.set(key, {
          name: order.name || 'Unknown',
          phone: order.phone || '—',
          email: order.email || '—',
          address: fullAddress,
        })
      } else {
        // Customer already exists - update address if current one is empty or new one is better
        const existing = map.get(key)
        const hasExistingAddress = existing.address && existing.address !== '—' && existing.address.trim() !== ''
        const hasNewAddress = fullAddress && fullAddress !== '—' && fullAddress.trim() !== ''
        
        // Update if: no existing address OR new address is more complete (has more parts)
        if (!hasExistingAddress || (hasNewAddress && addressParts.length > 0)) {
          map.set(key, {
            ...existing,
            address: fullAddress,
          })
        }
      }
    })
    return Array.from(map.values())
  }, [orders])

  // Filter customers based on search query
  const customersList = useMemo(() => {
    if (!searchQuery) return customersListRaw
    const query = searchQuery.toLowerCase().trim()
    return customersListRaw.filter((customer) => {
      return (
        customer.name?.toLowerCase().includes(query) ||
        customer.phone?.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query) ||
        customer.address?.toLowerCase().includes(query)
      )
    })
  }, [customersListRaw, searchQuery])

  const confirmLogout = () => {
    setShowLogoutModal(false)
    router.push('/logout')
  }

  const handleNavClick = (item, e) => {
    if (e) {
      e.preventDefault()
    }
    if (item.name === 'Logout') {
      setShowLogoutModal(true)
      setSidebarOpen(false)
    } else if (item.children) {
      setOpenMenus(prev => ({
        ...prev,
        [item.name.toLowerCase()]: !prev[item.name.toLowerCase()],
      }))

      // Auto-navigate to Live Grass on opening Products submenu
      if (!openMenus[item.name.toLowerCase()] && item.name === 'Products' && item.children.length > 0) {
        setActiveNav(item.children[0].name)
        router.push(item.children[0].href)
      }
    } else {
      setActiveNav(item.name)
      router.push(item.href)
      setSidebarOpen(false)
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen flex">
      {/* Mobile Sidebar */}
      <div className={`lg:hidden fixed inset-0 z-50 bg-gray-900 bg-opacity-75 ${sidebarOpen ? 'block' : 'hidden'}`}>
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
                aria-label="Close sidebar"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <nav className="flex-1">
              <ul role="list" className="space-y-1">
                {navigation.map((item) => {
                  const isParentActive = activeNav === item.name || (item.children?.some(c => c.name === activeNav))
                  const isOpen = openMenus[item.name.toLowerCase()] || false
                  const isActive = activeNav === item.name

                  if (item.children) {
                    return (
                      <li key={item.name}>
                        <button
                          onClick={() => handleNavClick(item)}
                          className={classNames(
                            isParentActive
                              ? 'bg-gray-900 text-white'
                              : 'text-gray-700 hover:bg-gray-100',
                            'group flex items-center gap-x-3 rounded-lg px-3 py-2.5 text-sm font-medium w-full text-left transition-all duration-200'
                          )}
                        >
                          <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
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
                            {item.children.map(subitem => (
                              <li key={subitem.name}>
                                <a
                                  href={subitem.href}
                                  onClick={e => {
                                    e.preventDefault()
                                    setActiveNav(subitem.name)
                                    router.push(subitem.href)
                                    setSidebarOpen(false)
                                  }}
                                  className={classNames(
                                    activeNav === subitem.name
                                      ? 'text-gray-900 font-semibold'
                                      : 'text-gray-600 hover:text-gray-900',
                                    'block px-2 py-1.5 text-sm transition-colors duration-200'
                                  )}
                                >
                                  {subitem.name}
                                </a>
                              </li>
                            ))}
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
                          handleNavClick(item, e)
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
                const isParentActive = activeNav === item.name || (item.children?.some(c => c.name === activeNav))
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
                          {item.children.map(subitem => (
                            <li key={subitem.name}>
                              <a
                                href={subitem.href}
                                onClick={e => {
                                  e.preventDefault()
                                  setActiveNav(subitem.name)
                                  router.push(subitem.href)
                                }}
                                className={classNames(
                                  activeNav === subitem.name
                                    ? 'text-gray-900 font-semibold'
                                    : 'text-gray-600 hover:text-gray-900',
                                  'block px-2 py-1.5 text-sm transition-colors duration-200'
                                )}
                              >
                                {subitem.name}
                              </a>
                            </li>
                          ))}
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
                        handleNavClick(item, e)
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
                <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
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
            {/* Search Bar - Under Header */}
            <div className="mb-4">
              <div className="relative w-full max-w-md mx-auto lg:mx-0">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border border-gray-200">
              <div className="mb-4 lg:mb-6">
                <h2 className="text-lg lg:text-2xl font-bold text-gray-900">Customer List</h2>
              </div>

            {/* Customer Cards */}
            {customersList.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <UsersIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">
                  {searchQuery ? 'No customers found' : 'No customers found yet'}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {searchQuery ? 'Try adjusting your search terms' : 'Customers will appear here once they place orders'}
                </p>
              </div>
            ) : (
              <>
                {/* Mobile: Simple vertical cards */}
                <div className="lg:hidden space-y-2.5">
                  {customersList.map((customer, idx) => (
                    <div
                      key={`${customer.name}-${idx}`}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                    >
                      <div className="text-sm font-semibold text-gray-900 mb-2">{customer.name}</div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-start">
                          <span className="text-gray-500 w-16 shrink-0">Phone:</span>
                          <span className="text-gray-700 flex-1 break-words">{customer.phone}</span>
                        </div>
                        <div className="flex items-start">
                          <span className="text-gray-500 w-16 shrink-0">Email:</span>
                          <span className="text-gray-700 flex-1 break-words">{customer.email}</span>
                        </div>
                        <div className="flex items-start">
                          <span className="text-gray-500 w-16 shrink-0">Address:</span>
                          <span className="text-gray-700 flex-1 break-words">{customer.address}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Desktop: Table layout */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Phone</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Email</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customersList.map((customer, idx) => (
                        <tr key={`${customer.name}-${idx}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 text-sm font-medium text-gray-900">{customer.name}</td>
                          <td className="py-3 px-4 text-sm text-gray-700">{customer.phone}</td>
                          <td className="py-3 px-4 text-sm text-gray-700">{customer.email}</td>
                          <td className="py-3 px-4 text-sm text-gray-700 max-w-xs">{customer.address}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Logout Confirmation */}
        {showLogoutModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
            aria-modal="true"
            role="dialog"
            aria-labelledby="logout-modal-title"
            aria-describedby="logout-modal-desc"
          >
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm text-left">
              <h3 id="logout-modal-title" className="text-lg font-semibold text-gray-900 mb-4">
                Confirm Logout
              </h3>
              <p id="logout-modal-desc" className="text-gray-700 mb-6">
                Are you sure you want to logout?
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button onClick={confirmLogout} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
        </main>
      </div>
    </div>
  )
}

