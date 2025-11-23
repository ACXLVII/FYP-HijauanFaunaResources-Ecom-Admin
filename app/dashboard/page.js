'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  HomeIcon,
  UsersIcon,
  ShoppingBagIcon,
  FolderIcon,
  XMarkIcon,
  StarIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline'
import { db } from '../firebase'
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore'

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

// Status badge color helper - pill-shaped badges
function statusBadge(status) {
  const base = 'px-2.5 py-1 rounded-full text-xs font-semibold'
  switch (status) {
    case "Shipped":
      return base + " bg-green-100 text-green-800";
    case "Pending":
      return base + " bg-yellow-100 text-yellow-800";
    default:
      return base + ' bg-gray-100 text-gray-700'
  }
}

function extractProductName(products) {
  if (!products) return '—'
  if (Array.isArray(products)) {
    if (products.length === 0) return '—'
    const first = products[0]
    if (typeof first === 'object') {
      return first.name || first.category || first.label || '—'
    }
    return String(first)
  }
  if (typeof products === 'object') {
    return products.name || products.category || products.label || '—'
  }
  return String(products)
}

function calculateTotalPrice(products, orderPrice) {
  if (Array.isArray(products)) {
    return products.reduce((sum, item) => {
      const price = typeof item === 'object' ? (item.price || 0) : 0
      return sum + Number(price)
    }, 0) || orderPrice || 0
  }
  if (typeof products === 'object' && products.price) {
    return Number(products.price) || orderPrice || 0
  }
  return orderPrice || 0
}

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [orders, setOrders] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [stats, setStats] = useState([
    { name: 'Total Order', stat: '0' },
    { name: 'Total Income', stat: 'RM 0.00' },
  ])
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const router = useRouter()

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

  useEffect(() => {
    if (orders.length === 0) return

    // Calculate stats
    const totalOrders = orders.length

    const totalIncome = orders.reduce((sum, order) => {
      const price = calculateTotalPrice(order.products || order.product, order.price)
      return sum + price
    }, 0)

    setStats([
      { name: 'Total Order', stat: totalOrders.toString() },
      { name: 'Total Income', stat: `RM ${totalIncome.toFixed(2)}` },
    ])

    // Get recent orders (sorted by timestamp, limit to 5)
    const sortedOrders = [...orders]
      .sort((a, b) => {
        const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : a.timestamp?.seconds ? new Date(a.timestamp.seconds * 1000) : new Date(0)
        const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : b.timestamp?.seconds ? new Date(b.timestamp.seconds * 1000) : new Date(0)
        return dateB - dateA
      })
      .slice(0, 5)
      .map((order) => {
        const productName = extractProductName(order.products || order.product)
        const price = calculateTotalPrice(order.products || order.product, order.price)
        let date = '—'
        if (order.timestamp?.toDate) {
          const d = order.timestamp.toDate()
          date = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
        } else if (order.timestamp?.seconds) {
          const d = new Date(order.timestamp.seconds * 1000)
          date = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
        } else if (order.date) {
          date = typeof order.date === 'string' ? order.date : String(order.date)
        }
        const status = order.status || 'Pending'
        return {
          id: order.id,
          name: order.name || '—',
          product: productName,
          price: `RM ${price.toFixed(2)}`,
          date: date,
          status: status,
        }
      })

    setRecentOrders(sortedOrders)
  }, [orders])

  const handleNavigationClick = (item, e) => {
    e.preventDefault()
    if (item.name === 'Logout') {
      setShowLogoutConfirm(true)
    } else if (item.name === 'Products') {
      router.push('/products/livegrass')
      setActiveNav('') 
    } else {
      setActiveNav(item.name)
      router.push(item.href)
    }
  }

  const confirmLogout = () => {
    setShowLogoutConfirm(false)
    router.push('/logout')
  }

  // Products menu never gets highlighted
  const isActiveNav = (name) => {
    if (name === 'Products') return false
    return activeNav === name
  }

  return (
    <div className="bg-gray-50 min-h-screen flex">

      {/* Mobile Sidebar */}
      <div className={`lg:hidden fixed inset-0 z-50 bg-gray-900 bg-opacity-75 ${sidebarOpen ? 'block' : 'hidden'}`}>
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
                    onClick={(e) => {
                      handleNavigationClick(item, e)
                      setSidebarOpen(false)
                    }}
                    className={classNames(
                      isActiveNav(item.name)
                        ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                        : 'text-gray-500 hover:bg-blue-50 hover:text-blue-700',
                      'group flex gap-x-4 rounded-md p-3 text-lg font-semibold transition-colors duration-200'
                    )}
                  >
                    <item.icon className="h-6 w-6" />
                    {item.name}
                    {/* Always show arrow icon for Products */}
                    {item.name === 'Products' && (
                      <svg
                        className="ml-auto h-5 w-5 shrink-0 text-gray-400"
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path d="M6 6L14 10L6 14V6Z" />
                      </svg>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-72 lg:bg-white lg:fixed lg:inset-y-0 lg:z-50 shadow-lg border-r border-gray-200">
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
                    onClick={(e) => handleNavigationClick(item, e)}
                    className={classNames(
                      isActiveNav(item.name)
                        ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600',
                      'group flex items-center gap-x-3 rounded-lg p-3 text-base font-semibold transition-all duration-200'
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className="flex-1">{item.name}</span>
                    {/* Always show arrow icon for Products */}
                    {item.name === 'Products' && (
                      <svg
                        className="h-4 w-4 shrink-0 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:pl-72 w-full">
        {/* Mobile Header with Menu Button */}
        <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
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
        
        <main className="p-4 sm:p-6 lg:p-8 flex-1 overflow-auto bg-gray-50">
          <h3 className="text-xl sm:text-2xl font-bold text-black mb-6">Dashboard</h3>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {stats.map((item) => (
              <div
                key={item.name}
                className="bg-white rounded-lg px-6 py-5 shadow border border-gray-200"
              >
                <div className="text-sm font-medium text-gray-500 mb-2">{item.name}</div>
                <div className="text-3xl font-semibold text-gray-900">
                  {item.stat}
                </div>
              </div>
            ))}
          </div>

          {/* Recent Orders */}
          <section className="bg-white rounded-lg shadow p-4 sm:p-6 border border-gray-200">
            <h2 className="text-lg font-semibold mb-3 sm:mb-4 text-gray-900">Recent Orders</h2>
            
            {recentOrders.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                No orders found yet.
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {/* Each order is a compact card matching the image design */}
                {recentOrders.map((order, idx) => (
                  <div
                    key={order.id}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <div className="text-sm sm:text-base font-semibold text-gray-900 mb-0.5">{order.name}</div>
                            <div className="text-xs sm:text-sm text-gray-500">{order.date}</div>
                          </div>
                          <div className="sm:ml-4">
                            <span className={statusBadge(order.status)}>{order.status}</span>
                          </div>
                        </div>
                        <div className="mt-2 space-y-1">
                          <div className="text-xs sm:text-sm">
                            <span className="text-gray-500">Product: </span>
                            <span className="text-gray-700">{order.product}</span>
                          </div>
                          <div className="text-xs sm:text-sm">
                            <span className="text-gray-500">Price: </span>
                            <span className="text-gray-700">{order.price}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Logout</h3>
            <p className="text-gray-700 mb-6">Are you sure you want to logout?</p>
            <div className="flex justify-end space-x-3">
              <button
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                onClick={() => {
                  setShowLogoutConfirm(false)
                  router.push('/logout')
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
