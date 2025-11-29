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
  PlusIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ClockIcon,
  BellIcon,
} from '@heroicons/react/24/outline'
import { db } from '../firebase'
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
} from 'firebase/firestore'

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

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

function extractProductDetails(value, productsMap = {}) {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'object' && item !== null) {
        // Get product name from productsMap using the product ID
        const productId = item.id || ''
        const productNameFromMap = productsMap[productId] || ''
        
        // Prioritize name - check product map first, then other fields
        const productName = productNameFromMap || item.name || item.productName || item.product || item.label || item.title || ''
        // Category is separate - don't use it as fallback for name
        const productCategory = item.category || ''
        return {
          id: productId,
          name: productName || productCategory || String(item),
          category: productCategory || productName || String(item),
          quantity: item.quantity ?? item.qty ?? 1,
          sizeType: item.sizeType || item.size,
          price: item.price ?? item.amount ?? 0,
        }
      }
      return {
        name: String(item),
        category: String(item),
        quantity: 1,
        sizeType: '',
        price: 0,
      }
    })
  }
  if (typeof value === 'object') {
    // Get product name from productsMap using the product ID
    const productId = value.id || ''
    const productNameFromMap = productsMap[productId] || ''
    
    // Prioritize name - check product map first, then other fields
    const productName = productNameFromMap || value.name || value.productName || value.product || value.label || value.title || ''
    // Category is separate - don't use it as fallback for name
    const productCategory = value.category || ''
    return [{
      id: productId,
      name: productName || productCategory || String(value),
      category: productCategory || productName || String(value),
      quantity: value.quantity ?? value.qty ?? 1,
      sizeType: value.sizeType || value.size,
      price: value.price ?? value.amount ?? 0,
    }]
  }
  const label = String(value)
  return [{
    name: label,
    category: label,
    quantity: 1,
    sizeType: '',
    price: 0,
  }]
}

function normalizeProductInput(value, productsMap = {}) {
  const detailsList = extractProductDetails(value, productsMap)
  if (detailsList.length > 0) {
    return detailsList[0].name || detailsList[0].category || ''
  }
  return ''
}

function formatAmount(value) {
  const num = Number(value)
  if (Number.isNaN(num)) return '—'
  return `RM ${num.toFixed(2)}`
}

export default function OrdersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [openMenus, setOpenMenus] = useState({ products: false })
  const [orders, setOrders] = useState([])
  const [productsMap, setProductsMap] = useState({}) // Map of product ID to product name
  const [allProducts, setAllProducts] = useState([]) // All products for dropdown
  const [editingOrder, setEditingOrder] = useState(null)
  const [expandedOrders, setExpandedOrders] = useState(new Set())
  const [orderItems, setOrderItems] = useState([
    { item: '', quantity: '1', type: 'roll', pricePerUnit: '' }
  ])
  const [formData, setFormData] = useState({
    date: '',
    name: '',
    product: '',
    price: '',
    phone: '',
    email: '',
    requestShipping: false,
    address: '',
    addressLine2: '',
    city: '',
    state: '',
    postcode: '',
    shippingCost: '0',
    status: 'Pending',
  })
  const [showForm, setShowForm] = useState(false)
  const [activeNav, setActiveNav] = useState('Orders')
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  const toggleOrderExpansion = (orderId) => {
    setExpandedOrders((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
  }

  // Fetch products from both collections to create a lookup map and dropdown list
  // Map by the product's 'id' field (e.g., "AG25"), not the document ID
  useEffect(() => {
    const unsubs = []
    const products = {}
    
    // Fetch from ArtificialGrass collection
    const unsub1 = onSnapshot(collection(db, 'ArtificialGrass'), (snap) => {
      const productsList = []
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data()
        // Use the 'id' field from the document (e.g., "AG25"), not the document ID
        const productId = data.id || docSnap.id
        const productName = data.name || ''
        if (productId) {
          products[productId] = productName
          productsList.push({ id: productId, name: productName, category: 'Artificial Grass' })
        }
      })
      setProductsMap((prev) => ({ ...prev, ...products }))
      setAllProducts((prev) => {
        const filtered = prev.filter(p => p.category !== 'Artificial Grass')
        return [...filtered, ...productsList]
      })
    })
    unsubs.push(unsub1)
    
    // Fetch from LiveGrass collection
    const unsub2 = onSnapshot(collection(db, 'LiveGrass'), (snap) => {
      const productsList = []
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data()
        // Use the 'id' field from the document (e.g., "AG25"), not the document ID
        const productId = data.id || docSnap.id
        const productName = data.name || ''
        if (productId) {
          products[productId] = productName
          productsList.push({ id: productId, name: productName, category: 'Live Grass' })
        }
      })
      setProductsMap((prev) => ({ ...prev, ...products }))
      setAllProducts((prev) => {
        const filtered = prev.filter(p => p.category !== 'Live Grass')
        return [...filtered, ...productsList]
      })
    })
    unsubs.push(unsub2)
    
    // Fetch from ProducePlants collection
    const unsub3 = onSnapshot(collection(db, 'ProducePlants'), (snap) => {
      const productsList = []
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data()
        const productId = data.id || docSnap.id
        const productName = data.name || ''
        if (productId) {
          products[productId] = productName
          productsList.push({ id: productId, name: productName, category: 'Product Plants' })
        }
      })
      setProductsMap((prev) => ({ ...prev, ...products }))
      setAllProducts((prev) => {
        const filtered = prev.filter(p => p.category !== 'Product Plants')
        return [...filtered, ...productsList]
      })
    })
    unsubs.push(unsub3)
    
    // Fetch from DecorativePlants collection
    const unsub4 = onSnapshot(collection(db, 'DecorativePlants'), (snap) => {
      const productsList = []
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data()
        const productId = data.id || docSnap.id
        const productName = data.name || ''
        if (productId) {
          products[productId] = productName
          productsList.push({ id: productId, name: productName, category: 'Decorative Plants' })
        }
      })
      setProductsMap((prev) => ({ ...prev, ...products }))
      setAllProducts((prev) => {
        const filtered = prev.filter(p => p.category !== 'Decorative Plants')
        return [...filtered, ...productsList]
      })
    })
    unsubs.push(unsub4)
    
    // Fetch from RocksBoulders collection
    const unsub5 = onSnapshot(collection(db, 'RocksBoulders'), (snap) => {
      const productsList = []
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data()
        const productId = data.id || docSnap.id
        const productName = data.name || ''
        if (productId) {
          products[productId] = productName
          productsList.push({ id: productId, name: productName, category: 'Boulders Rocks' })
        }
      })
      setProductsMap((prev) => ({ ...prev, ...products }))
      setAllProducts((prev) => {
        const filtered = prev.filter(p => p.category !== 'Boulders Rocks')
        return [...filtered, ...productsList]
      })
    })
    unsubs.push(unsub5)
    
    // Fetch from RocksPebbles collection
    const unsub6 = onSnapshot(collection(db, 'RocksPebbles'), (snap) => {
      const productsList = []
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data()
        const productId = data.id || docSnap.id
        const productName = data.name || ''
        if (productId) {
          products[productId] = productName
          productsList.push({ id: productId, name: productName, category: 'Pebbles Rocks' })
        }
      })
      setProductsMap((prev) => ({ ...prev, ...products }))
      setAllProducts((prev) => {
        const filtered = prev.filter(p => p.category !== 'Pebbles Rocks')
        return [...filtered, ...productsList]
      })
    })
    unsubs.push(unsub6)
    
    // Fetch from OthersFurniture collection
    const unsub7 = onSnapshot(collection(db, 'OthersFurniture'), (snap) => {
      const productsList = []
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data()
        const productId = data.id || docSnap.id
        const productName = data.name || ''
        if (productId) {
          products[productId] = productName
          productsList.push({ id: productId, name: productName, category: 'Furniture' })
        }
      })
      setProductsMap((prev) => ({ ...prev, ...products }))
      setAllProducts((prev) => {
        const filtered = prev.filter(p => p.category !== 'Furniture')
        return [...filtered, ...productsList]
      })
    })
    unsubs.push(unsub7)
    
    // Fetch from OthersOrnaments collection
    const unsub8 = onSnapshot(collection(db, 'OthersOrnaments'), (snap) => {
      const productsList = []
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data()
        const productId = data.id || docSnap.id
        const productName = data.name || ''
        if (productId) {
          products[productId] = productName
          productsList.push({ id: productId, name: productName, category: 'Ornaments' })
        }
      })
      setProductsMap((prev) => ({ ...prev, ...products }))
      setAllProducts((prev) => {
        const filtered = prev.filter(p => p.category !== 'Ornaments')
        return [...filtered, ...productsList]
      })
    })
    unsubs.push(unsub8)
    
    return () => {
      unsubs.forEach((unsub) => unsub && unsub())
    }
  }, [])

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

  const handleAdd = () => {
    setEditingOrder(null)
    setOrderItems([{ item: '', quantity: '1', type: 'roll', pricePerUnit: '' }])
    setFormData({
      date: '',
      name: '',
      product: '',
      price: '',
      phone: '',
      email: '',
      requestShipping: false,
      address: '',
      addressLine2: '',
      city: '',
      state: '',
      postcode: '',
      shippingCost: '0',
      status: 'Pending',
    })
    setShowForm(true)
  }

  const addOrderItem = () => {
    setOrderItems([...orderItems, { item: '', quantity: '1', type: 'roll', pricePerUnit: '' }])
  }

  const removeOrderItem = (index) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter((_, i) => i !== index))
    }
  }

  const updateOrderItem = (index, field, value) => {
    const updated = [...orderItems]
    updated[index] = { ...updated[index], [field]: value }
    setOrderItems(updated)
  }

  const formatDateInput = (ts) => {
    if (!ts) return ''
    try {
      const date = ts instanceof Timestamp ? ts.toDate() : new Date(ts)
      return date.toISOString().split('T')[0]
    } catch (err) {
      return ''
    }
  }

  const handleEdit = (order) => {
    setEditingOrder(order.id)
    
    // Extract order items if products array exists
    const productsArray = Array.isArray(order.products) ? order.products : []
    if (productsArray.length > 0) {
      const items = productsArray.map((p) => ({
        item: p.id || '',
        quantity: String(p.quantity || 1),
        type: p.sizeType || p.size || 'roll',
        pricePerUnit: p.price && p.quantity ? String(p.price / p.quantity) : String(p.price || 0),
      }))
      setOrderItems(items.length > 0 ? items : [{ item: '', quantity: '1', type: 'roll', pricePerUnit: '' }])
    } else {
      setOrderItems([{ item: '', quantity: '1', type: 'roll', pricePerUnit: '' }])
    }
    
    const shippingDetails = order.shippingDetails || {}
    const requestShipping = shippingDetails.requestShipping === true || 
                           shippingDetails.requestShipping === 'true' || 
                           order.requestShipping === true || 
                           order.requestShipping === 'true' || 
                           false
    
    setFormData({
      date: formatDateInput(order.timestamp) || '',
      name: order.name || '',
      product: normalizeProductInput(order.products || order.product, productsMap),
      price: order.price ?? '',
      phone: order.phone || order.phoneEmail || '',
      email: order.email || '',
      requestShipping: requestShipping,
      address: shippingDetails.address || order.address || '',
      addressLine2: shippingDetails.addressLine2 || order.addressLine2 || '',
      city: shippingDetails.city || order.city || '',
      state: shippingDetails.state || order.state || '',
      postcode: shippingDetails.postcode || order.postcode || '',
      shippingCost: String(shippingDetails.shippingCost || order.shippingCost || 0),
      status: order.status || 'Pending',
    })
    setShowForm(true)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  // Calculate total price
  const calculateTotal = () => {
    const subtotal = orderItems.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0
      const pricePerUnit = Number(item.pricePerUnit) || 0
      return sum + (quantity * pricePerUnit)
    }, 0)
    const shippingCost = formData.requestShipping ? (Number(formData.shippingCost) || 0) : 0
    return subtotal + shippingCost
  }

  const calculateSubtotal = () => {
    return orderItems.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0
      const pricePerUnit = Number(item.pricePerUnit) || 0
      return sum + (quantity * pricePerUnit)
    }, 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate that all items are filled
    const invalidItems = orderItems.filter(item => !item.item || !item.quantity || !item.pricePerUnit)
    if (invalidItems.length > 0) {
      alert('Please fill in all item details (item, quantity, and price per unit)')
      return
    }

    const shippingCost = formData.requestShipping ? (Number(formData.shippingCost) || 0) : 0
    const subtotal = calculateSubtotal()
    const total = subtotal + shippingCost

    // Build products array
    const productsData = orderItems.map(item => {
      const quantity = Number(item.quantity) || 0
      const pricePerUnit = Number(item.pricePerUnit) || 0
      return {
        id: item.item,
        name: productsMap[item.item] || '',
        category: allProducts.find(p => p.id === item.item)?.category || '',
        quantity: quantity,
        sizeType: item.type,
        price: quantity * pricePerUnit,
      }
    })

    // Build shipping details if shipping is requested
    const shippingDetails = formData.requestShipping ? {
      requestShipping: true,
      address: formData.address,
      addressLine2: formData.addressLine2 || '',
      city: formData.city || '',
      state: formData.state || '',
      postcode: formData.postcode || '',
      shippingCost: shippingCost,
    } : {
      requestShipping: false,
    }

    const payload = {
      timestamp: formData.date ? Timestamp.fromDate(new Date(formData.date)) : Timestamp.now(),
      name: formData.name,
      products: productsData,
      price: total,
      phone: formData.phone,
      email: formData.email,
      phoneEmail: formData.phone || formData.email ? `${formData.phone} ${formData.email}`.trim() : undefined,
      status: formData.status || 'Pending',
      shippingDetails: shippingDetails,
    }

    try {
    if (editingOrder) {
      await updateDoc(doc(db, 'Orders', editingOrder), payload)
    } else {
      await addDoc(collection(db, 'Orders'), payload)
    }
      setOrderItems([{ item: '', quantity: '1', type: 'roll', pricePerUnit: '' }])
    setFormData({
      date: '',
      name: '',
      phone: '',
      email: '',
        requestShipping: false,
      address: '',
        addressLine2: '',
        city: '',
        state: '',
        postcode: '',
        shippingCost: '0',
      status: 'Pending',
    })
    setEditingOrder(null)
    setShowForm(false)
    } catch (error) {
      console.error('Error saving order:', error)
      alert('Failed to save order. Please try again.')
    }
  }

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, 'Orders', orderId), { status: newStatus })
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const handleCloseModal = () => {
    setShowForm(false)
    setEditingOrder(null)
    setOrderItems([{ item: '', quantity: '1', type: 'roll', pricePerUnit: '' }])
    setFormData({
      date: '',
      name: '',
      product: '',
      price: '',
      phone: '',
      email: '',
      requestShipping: false,
      address: '',
      addressLine2: '',
      city: '',
      state: '',
      postcode: '',
      shippingCost: '0',
      status: 'Pending',
    })
  }

  // Filter orders based on search query - comprehensive search
  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase().trim()
    
    // Search in order ID
    if (order.id?.toLowerCase().includes(query)) return true
    
    // Search in customer name
    if (order.name?.toLowerCase().includes(query)) return true
    
    // Search in phone number
    if (order.phone?.toLowerCase().includes(query)) return true
    
    // Search in email
    if (order.email?.toLowerCase().includes(query)) return true
    
    // Search in address fields
    const address = order.address || ''
    const addressLine2 = order.addressLine2 || ''
    const city = order.city || ''
    const state = order.state || ''
    const postcode = order.postcode || ''
    const fullAddress = `${address} ${addressLine2} ${city} ${state} ${postcode}`.toLowerCase()
    if (fullAddress.includes(query)) return true
    
    // Search in shipping details if they exist
    if (order.shippingDetails) {
      const shippingAddress = `${order.shippingDetails.address || ''} ${order.shippingDetails.addressLine2 || ''} ${order.shippingDetails.city || ''} ${order.shippingDetails.state || ''} ${order.shippingDetails.postcode || ''}`.toLowerCase()
      if (shippingAddress.includes(query)) return true
    }
    
    // Search in product names
    const productNames = normalizeProductInput(order.products || order.product, productsMap).toLowerCase()
    if (productNames.includes(query)) return true
    
    // Search in status
    if (order.status?.toLowerCase().includes(query)) return true
    
    // Search in order price/amount
    const price = String(order.price || '').toLowerCase()
    if (price.includes(query)) return true
    
    // Search in order date (if formatted)
    if (order.date?.toLowerCase().includes(query)) return true
    
    // Search in timestamp (convert to readable date)
    if (order.timestamp) {
      try {
        const date = order.timestamp.toDate ? order.timestamp.toDate() : 
                    order.timestamp.seconds ? new Date(order.timestamp.seconds * 1000) : null
        if (date) {
          const dateStr = date.toLocaleDateString().toLowerCase()
          const timeStr = date.toLocaleTimeString().toLowerCase()
          if (dateStr.includes(query) || timeStr.includes(query)) return true
        }
      } catch (e) {
        // Ignore date parsing errors
      }
    }
    
    return false
  })

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
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-700 transition">
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
                        <item.icon aria-hidden="true" className="h-5 w-5 shrink-0" />
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
                <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              
              {/* Right: Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleAdd}
                  className="hidden lg:flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Order
                </button>
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
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border border-gray-200">
              {/* Mobile: Add Button */}
              <div className="lg:hidden mb-4">
                <button
                  onClick={handleAdd}
                  className="w-full inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition font-semibold text-sm"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>Add New Order</span>
                </button>
              </div>

            {/* Orders Table */}
            {filteredOrders.length === 0 ? (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 sm:p-12 text-center">
                <FolderIcon className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">
                  {searchQuery ? 'No orders found' : 'No orders yet'}
                </h3>
                <p className="text-sm sm:text-base text-gray-500 mb-6">
                  {searchQuery
                    ? 'Try adjusting your search terms'
                    : 'Get started by adding your first order'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={handleAdd}
                    className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition font-semibold text-sm sm:text-base"
                  >
                    <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    Add Your First Order
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Mobile: Simplified compact cards */}
                <div className="lg:hidden space-y-3">
                  {filteredOrders.map((order) => {
                    const productDetailsList = extractProductDetails(order.products || order.product, productsMap)
                    const isExpanded = expandedOrders.has(order.id)
                    const hasMultipleItems = productDetailsList.length > 1
                    const totalPrice = productDetailsList.length > 0
                      ? productDetailsList.reduce((sum, item) => sum + Number(item.price || 0), 0)
                      : (order.price || 0)
                    const shippingDetails = order.shippingDetails || {}
                    const shippingCost = shippingDetails.shippingCost || order.shippingCost || order.shippingPrice || 0
                    const totalWithShipping = totalPrice + Number(shippingCost)
                    const orderStatus = order.status || 'Pending'
                    const requestShippingValue = order.shippingDetails?.requestShipping ?? order.requestShipping
                    const isRequestShipping = requestShippingValue === true || 
                                             requestShippingValue === 'true' || 
                                             requestShippingValue === 'shipping' ||
                                             requestShippingValue === 1
                    const shippingMethod = isRequestShipping ? 'Shipping' : 'Pickup'
                    const orderDate = order.timestamp?.toDate
                      ? order.timestamp.toDate().toLocaleDateString()
                      : order.date || '—'

                    return (
                      <div key={order.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">{order.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{orderDate}</div>
                          </div>
                          <select
                            value={orderStatus}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            className={`px-2 py-1 rounded-full text-xs font-semibold border-2 ${
                              orderStatus === 'Pending'
                                ? 'bg-yellow-50 border-yellow-300 text-yellow-700'
                                : 'bg-green-50 border-green-300 text-green-700'
                            }`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Shipped">Shipped</option>
                          </select>
                        </div>
                        <div className="text-xs text-gray-600 mb-2">
                          {hasMultipleItems 
                            ? `${productDetailsList.length} items` 
                            : (
                              <div>
                                <div className="truncate">{productDetailsList[0]?.name || productDetailsList[0]?.label || '—'}</div>
                                {productDetailsList[0] && (
                                  <div className="text-gray-500 mt-0.5">
                                    Qty: {productDetailsList[0]?.quantity || '—'}
                                    {productDetailsList[0]?.sizeType && ` • ${productDetailsList[0].sizeType}`}
                                  </div>
                                )}
                              </div>
                            )}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">{shippingMethod}</span>
                          <span className="font-semibold text-gray-900">{formatAmount(isRequestShipping ? totalWithShipping : totalPrice)}</span>
                        </div>
                        {hasMultipleItems && (
                          <button
                            onClick={() => toggleOrderExpansion(order.id)}
                            className="mt-2 text-xs text-blue-600 underline w-full text-left"
                          >
                            {isExpanded ? 'Hide' : 'Show'} {productDetailsList.length} items
                          </button>
                        )}
                        {hasMultipleItems && isExpanded && (
                          <div className="mt-2 pt-2 border-t border-gray-200 space-y-2">
                            {productDetailsList.map((item, itemIdx) => (
                              <div key={itemIdx} className="text-xs bg-white rounded p-2">
                                <div className="font-medium text-gray-900">{item.name || item.label || '—'}</div>
                                <div className="text-gray-600 mt-0.5">
                                  Qty: {item.quantity || '—'}
                                  {item.sizeType && ` • ${item.sizeType}`}
                                  {' • '}
                                  {formatAmount(item.price || 0)}
                                </div>
                              </div>
                            ))}
                            <div className="pt-2 border-t border-gray-200 text-xs">
                              <div className="flex justify-between text-gray-600 mb-1">
                                <span>Subtotal:</span>
                                <span>{formatAmount(totalPrice)}</span>
                              </div>
                              {isRequestShipping && shippingCost > 0 && (
                                <div className="flex justify-between text-gray-600 mb-1">
                                  <span>Shipping:</span>
                                  <span>{formatAmount(shippingCost)}</span>
                                </div>
                              )}
                              <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200">
                                <span>Total:</span>
                                <span>{formatAmount(totalWithShipping)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                
                {/* Desktop: Detailed cards */}
                <div className="hidden lg:block space-y-3">
                    {filteredOrders.map((order, idx) => {
                    const productDetailsList = extractProductDetails(order.products || order.product, productsMap)
                    const isExpanded = expandedOrders.has(order.id)
                    const hasMultipleItems = productDetailsList.length > 1
                    const totalPrice = productDetailsList.length > 0
                      ? productDetailsList.reduce((sum, item) => sum + Number(item.price || 0), 0)
                      : (order.price || 0)
                    const totalQuantity = productDetailsList.length > 0
                      ? productDetailsList.reduce((sum, item) => sum + Number(item.quantity || 1), 0)
                      : 0

                      const orderStatus = order.status || 'Pending'
                      const isPending = orderStatus === 'Pending'
                      const isShipped = orderStatus === 'Shipped'
                      
                      // Check requestShipping - it's nested in shippingDetails!
                      // Check both top-level and nested locations
                      const requestShippingValue = order.shippingDetails?.requestShipping ?? order.requestShipping
                      const shippingDetails = order.shippingDetails || {}
                      
                      // Get shipping cost - check shippingDetails first, then top-level (needed early for totalWithShipping)
                      const shippingCost = shippingDetails.shippingCost || order.shippingCost || order.shippingPrice || 0
                      const totalWithShipping = totalPrice + Number(shippingCost)
                      
                      // Get address from shippingDetails first, then top-level
                      const addressValue = shippingDetails.address || order.address
                      const addressLine2Value = shippingDetails.addressLine2 || order.addressLine2
                      const cityValue = shippingDetails.city || order.city
                      const stateValue = shippingDetails.state || order.state
                      const postcodeValue = shippingDetails.postcode || order.postcode
                      
                      const hasAddress = addressValue && typeof addressValue === 'string' && addressValue.trim() !== '' && addressValue !== '—'
                      
                      // More robust check for requestShipping - check boolean true first
                      const isRequestShipping = requestShippingValue === true || 
                                                requestShippingValue === 'true' || 
                                                requestShippingValue === 'shipping' ||
                                                requestShippingValue === 1 ||
                                                String(requestShippingValue) === 'true' ||
                                                (typeof requestShippingValue === 'string' && requestShippingValue.toLowerCase() === 'true') ||
                                                (typeof requestShippingValue === 'string' && requestShippingValue.toLowerCase() === 'shipping') ||
                                                hasAddress
                      
                      const shippingMethod = isRequestShipping ? 'Shipping' : 'Pickup'
                      
                      // Combine address fields if they exist
                      const addressParts = []
                      if (addressValue && addressValue !== '—' && typeof addressValue === 'string') addressParts.push(addressValue)
                      if (addressLine2Value && typeof addressLine2Value === 'string') addressParts.push(addressLine2Value)
                      if (cityValue && typeof cityValue === 'string') addressParts.push(cityValue)
                      if (stateValue && typeof stateValue === 'string') addressParts.push(stateValue)
                      if (postcodeValue && typeof postcodeValue === 'string') addressParts.push(postcodeValue)
                      const address = isRequestShipping ? (addressParts.length > 0 ? addressParts.join(', ') : addressValue || '—') : '—'
                      
                      const orderDate = order.timestamp?.toDate
                        ? order.timestamp.toDate().toLocaleDateString()
                        : order.date || '—'
                      const phone = order.phone || order.phoneNumber || '—'

                      return (
                    <div key={order.id}>
                      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 shadow-sm">
                        {/* Header Section */}
                        <div className="flex items-start justify-between mb-4 pb-3 border-b border-gray-200">
                          <div>
                            <div className="text-base sm:text-lg font-bold text-gray-900 mb-1">{order.name}</div>
                            <div className="text-xs sm:text-sm text-gray-500">{orderDate}</div>
                          </div>
                          <select
                            value={orderStatus}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold border-2 transition cursor-pointer ${
                              isPending
                                ? 'bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100'
                                : 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                            }`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Shipped">Shipped</option>
                          </select>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                              <div>
                            <div className="text-xs text-gray-500 mb-1">ID</div>
                            <div className="text-xs sm:text-sm text-gray-900 font-mono break-all">{order.id}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Phone</div>
                            <div className="text-xs sm:text-sm text-gray-900">{phone}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Delivery</div>
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                              isRequestShipping 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {shippingMethod}
                                  </span>
                          </div>
                          {isRequestShipping && address !== '—' && (
                            <div className="sm:col-span-2">
                              <div className="text-xs text-gray-500 mb-1">Address</div>
                              <div className="text-xs sm:text-sm text-gray-900 break-words whitespace-normal">{address}</div>
                            </div>
                          )}
                          {isRequestShipping && (
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Shipping Price</div>
                              <div className="text-xs sm:text-sm text-gray-900 font-semibold">{formatAmount(shippingCost)}</div>
                              </div>
                          )}
                        </div>

                        {/* Items Section */}
                        <div className="mb-4 pb-4 border-b border-gray-200">
                              {hasMultipleItems ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="text-xs text-gray-500">Items</div>
                                <button
                                  onClick={() => toggleOrderExpansion(order.id)}
                                  className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-semibold underline"
                                >
                                  {isExpanded ? 'Hide' : 'Show'} {productDetailsList.length} items
                                </button>
                              </div>
                              <div className="text-xs sm:text-sm text-gray-900">
                                <span className="text-gray-500">Total Quantity: </span>
                                <span className="font-semibold">{totalQuantity}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="text-xs text-gray-500">Product</div>
                              <div className="text-xs sm:text-sm text-gray-900 font-medium">
                                {productDetailsList[0]?.name || productDetailsList[0]?.label || '—'}
                              </div>
                              {(productDetailsList[0]?.quantity || productDetailsList[0]?.sizeType) && (
                                <div className="flex gap-3 text-xs text-gray-600 mt-1">
                                  {productDetailsList[0]?.quantity && (
                                    <span>Qty: <span className="font-medium">{productDetailsList[0].quantity}</span></span>
                                  )}
                                  {productDetailsList[0]?.sizeType && (
                                    <span>Type: <span className="font-medium">{productDetailsList[0].sizeType}</span></span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Pricing Section */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs sm:text-sm">
                            <span className="text-gray-500">Subtotal</span>
                            <span className="text-gray-900 font-semibold">
                                {formatAmount(hasMultipleItems ? totalPrice : (productDetailsList[0]?.price ?? order.price ?? 0))}
                              </span>
                          </div>
                          {isRequestShipping && shippingCost > 0 && (
                            <div className="flex justify-between items-center text-xs sm:text-sm">
                              <span className="text-gray-500">Shipping</span>
                              <span className="text-gray-900 font-semibold">{formatAmount(shippingCost)}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                            <span className="text-sm sm:text-base font-semibold text-gray-900">Total</span>
                            <span className="text-base sm:text-lg font-bold text-gray-900">
                              {formatAmount(isRequestShipping ? totalWithShipping : totalPrice)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Expanded items for multiple products - Improved design */}
                      {hasMultipleItems && isExpanded && (
                        <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-5">
                          <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-300">
                            Order Items ({productDetailsList.length})
                          </div>
                          <div className="space-y-2.5">
                            {productDetailsList.map((item, itemIdx) => (
                              <div
                              key={`${order.id}-item-${itemIdx}`}
                                className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                                      {itemIdx + 1}. {item.name || item.label || '—'}
                                    </div>
                                    <div className="flex gap-4 text-xs text-gray-600">
                                      {item.quantity && (
                                        <span>Qty: <span className="font-medium text-gray-900">{item.quantity}</span></span>
                                      )}
                                      {item.sizeType && (
                                        <span className="font-medium text-gray-900">{item.sizeType}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-sm sm:text-base font-bold text-blue-700">
                                  {formatAmount(item.price || 0)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 pt-3 border-t border-gray-300">
                            <div className="flex justify-between items-center text-xs sm:text-sm mb-1.5">
                              <span className="text-gray-600">Subtotal</span>
                              <span className="text-gray-900 font-semibold">{formatAmount(totalPrice)}</span>
                            </div>
                            {isRequestShipping && shippingCost > 0 && (
                              <div className="flex justify-between items-center text-xs sm:text-sm mb-1.5">
                                <span className="text-gray-600">Shipping</span>
                                <span className="text-gray-900 font-semibold">{formatAmount(shippingCost)}</span>
                              </div>
                            )}
                            <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                              <span className="text-sm sm:text-base font-bold text-gray-900">Total</span>
                              <span className="text-base sm:text-lg font-bold text-blue-700">
                                {formatAmount(isRequestShipping ? totalWithShipping : totalPrice)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              </>
            )}
          </div>
        </div>
        </main>
      </div>

      {/* Add/Edit Order Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {editingOrder ? 'Edit Order' : 'Add New Order'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {editingOrder ? 'Update order information' : 'Fill in the details below'}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-700 transition p-1 rounded-lg hover:bg-gray-200"
              >
                <XMarkIcon className="h-6 w-6 shrink-0" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Order Information Section */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                    Order Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Status <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Shipped">Shipped</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Customer Information Section */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                    Customer Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Product Information Section */}
                <div>
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900">
                      Product Information
                    </h4>
                    <button
                      type="button"
                      onClick={addOrderItem}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Add Item
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {orderItems.map((orderItem, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200 relative">
                        {orderItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeOrderItem(index)}
                            className="absolute top-2 right-2 text-red-500 hover:text-red-700 transition"
                            title="Remove item"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                              Item <span className="text-red-500">*</span>
                      </label>
                            <select
                              value={orderItem.item}
                              onChange={(e) => updateOrderItem(index, 'item', e.target.value)}
                        required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            >
                              <option value="">Select an item</option>
                              {allProducts.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name} ({product.category})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                              Quantity <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              value={orderItem.quantity}
                              onChange={(e) => updateOrderItem(index, 'quantity', e.target.value)}
                              required
                              min="1"
                              step="1"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      />
                    </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                              Type <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={orderItem.type}
                              onChange={(e) => updateOrderItem(index, 'type', e.target.value)}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            >
                              <option value="roll">Roll</option>
                              <option value="tile">Tile</option>
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                              Price per {orderItem.type} (RM) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              value={orderItem.pricePerUnit}
                              onChange={(e) => updateOrderItem(index, 'pricePerUnit', e.target.value)}
                              required
                              min="0"
                              step="0.01"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <div className="text-right">
                              <span className="text-xs text-gray-500">Item Total: </span>
                              <span className="text-sm font-semibold text-gray-900">
                                {formatAmount((Number(orderItem.quantity) || 0) * (Number(orderItem.pricePerUnit) || 0))}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shipping/Pickup Section */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                    Shipping/Pickup
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="requestShipping"
                        id="requestShipping"
                        checked={formData.requestShipping}
                        onChange={handleChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="requestShipping" className="ml-2 block text-sm text-gray-700">
                        Request Shipping (check if shipping, leave unchecked for pickup)
                      </label>
                    </div>
                    
                    {formData.requestShipping && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Address <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            required={formData.requestShipping}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Address Line 2
                          </label>
                          <input
                            type="text"
                            name="addressLine2"
                            value={formData.addressLine2}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                          />
                        </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                            name="city"
                            value={formData.city}
                        onChange={handleChange}
                            required={formData.requestShipping}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            State <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="state"
                            value={formData.state}
                            onChange={handleChange}
                            required={formData.requestShipping}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Postcode <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="postcode"
                            value={formData.postcode}
                            onChange={handleChange}
                            required={formData.requestShipping}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Shipping Cost (RM) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                            name="shippingCost"
                            value={formData.shippingCost}
                        onChange={handleChange}
                            required={formData.requestShipping}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      />
                    </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Total Calculation */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-700">Subtotal ({orderItems.length} {orderItems.length === 1 ? 'item' : 'items'}):</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatAmount(calculateSubtotal())}
                    </span>
                  </div>
                  {formData.requestShipping && (
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm font-semibold text-gray-700">Shipping Cost:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatAmount(Number(formData.shippingCost) || 0)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-blue-300">
                    <span className="text-base font-bold text-gray-900">Total:</span>
                    <span className="text-lg font-bold text-blue-600">
                      {formatAmount(calculateTotal())}
                    </span>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleCloseModal}
                    type="button"
                    className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg shadow-md hover:shadow-lg transition font-medium"
                  >
                    {editingOrder ? 'Update Order' : 'Add Order'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

