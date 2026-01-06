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
  MagnifyingGlassIcon,
  BellIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
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
  // Priority 1: Use order price if available (most accurate)
  if (orderPrice !== undefined && orderPrice !== null) {
    const numPrice = Number(orderPrice)
    if (!isNaN(numPrice) && numPrice > 0) {
      return numPrice
    }
  }

  // Priority 2: Calculate from products array
  if (Array.isArray(products) && products.length > 0) {
    const total = products.reduce((sum, item) => {
      if (typeof item === 'object' && item !== null) {
        // If item has a price field, use it (might already be quantity * pricePerUnit)
        if (item.price !== undefined && item.price !== null) {
          return sum + Number(item.price || 0)
        }
        // Otherwise, calculate price * quantity
        const itemPrice = Number(item.pricePerUnit || item.price || item.amount || 0)
        const quantity = Number(item.quantity || item.qty || 1)
        return sum + (itemPrice * quantity)
      }
      return sum
    }, 0)
    
    if (total > 0) {
      return total
    }
  }

  // Priority 3: Single product object
  if (typeof products === 'object' && products !== null) {
    if (products.price !== undefined && products.price !== null) {
      const numPrice = Number(products.price)
      if (!isNaN(numPrice) && numPrice > 0) {
        return numPrice
      }
    }
    // Calculate from pricePerUnit * quantity
    const itemPrice = Number(products.pricePerUnit || products.price || products.amount || 0)
    const quantity = Number(products.quantity || products.qty || 1)
    const calculated = itemPrice * quantity
    if (calculated > 0) {
      return calculated
    }
  }

  // Fallback: return 0 if nothing found
  return 0
}

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [openMenus, setOpenMenus] = useState({ products: false })
  const [orders, setOrders] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [inquiries, setInquiries] = useState([])
  const [productsMap, setProductsMap] = useState({}) // Map of product ID to category
  const [salesByCategory, setSalesByCategory] = useState([]) // Array of {category, amount, percentage}
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalIncome: 0,
    pendingOrders: 0,
    completedOrders: 0,
  })
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const router = useRouter()

  // Fetch products from all collections to create category mapping
  useEffect(() => {
    const unsubs = []
    const productCategoryMap = {}
    
    // Fetch from ArtificialGrass collection
    const unsub1 = onSnapshot(collection(db, 'ArtificialGrass'), (snap) => {
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data()
        const productId = data.id || docSnap.id
        if (productId) {
          productCategoryMap[productId] = 'Artificial Grass'
        }
      })
      setProductsMap((prev) => ({ ...prev, ...productCategoryMap }))
    })
    unsubs.push(unsub1)
    
    // Fetch from LiveGrass collection
    const unsub2 = onSnapshot(collection(db, 'LiveGrass'), (snap) => {
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data()
        const productId = data.id || docSnap.id
        if (productId) {
          productCategoryMap[productId] = 'Live Grass'
        }
      })
      setProductsMap((prev) => ({ ...prev, ...productCategoryMap }))
    })
    unsubs.push(unsub2)
    
    // Fetch from ProducePlants collection
    const unsub3 = onSnapshot(collection(db, 'ProducePlants'), (snap) => {
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data()
        const productId = data.id || docSnap.id
        if (productId) {
          productCategoryMap[productId] = 'Product Plants'
        }
      })
      setProductsMap((prev) => ({ ...prev, ...productCategoryMap }))
    })
    unsubs.push(unsub3)
    
    // Fetch from DecorativePlants collection
    const unsub4 = onSnapshot(collection(db, 'DecorativePlants'), (snap) => {
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data()
        const productId = data.id || docSnap.id
        if (productId) {
          productCategoryMap[productId] = 'Decorative Plants'
        }
      })
      setProductsMap((prev) => ({ ...prev, ...productCategoryMap }))
    })
    unsubs.push(unsub4)
    
    // Fetch from Boulders collection
    const unsub5 = onSnapshot(collection(db, 'Boulders'), (snap) => {
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data()
        const productId = data.id || docSnap.id
        if (productId) {
          productCategoryMap[productId] = 'Boulders Rocks'
        }
      })
      setProductsMap((prev) => ({ ...prev, ...productCategoryMap }))
    })
    unsubs.push(unsub5)
    
    // Fetch from Pebbles collection
    const unsub6 = onSnapshot(collection(db, 'Pebbles'), (snap) => {
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data()
        const productId = data.id || docSnap.id
        if (productId) {
          productCategoryMap[productId] = 'Pebbles Rocks'
        }
      })
      setProductsMap((prev) => ({ ...prev, ...productCategoryMap }))
    })
    unsubs.push(unsub6)
    
    return () => {
      unsubs.forEach((unsub) => unsub && unsub())
    }
  }, [])

  // Fetch orders from Orders collection
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

  // Fetch inquiries from Contact collection
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'Contact'), (snap) => {
      const list = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      setInquiries(list)
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

  // Calculate sales by category
  useEffect(() => {
    if (orders.length === 0 || Object.keys(productsMap).length === 0) {
      setSalesByCategory([])
      return
    }

    // Category colors mapping - all predefined categories
    const categoryColors = {
      'Live Grass': '#f97316', // orange
      'Artificial Grass': '#3b82f6', // blue
      'Product Plants': '#eab308', // yellow
      'Decorative Plants': '#ef4444', // red
      'Boulders Rocks': '#22c55e', // green
      'Pebbles Rocks': '#8b5cf6', // purple
      'Other': '#6b7280', // gray
    }

    // Normalize category name to match predefined categories
    const normalizeCategory = (categoryName) => {
      if (!categoryName) return 'Other'
      const normalized = String(categoryName).trim()
      
      // Direct match
      if (categoryColors[normalized]) return normalized
      
      // Case-insensitive match
      const lower = normalized.toLowerCase()
      for (const key in categoryColors) {
        if (key.toLowerCase() === lower) return key
      }
      
      // Partial match for common variations
      if (lower.includes('live') && lower.includes('grass')) return 'Live Grass'
      if (lower.includes('artificial') && lower.includes('grass')) return 'Artificial Grass'
      if (lower.includes('product') && lower.includes('plant')) return 'Product Plants'
      if (lower.includes('decorative') && lower.includes('plant')) return 'Decorative Plants'
      if (lower.includes('boulder')) return 'Boulders Rocks'
      if (lower.includes('pebble')) return 'Pebbles Rocks'
      
      return 'Other'
    }

    // Initialize all categories with 0 sales
    const categorySales = {}
    Object.keys(categoryColors).forEach(category => {
      categorySales[category] = 0
    })
    
    orders.forEach((order) => {
      const products = order.products || (order.product ? [order.product] : [])
      const productsArray = Array.isArray(products) ? products : [products]
      
      // If we have products array
      if (productsArray.length > 0 && productsArray[0]) {
        productsArray.forEach((product) => {
          let category = 'Other'
          let price = 0
          
          if (typeof product === 'object' && product !== null) {
            // Priority 1: Get category directly from product object (most accurate)
            if (product.category) {
              category = normalizeCategory(product.category)
            } else {
              // Priority 2: Get category from product ID lookup in productsMap
              const productId = product.id || ''
              if (productId && productsMap[productId]) {
                category = normalizeCategory(productsMap[productId])
              }
            }
            
            // Calculate price: use product price * quantity
            const productPrice = Number(product.price || product.amount || 0)
            const quantity = Number(product.quantity || product.qty || 1)
            price = productPrice * quantity
            
            // If price is still 0 or invalid, try to calculate from order total
            if (price === 0 || isNaN(price)) {
              const orderTotal = Number(order.price || 0)
              if (orderTotal > 0) {
                // Distribute order total evenly across all products
                price = orderTotal / Math.max(productsArray.length, 1)
              }
            }
          } else {
            // Product is not an object, use order price divided by items
            const orderTotal = Number(order.price || 0)
            price = orderTotal / Math.max(productsArray.length, 1)
          }
          
          // Ensure price is valid
          if (isNaN(price) || price < 0) {
            price = 0
          }
          
          // Add to category sales
          const normalizedCategory = normalizeCategory(category)
          if (!categorySales[normalizedCategory]) {
            categorySales[normalizedCategory] = 0
          }
          categorySales[normalizedCategory] += price
        })
      } else {
        // No products found, categorize as "Other"
        const orderTotal = Number(order.price || 0)
        if (!isNaN(orderTotal) && orderTotal > 0) {
          categorySales['Other'] = (categorySales['Other'] || 0) + orderTotal
        }
      }
    })

    // Calculate total sales
    const totalSales = Object.values(categorySales).reduce((sum, amount) => sum + amount, 0)

    // Convert to array and calculate percentages
    const salesArray = Object.entries(categorySales)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalSales > 0 ? (amount / totalSales) * 100 : 0,
        color: categoryColors[category] || '#6b7280', // gray as default
      }))
      .sort((a, b) => {
        // Sort by amount descending, but keep "Other" at the end
        if (a.category === 'Other') return 1
        if (b.category === 'Other') return -1
        return b.amount - a.amount
      })

    setSalesByCategory(salesArray)
  }, [orders, productsMap])

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
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
            
          <nav className="flex-1">
              <ul role="list" className="space-y-1">
                {navigation.map((item) => {
                  const isParentActive = item.children && item.children.some((c) => activeNav === c.name)
                  const isOpen = openMenus[item.name.toLowerCase()] || false
                  const isActive = isActiveNav(item.name)

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
                                      handleSubNavClick(subitem, e)
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
                      handleNavigationClick(item, e)
                      setSidebarOpen(false)
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
                const isOpen = openMenus[item.name.toLowerCase()] || false
                const isActive = isActiveNav(item.name)

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
                                    handleSubNavClick(subitem, e)
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
                        handleNavigationClick(item, e)
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
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
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
        
        <main className="p-3 lg:p-4 flex-1 overflow-auto bg-gray-50">
          {/* Combined Section - Left Column (Total Orders + Status Cards) and Right Column (Sales Chart) */}
          <div className="flex flex-col lg:flex-row gap-3 mb-3 items-stretch">
            {/* Left Column - Total Orders and Status Cards */}
            <div className="max-w-sm">
              <div className="space-y-3">
                {/* Total Pending Orders Card */}
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-all relative overflow-hidden">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center shrink-0">
                      <ClockIcon className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-gray-900 text-2xl font-bold">{stats.pendingOrders}</div>
                      <div className="text-gray-600 text-sm mt-1">{stats.pendingOrders === 1 ? 'order is' : 'orders are'} still pending</div>
                    </div>
                  </div>
                </div>
                
                {/* Orders Card */}
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 relative overflow-hidden">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-xl font-bold text-gray-900 mb-0.5">{stats.totalOrders} orders</div>
                      <div className="text-sm text-gray-600">{stats.pendingOrders} orders are awaiting confirmation.</div>
                    </div>
                  </div>
                </div>
                
                {/* Customers Card */}
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 relative overflow-hidden">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                      <UsersIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xl font-bold text-gray-900 mb-0.5">
                        {inquiries.length} {inquiries.length === 1 ? 'customer' : 'customers'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {(() => {
                          const pendingCount = inquiries.filter(inq => (inq.status || 'Pending') === 'Pending').length
                          return `${pendingCount} ${pendingCount === 1 ? 'customer is' : 'customers are'} waiting for response.`
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Column - Sales by Category Donut Chart */}
            <div className="bg-white rounded-xl p-3 sm:p-4 lg:p-5 shadow-sm border border-gray-200 flex flex-col flex-1">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900">Sales by Category</h3>
                  <p className="text-xs text-gray-500 mt-0.5">This month vs last</p>
                </div>
              </div>
              {/* Chart and Legend - Responsive Layout */}
              {salesByCategory.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-gray-500">No sales data available</p>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row items-center lg:items-center gap-4 lg:gap-6">
                  {/* Simple Donut Chart */}
                  <div className="flex items-center justify-center shrink-0">
                    <div className="relative w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        {/* Background circle */}
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                        {/* Dynamic segments */}
                        {(() => {
                          const circumference = 2 * Math.PI * 40 // r=40
                          let cumulativeOffset = 0
                          return salesByCategory.map((item, index) => {
                            const dashLength = (item.percentage / 100) * circumference
                            const dashArray = `${dashLength} ${circumference}`
                            const offset = cumulativeOffset
                            cumulativeOffset += dashLength
                            return (
                              <circle
                                key={index}
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke={item.color}
                                strokeWidth="8"
                                strokeDasharray={dashArray}
                                strokeDashoffset={`-${offset}`}
                              />
                            )
                          })
                        })()}
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                            {salesByCategory.reduce((sum, item) => sum + item.percentage, 0).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Legend - Responsive Grid */}
                  <div className="flex-1 w-full lg:w-auto grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-x-4 sm:gap-y-1.5">
                    {salesByCategory.map((item, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-2 text-xs ${index >= 4 ? 'sm:col-span-2 lg:col-span-1' : ''}`}
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="text-gray-700">
                          {item.category} - {item.percentage.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent Orders Section */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mt-3">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Recent Orders</h2>
              </div>
              <a
                href="/orders"
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
              >
                View All
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
              <a
                href="/orders"
                className="lg:hidden text-xs text-gray-900 hover:text-gray-700 font-medium"
              >
                View All →
              </a>
            </div>
            
            {recentOrders.length === 0 ? (
              <div className="px-4 py-10 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
                  <FolderIcon className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">No orders yet</p>
                <p className="text-xs text-gray-500">Orders will appear here when customers place them</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Column Headers - Desktop Only */}
                <div className="hidden lg:grid lg:grid-cols-12 lg:gap-3 lg:items-center pb-2 border-b border-gray-200">
                  <div className="col-span-4">
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Name</span>
                  </div>
                  <div className="col-span-5 text-center">
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Amount</span>
                  </div>
                  <div className="col-span-3">
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Status</span>
                  </div>
                </div>
                
                {recentOrders.map((order) => (
                  <a
                        key={order.id}
                    href="/orders"
                    className="group block bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all duration-200"
                  >
                    {/* Mobile Layout */}
                    <div className="lg:hidden">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate mb-1">{order.name}</div>
                          <div className="text-xs text-gray-500">{order.date}</div>
                        </div>
                        <span className={statusBadge(order.status)}>{order.status}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-500">Amount</span>
                        <span className="text-sm font-semibold text-gray-900">{order.price}</span>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden lg:grid lg:grid-cols-12 lg:gap-3 lg:items-center">
                      <div className="col-span-4">
                        <div className="text-sm font-semibold text-gray-900 mb-0.5">{order.name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {order.date}
                        </div>
                      </div>
                      <div className="col-span-5 text-center">
                        <div className="text-sm font-semibold text-gray-900">{order.price}</div>
                      </div>
                      <div className="col-span-3">
                          <span className={statusBadge(order.status)}>{order.status}</span>
                      </div>
                    </div>
                  </a>
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
