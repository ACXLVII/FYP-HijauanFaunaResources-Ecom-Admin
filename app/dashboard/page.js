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
  {
    name: 'Products',
    icon: ShoppingBagIcon,
    children: [
      { name: 'Live Grass', href: '/products/livegrass' },
      { name: 'Artificial Grass', href: '/products/artificialgrass' },
    ],
  },
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
  const [openMenus, setOpenMenus] = useState({ products: false })
  const [orders, setOrders] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalIncome: 0,
    pendingOrders: 0,
    completedOrders: 0,
  })
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
    if (orders.length === 0) {
      setStats({
        totalOrders: 0,
        totalIncome: 0,
        pendingOrders: 0,
        completedOrders: 0,
      })
      return
    }

    // Calculate stats
    const totalOrders = orders.length

    const totalIncome = orders.reduce((sum, order) => {
      const price = calculateTotalPrice(order.products || order.product, order.price)
      return sum + price
    }, 0)

    const pendingOrders = orders.filter(order => {
      const status = order.status || 'Pending'
      return status === 'Pending' || status === 'pending'
    }).length

    const completedOrders = orders.filter(order => {
      const status = order.status || ''
      return status === 'Shipped' || status === 'shipped' || status === 'Completed' || status === 'completed'
    }).length

    setStats({
      totalOrders,
      totalIncome,
      pendingOrders,
      completedOrders,
    })

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
    } else if (item.children) {
      // Toggle dropdown for Products
      setOpenMenus((prev) => ({
        ...prev,
        [item.name.toLowerCase()]: !prev[item.name.toLowerCase()],
      }))
    } else {
      setActiveNav(item.name)
      router.push(item.href)
    }
  }

  const handleSubNavClick = (subitem, e) => {
    e.preventDefault()
    setActiveNav(subitem.name)
    router.push(subitem.href)
  }

  const confirmLogout = () => {
    setShowLogoutConfirm(false)
    router.push('/logout')
  }

  const isActiveNav = (name) => {
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
              {navigation.map((item) => {
                const isParentActive = item.children && item.children.some((c) => activeNav === c.name)
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
                            ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                            : 'text-gray-500 hover:bg-blue-50 hover:text-blue-700',
                          'group flex items-center gap-x-3 rounded-lg p-3 text-lg font-semibold w-full text-left transition-all duration-200'
                        )}
                      >
                        <item.icon className="h-6 w-6 shrink-0" />
                        <span className="flex-1">{item.name}</span>
                        <svg
                          className={classNames(
                            'h-4 w-4 shrink-0 text-gray-400',
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
                        <ul className="mt-1 ml-4 space-y-1 border-l-2 border-gray-200 pl-4">
                          {item.children.map((subitem) => {
                            const isSubActive = activeNav === subitem.name
                            return (
                              <li key={subitem.name}>
                                <a
                                  href={subitem.href}
                                  onClick={(e) => {
                                    handleSubNavClick(subitem, e)
                                    setSidebarOpen(false)
                                  }}
                                  className={classNames(
                                    isSubActive
                                      ? 'bg-blue-100 text-blue-700 font-semibold'
                                      : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600',
                                    'block rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200'
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
                        handleNavigationClick(item, e)
                        setSidebarOpen(false)
                      }}
                      className={classNames(
                        isActiveNav(item.name)
                          ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                          : 'text-gray-500 hover:bg-blue-50 hover:text-blue-700',
                        'group flex items-center gap-x-3 rounded-md p-3 text-lg font-semibold transition-colors duration-200'
                      )}
                    >
                      <item.icon className="h-6 w-6 shrink-0" />
                      {item.name}
                    </a>
                  </li>
                )
              })}
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
              {navigation.map((item) => {
                const isParentActive = item.children && item.children.some((c) => activeNav === c.name)
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
                            ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600',
                          'group flex items-center gap-x-3 rounded-lg p-3 text-lg font-semibold w-full text-left transition-all duration-200'
                        )}
                      >
                        <item.icon className="h-6 w-6 shrink-0" />
                        <span className="flex-1">{item.name}</span>
                        <svg
                          className={classNames(
                            'h-4 w-4 shrink-0 text-gray-400',
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
                        <ul className="mt-1 ml-4 space-y-1 border-l-2 border-gray-200 pl-4">
                          {item.children.map((subitem) => {
                            const isSubActive = activeNav === subitem.name
                            return (
                              <li key={subitem.name}>
                                <a
                                  href={subitem.href}
                                  onClick={(e) => handleSubNavClick(subitem, e)}
                                  className={classNames(
                                    isSubActive
                                      ? 'bg-blue-100 text-blue-700 font-semibold'
                                      : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600',
                                    'block rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200'
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
                      onClick={(e) => handleNavigationClick(item, e)}
                      className={classNames(
                        isActiveNav(item.name)
                          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600',
                        'group flex items-center gap-x-3 rounded-lg p-3 text-lg font-semibold transition-all duration-200'
                      )}
                    >
                      <item.icon className="h-6 w-6 shrink-0" />
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
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg px-6 py-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="text-sm font-medium text-gray-500 mb-2">Total Orders</div>
              <div className="text-3xl font-bold text-gray-900">
                {stats.totalOrders}
              </div>
            </div>
            
            <div className="bg-white rounded-lg px-6 py-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="text-sm font-medium text-gray-500 mb-2">Total Income</div>
              <div className="text-3xl font-bold text-gray-900">
                RM {stats.totalIncome.toFixed(2)}
              </div>
            </div>
            
            <div className="bg-white rounded-lg px-6 py-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="text-sm font-medium text-gray-500 mb-2">Pending Orders</div>
              <div className="text-3xl font-bold text-yellow-600">
                {stats.pendingOrders}
              </div>
            </div>
            
            <div className="bg-white rounded-lg px-6 py-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="text-sm font-medium text-gray-500 mb-2">Completed Orders</div>
              <div className="text-3xl font-bold text-green-600">
                {stats.completedOrders}
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <section className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
              <a
                href="/orders"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View All →
              </a>
            </div>
            
            {recentOrders.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <div className="text-gray-400 mb-2">
                  <FolderIcon className="h-12 w-12 mx-auto" />
                </div>
                <p className="text-gray-500 font-medium">No orders found yet</p>
                <p className="text-sm text-gray-400 mt-1">Orders will appear here once customers place them</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-base font-semibold text-gray-900 truncate">{order.name}</div>
                            <div className="text-sm text-gray-500 mt-0.5">{order.date}</div>
                          </div>
                          <div className="ml-3 shrink-0">
                            <span className={statusBadge(order.status)}>{order.status}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                          <div>
                            <span className="text-gray-500">Product: </span>
                            <span className="text-gray-700 font-medium">{order.product}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Price: </span>
                            <span className="text-gray-700 font-semibold">{order.price}</span>
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
