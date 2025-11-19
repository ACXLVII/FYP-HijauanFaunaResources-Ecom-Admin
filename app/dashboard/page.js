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

// Status badge color helper - matches Orders page styling
function statusBadge(status) {
  const base = 'px-2 py-1 rounded-full text-xs font-semibold'
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
          date = order.timestamp.toDate().toLocaleDateString()
        } else if (order.timestamp?.seconds) {
          date = new Date(order.timestamp.seconds * 1000).toLocaleDateString()
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

      {/* Main Content */}
      <div className="flex flex-col lg:pl-72 w-full">
        <main className="p-8 flex-1 overflow-auto">
          <h3 className="text-2xl font-bold text-black mb-8">Dashboard</h3>

          {/* Stats Cards */}
          <dl className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-10">
            {stats.map((item) => (
              <div
                key={item.name}
                className="overflow-hidden rounded-xl bg-white px-6 py-7 shadow transition hover:shadow-lg border"
              >
                <dt className="truncate text-sm font-medium text-gray-500">{item.name}</dt>
                <dd className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">
                  {item.stat}
                </dd>
              </div>
            ))}
          </dl>

          {/* Recent Orders */}
          <section className="bg-white rounded-xl shadow p-8 border">
            <h2 className="text-lg font-semibold mb-6 text-gray-700">Recent Orders</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left border-collapse">
                <thead>
                  <tr>
                    <th className="px-4 py-2 font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">Date</th>
                    <th className="px-4 py-2 font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">Name</th>
                    <th className="px-4 py-2 font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">Product</th>
                    <th className="px-4 py-2 font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">Price</th>
                    <th className="px-4 py-2 font-semibold text-gray-500 uppercase tracking-wider border-b border-r border-gray-200">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No orders found yet.
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((order, idx) => (
                      <tr
                        key={order.id}
                        className={
                          idx % 2 === 0 ? 'bg-gray-50 hover:bg-blue-50 transition' : 'bg-white hover:bg-blue-50 transition'
                        }
                      >
                        <td className="whitespace-nowrap px-4 py-2 border-b border-gray-200 text-gray-900">{order.date}</td>
                        <td className="whitespace-nowrap px-4 py-2 border-b border-gray-200 text-gray-900">{order.name}</td>
                        <td className="whitespace-nowrap px-4 py-2 border-b border-gray-200 text-gray-900">{order.product}</td>
                        <td className="whitespace-nowrap px-4 py-2 border-b border-gray-200 text-gray-900">{order.price}</td>
                        <td className="whitespace-nowrap px-4 py-2 border-b border-r border-gray-200">
                          <span className={statusBadge(order.status)}>{order.status}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
