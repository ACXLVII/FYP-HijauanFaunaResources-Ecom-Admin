'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  HomeIcon,
  UsersIcon,
  ShoppingBagIcon,
  FolderIcon,
  XMarkIcon,
  StarIcon,
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
    ],
  },
  { name: 'Customers', href: '/customers', icon: UsersIcon },
  { name: 'Orders', href: '/orders', icon: FolderIcon },
  { name: 'Review and Inquiry', href: '/review', icon: StarIcon },
  { name: 'Logout', href: '/logout', icon: XMarkIcon },
]

export default function CustomerPage() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [orders, setOrders] = useState([])
  const [activeNav, setActiveNav] = useState('Customers')
  const [openMenus, setOpenMenus] = useState({ products: false })
  const [showLogoutModal, setShowLogoutModal] = useState(false)

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

  const customersList = useMemo(() => {
    const map = new Map()
    orders.forEach((order) => {
      const key = `${order.name || ''}-${order.phone || ''}-${order.email || ''}`
      if (!map.has(key)) {
        map.set(key, {
          name: order.name || 'Unknown',
          phone: order.phone || '—',
          email: order.email || '—',
          address: order.address || '—',
        })
      }
    })
    return Array.from(map.values())
  }, [orders])

  const confirmLogout = () => {
    setShowLogoutModal(false)
    router.push('/logout')
  }

  const handleNavClick = (item) => {
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
          <div className="flex items-center px-4 pt-4 mb-8">
            <img alt="Logo" src="/logo.png" className="h-14 w-auto" />
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 ml-auto hover:text-gray-700 transition"
              aria-label="Close sidebar"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1">
            <ul role="list" className="space-y-2 px-2">
              {navigation.map((item) => {
                const isParentActive = activeNav === item.name || (item.children?.some(c => c.name === activeNav))
                const isOpen = openMenus[item.name.toLowerCase()] || false

                if (item.children) {
                  return (
                    <li key={item.name}>
                      <button
                        onClick={() => handleNavClick(item)}
                        className={classNames(
                          isParentActive
                            ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                            : 'text-gray-500 hover:bg-blue-50 hover:text-blue-700',
                          'w-full text-left group flex gap-x-4 rounded-md p-3 text-lg font-semibold transition-colors duration-200'
                        )}
                      >
                        <item.icon className="h-6 w-6" aria-hidden="true" />
                        {item.name}
                        <svg
                          className={classNames(
                            isOpen ? 'rotate-90 text-blue-500' : 'text-gray-400',
                            'ml-auto h-5 w-5 shrink-0 transform transition-transform duration-200'
                          )}
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path d="M6 6L14 10L6 14V6Z" />
                        </svg>
                      </button>
                      {isOpen && (
                        <ul className="mt-1 ml-6 space-y-1">
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
                                    ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                                    : 'text-gray-500 hover:bg-blue-50 hover:text-blue-700',
                                  'block rounded-md p-2 text-base font-medium'
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
                    <button
                      onClick={() => handleNavClick(item)}
                      className={classNames(
                        activeNav === item.name
                          ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                          : 'text-gray-500 hover:bg-blue-50 hover:text-blue-700',
                        'w-full text-left group flex gap-x-4 rounded-md p-3 text-lg font-semibold transition-colors duration-200'
                      )}
                    >
                      <item.icon className="h-6 w-6" aria-hidden="true" />
                      {item.name}
                    </button>
                  </li>
                )
              })}
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
              {navigation.map((item) => {
                const isParentActive = activeNav === item.name || (item.children?.some(c => c.name === activeNav))
                const isOpen = openMenus[item.name.toLowerCase()] || false

                if (item.children) {
                  return (
                    <li key={item.name}>
                      <button
                        onClick={() => handleNavClick(item)}
                        className={classNames(
                          isParentActive
                            ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                            : 'text-gray-500 hover:bg-blue-50 hover:text-blue-700',
                          'w-full text-left group flex gap-x-4 rounded-md p-3 text-lg font-semibold transition-colors duration-200'
                        )}
                      >
                        <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                        {item.name}
                        <svg
                          className={classNames(
                            isOpen ? 'rotate-90 text-blue-500' : 'text-gray-400',
                            'ml-auto h-5 w-5 shrink-0 transform transition-transform duration-200'
                          )}
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path d="M6 6L14 10L6 14V6Z" />
                        </svg>
                      </button>
                      {isOpen && (
                        <ul className="mt-1 ml-8 space-y-1 border-l border-gray-300">
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
                                    ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                                    : 'text-gray-500 hover:bg-blue-50 hover:text-blue-700',
                                  'block rounded-md p-2 text-base font-medium'
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
                    <button
                      onClick={() => handleNavClick(item)}
                      className={classNames(
                        activeNav === item.name
                          ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                          : 'text-gray-500 hover:bg-blue-50 hover:text-blue-700',
                        'w-full text-left group flex gap-x-4 rounded-md p-3 text-lg font-semibold transition-colors duration-200'
                      )}
                    >
                      <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                      {item.name}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-10 bg-white min-h-screen overflow-auto lg:ml-72">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-black">Customer List</h2>
                <p className="text-sm text-gray-500">
                </p>
              </div>
            </div>

            {/* Customer Table */}
            <div className="overflow-x-auto mt-8">
              <table className="min-w-full text-left text-sm text-gray-700 border-collapse">
                <thead>
                  <tr>
                    <th className="px-3 py-2 font-semibold border-b border-gray-200">Name</th>
                    <th className="px-3 py-2 font-semibold border-b border-gray-200">Phone</th>
                    <th className="px-3 py-2 font-semibold border-b border-gray-200">Email</th>
                    <th className="px-3 py-2 font-semibold border-b border-gray-200">Address</th>
                  </tr>
                </thead>
                <tbody>
                  {customersList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                        No customers found yet.
                      </td>
                    </tr>
                  ) : (
                    customersList.map((customer, idx) => (
                      <tr
                        key={`${customer.name}-${idx}`}
                        className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                      >
                        <td className="px-3 py-2 border-b border-gray-100">{customer.name}</td>
                        <td className="px-3 py-2 border-b border-gray-100">{customer.phone}</td>
                        <td className="px-3 py-2 border-b border-gray-100">{customer.email}</td>
                        <td className="px-3 py-2 border-b border-gray-100">{customer.address}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
          </div>
        </div>
      </main>
    </div>
  )
}
