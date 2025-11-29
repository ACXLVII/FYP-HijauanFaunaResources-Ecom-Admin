'use client'

import React, { useState, useEffect } from 'react'
import {
  HomeIcon,
  UsersIcon,
  ShoppingBagIcon,
  FolderIcon,
  XMarkIcon,
  Bars3Icon,
  PencilIcon,
  TrashIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline'
import { StarIcon } from '@heroicons/react/20/solid'

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  addDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useRouter } from 'next/navigation'

import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import Papa from 'papaparse'

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
  { name: 'Inquiries', href: '/inquiries', icon: ChatBubbleLeftRightIcon },
  { name: 'Review', href: '/Review', icon: StarIcon },
  { name: 'Logout', href: '/logout', icon: XMarkIcon },
]

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

function statusBadge(status) {
  const base = 'px-2 py-1 rounded-full text-xs font-semibold'
  switch (status) {
    case 'Completed':
      return base + ' bg-green-100 text-green-800'
    case 'In Process':
      return base + ' bg-yellow-100 text-yellow-800'
    case 'Cancelled':
      return base + ' bg-red-100 text-red-800'
    default:
      return base + ' bg-gray-100 text-gray-700'
  }
}

export default function OrdersPage() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [openMenus, setOpenMenus] = useState({ products: false })
  const [activeNav, setActiveNav] = useState('Orders')
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const [orders, setOrders] = useState([])
  const [productMap, setProductMap] = useState({}) // Map of product id -> product name
  const [editingOrder, setEditingOrder] = useState(null)
  const [formData, setFormData] = useState({
    date: '',
    name: '',
    customerEmail: '',
    phone: '',
    product: '',
    quantity: '1',
    price: '',
    shippingMethod: 'pickup', // 'pickup' or 'shipping'
    address: '',
    shippingCost: '',
    status: 'In Process',
  })
  const [showForm, setShowForm] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Helper function to format address from shippingDetails
  const formatAddress = (order) => {
    const shippingDetails = order.shippingDetails || {}
    const addressParts = []
    
    if (shippingDetails.address) addressParts.push(shippingDetails.address)
    if (shippingDetails.addressLine2) addressParts.push(shippingDetails.addressLine2)
    if (shippingDetails.city) addressParts.push(shippingDetails.city)
    if (shippingDetails.state) addressParts.push(shippingDetails.state)
    if (shippingDetails.postcode) addressParts.push(shippingDetails.postcode)
    
    // Fallback to top-level address if shippingDetails is empty
    if (addressParts.length === 0 && order.address) {
      return order.address
    }
    
    return addressParts.length > 0 ? addressParts.join(', ') : '—'
  }

  // Helper function to get product name from order
  // Matches order's product ID with products in ArtificialGrass and LiveGrass collections
  const getProductName = (order) => {
    // Priority 1: Check order.productId (from d.id field in Orders collection)
    // This is the product ID field in the order document (like "AG15")
    if (order.productId && productMap[order.productId]) {
      return productMap[order.productId]
    }
    
    // Priority 2: Check if products array exists and has items with id field
    if (Array.isArray(order.products) && order.products.length > 0) {
      const firstProduct = order.products[0]
      // If product is an object with id field
      if (firstProduct && typeof firstProduct === 'object' && firstProduct.id && productMap[firstProduct.id]) {
        return productMap[firstProduct.id]
      }
      // If product is a string ID
      if (typeof firstProduct === 'string' && productMap[firstProduct]) {
        return productMap[firstProduct]
      }
    }
    
    // Priority 3: Check if product field contains an ID that matches
    if (order.product && typeof order.product === 'string' && productMap[order.product]) {
      return productMap[order.product]
    }
    
    // Priority 4: Check if order document has id field directly (shouldn't happen but just in case)
    // Note: order.id is the Firestore document ID, not the product ID, so this is unlikely to match
    // But we check it anyway as a fallback
    
    // Fallback: Return original product field or display as-is
    if (order.product) {
      return order.product
    }
    if (Array.isArray(order.products) && order.products.length > 0) {
      const firstProduct = order.products[0]
      if (typeof firstProduct === 'object' && firstProduct.name) {
        return firstProduct.name
      }
      return String(firstProduct)
    }
    return '—'
  }

  // Fetch products from ArtificialGrass and LiveGrass collections
  useEffect(() => {
    const unsubs = []
    
    // Fetch from ArtificialGrass
    const unsubAG = onSnapshot(collection(db, 'ArtificialGrass'), (snapshot) => {
      const productIdMap = {}
      snapshot.docs.forEach((doc) => {
        const data = doc.data()
        // Use the id field from the document data (like "AG15"), or fallback to document ID
        const productId = data.id || doc.id
        // Always use the name field, not category
        const productName = data.name || ''
        if (productId && productName) {
          productIdMap[productId] = productName
        }
      })
      setProductMap((prev) => ({ ...prev, ...productIdMap }))
    })
    unsubs.push(unsubAG)
    
    // Fetch from LiveGrass
    const unsubLG = onSnapshot(collection(db, 'LiveGrass'), (snapshot) => {
      const productIdMap = {}
      snapshot.docs.forEach((doc) => {
        const data = doc.data()
        // Use the id field from the document data (like "LG10"), or fallback to document ID
        const productId = data.id || doc.id
        // Always use the name field, not category
        const productName = data.name || ''
        if (productId && productName) {
          productIdMap[productId] = productName
        }
      })
      setProductMap((prev) => ({ ...prev, ...productIdMap }))
    })
    unsubs.push(unsubLG)
    
    return () => {
      unsubs.forEach((unsub) => unsub && unsub())
    }
  }, [])

  useEffect(() => {
    // Use 'Orders' collection (uppercase) as shown in Firebase console
    const coll = collection(db, 'Orders')
    const q = query(coll, orderBy('date', 'desc'))
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const d = doc.data()
        // Try date first, then timestamp
        const dateObj = d.date?.toDate instanceof Function ? d.date.toDate() : 
                       d.timestamp?.toDate instanceof Function ? d.timestamp.toDate() : null
        
        // Format address from shippingDetails
        const fullAddress = formatAddress(d)
        
        // Get shippingDetails - everything is under shippingDetails according to Firebase structure
        const shippingDetails = d.shippingDetails || {}
        // requestShipping is inside shippingDetails, not at top level
        const requestShipping = shippingDetails.requestShipping === true || 
                               shippingDetails.requestShipping === 'true' || 
                               d.requestShipping === true || 
                               d.requestShipping === 'true' || 
                               false
        
        return {
          id: doc.id, // Firestore document ID
          date: dateObj ? dateObj.toLocaleDateString() : d.date || '',
          name: d.name || '',
          customerEmail: d.customerEmail || d.email || '',
          phone: d.phone || '',
          product: d.product || d.products || '',
          productId: d.id || null, // Product ID from Orders collection (like "AG15") - matches id in ArtificialGrass/LiveGrass
          products: d.products || null, // Products array if exists
          quantity: d.quantity ? String(d.quantity) : '1',
          price: d.price || '',
          status: d.status || 'In Process',
          requestShipping: requestShipping,
          shippingDetails: shippingDetails,
          address: fullAddress,
          shippingCost: shippingDetails.shippingCost || d.shippingCost || 0,
        }
      })
      setOrders(data)
    }, (error) => {
      console.error('Error fetching orders:', error)
    })
    
    return () => unsubscribe()
  }, [])

  const filteredOrders = orders.filter(({ name, product, status }) =>
    [name, product, status].some((field) =>
      field?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  const handleAdd = () => {
    setEditingOrder(null)
    setFormData({
      date: '',
      name: '',
      customerEmail: '',
      phone: '',
      product: '',
      quantity: '1',
      price: '',
      shippingMethod: 'pickup',
      address: '',
      shippingCost: '',
      status: 'In Process',
    })
    setShowForm(true)
  }

  const handleEdit = (id) => {
    const order = orders.find((o) => o.id === id)
    if (order) {
      let dateValue = order.date
      try {
        const parsedDate = new Date(order.date)
        if (!isNaN(parsedDate)) {
          dateValue = parsedDate.toISOString().slice(0, 10)
        }
      } catch {}
      // Get shipping details - requestShipping is inside shippingDetails
      const shippingDetails = order.shippingDetails || {}
      const requestShipping = shippingDetails.requestShipping === true || 
                             shippingDetails.requestShipping === 'true' || 
                             order.requestShipping === true || 
                             order.requestShipping === 'true' || 
                             false

      setFormData({
        date: dateValue,
        name: order.name || '',
        customerEmail: order.customerEmail || '',
        phone: order.phone || '',
        product: order.product || '',
        quantity: order.quantity || '1',
        price: order.price || '',
        shippingMethod: requestShipping ? 'shipping' : 'pickup',
        address: shippingDetails.address || order.address || '',
        shippingCost: shippingDetails.shippingCost || order.shippingCost || '',
        status: order.status || 'In Process',
      })
      setEditingOrder(id)
      setShowForm(true)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      let dateForFirestore = formData.date
      if (formData.date) {
        const dateObj = new Date(formData.date)
        if (!isNaN(dateObj)) dateForFirestore = Timestamp.fromDate(dateObj)
      }
      
      const isShipping = formData.shippingMethod === 'shipping'
      const orderData = {
        date: dateForFirestore,
        name: formData.name,
        customerEmail: formData.customerEmail,
        phone: formData.phone || '',
        product: formData.product,
        quantity: Number(formData.quantity) || 1,
        price: formData.price,
        status: formData.status,
      }
      // Add shippingDetails object - everything goes inside shippingDetails
      if (isShipping) {
        orderData.shippingDetails = {
          requestShipping: true,
          address: formData.address || '',
          shippingCost: formData.shippingCost ? Number(formData.shippingCost) : 0,
        }
        // Also add top-level address for backwards compatibility
        if (formData.address) {
          orderData.address = formData.address
        }
        if (formData.shippingCost) {
          orderData.shippingCost = Number(formData.shippingCost)
        }
      } else {
        // For pickup, set requestShipping to false in shippingDetails
        orderData.shippingDetails = {
          requestShipping: false,
        }
      }
      
      if (editingOrder) {
        const orderRef = doc(db, 'Orders', editingOrder)
        await updateDoc(orderRef, orderData)
      } else {
        const ordersCollection = collection(db, 'Orders')
        await addDoc(ordersCollection, orderData)
      }

      setShowForm(false)
      setEditingOrder(null)
      setFormData({
        date: '',
        name: '',
        customerEmail: '',
        phone: '',
        product: '',
        quantity: '1',
        price: '',
        shippingMethod: 'pickup',
        address: '',
        shippingCost: '',
        status: 'In Process',
      })
    } catch (error) {
      console.error('Failed to save order:', error)
    }
  }

  const handleCloseModal = () => {
    setShowForm(false)
    setEditingOrder(null)
    setFormData({
      date: '',
      name: '',
      customerEmail: '',
      phone: '',
      product: '',
      quantity: '1',
      price: '',
      shippingMethod: 'pickup',
      address: '',
      shippingCost: '',
      status: 'In Process',
    })
  }

  const handleDeleteClick = (id) => {
    setDeleteId(id)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (deleteId) {
      try {
        await deleteDoc(doc(db, 'Orders', deleteId))
        setShowDeleteModal(false)
        setDeleteId(null)
      } catch (error) {
        console.error('Failed to delete order:', error)
        alert('Failed to delete order. Please try again.')
      }
    }
  }

  const confirmLogout = () => {
    setShowLogoutConfirm(false)
    router.push('/login')
  }

  const handleNavigationClick = (item) => {
    if (item.name === 'Logout') {
      setShowLogoutConfirm(true)
      setSidebarOpen(false)
    } else if (item.children) {
      setOpenMenus((prev) => ({
        ...prev,
        [item.name.toLowerCase()]: !prev[item.name.toLowerCase()],
      }))
      if (!openMenus[item.name.toLowerCase()] && item.children.length > 0) {
        setActiveNav(item.children[0].name)
        router.push(item.children[0].href)
        setSidebarOpen(false)
      }
    } else {
      setActiveNav(item.name)
      router.push(item.href)
      setSidebarOpen(false)
    }
  }

  const handleSubMenuClick = (subItem) => {
    setActiveNav(subItem.name)
    router.push(subItem.href)
    setSidebarOpen(false)
  }

  // Export functions

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Orders')
    
    if (orders.length === 0) return
    
    // Define headers
    const headers = ['ID', 'Date', 'Name', 'Phone', 'Email', 'Product', 'Quantity', 'Price', 'Shipping/Pickup', 'Address', 'Shipping Price', 'Status']
    worksheet.addRow(headers)
    
    // Style header row
    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }
    
    // Add data rows
    orders.forEach(order => {
      const requestShipping = order.requestShipping === true || order.requestShipping === 'true'
      const shippingMethod = requestShipping ? 'Shipping' : 'Pickup'
      const address = requestShipping ? (order.address || '—') : '—'
      const shippingCost = order.shippingCost || 0
      
      const row = [
        order.id?.substring(0, 8) || '—',
        order.date || '—',
        order.name || '—',
        order.phone || '—',
        order.customerEmail || 'N/A',
        getProductName(order),
        order.quantity || '—',
        order.price || 0,
        shippingMethod,
        address,
        requestShipping && shippingCost > 0 ? Number(shippingCost).toFixed(2) : '—',
        order.status || '—',
      ]
      worksheet.addRow(row)
    })
    
    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15
    })
    
    // Generate buffer and download
    const buffer = await workbook.xlsx.writeBuffer()
    const data = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(data, 'orders.xlsx')
  }

  const exportToCSV = () => {
    const csvData = orders.map(order => {
      const requestShipping = order.requestShipping === true || order.requestShipping === 'true'
      const shippingMethod = requestShipping ? 'Shipping' : 'Pickup'
      const address = requestShipping ? (order.address || '—') : '—'
      const shippingCost = order.shippingCost || 0
      
      return {
        ID: order.id?.substring(0, 8) || '—',
        Date: order.date || '—',
        Name: order.name || '—',
        Phone: order.phone || '—',
        Email: order.customerEmail || 'N/A',
        Product: getProductName(order),
        Quantity: order.quantity || '—',
        Price: order.price || 0,
        'Shipping/Pickup': shippingMethod,
        Address: address,
        'Shipping Price': requestShipping && shippingCost > 0 ? Number(shippingCost).toFixed(2) : '—',
        Status: order.status || '—',
      }
    })
    const csv = Papa.unparse(csvData)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, 'orders.csv')
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    const tableColumn = ['ID', 'Date', 'Name', 'Phone', 'Email', 'Product', 'Quantity', 'Price', 'Shipping/Pickup', 'Address', 'Shipping Price', 'Status']
    const tableRows = []

    orders.forEach((order) => {
      const requestShipping = order.requestShipping === true || order.requestShipping === 'true'
      const shippingMethod = requestShipping ? 'Shipping' : 'Pickup'
      const address = requestShipping ? (order.address || '—') : '—'
      const shippingCost = order.shippingCost || 0
      
      const orderData = [
        order.id?.substring(0, 8) || '—',
        order.date,
        order.name,
        order.phone || '—',
        order.customerEmail || 'N/A',
        getProductName(order),
        order.quantity,
        `RM${order.price}`,
        shippingMethod,
        address,
        requestShipping && shippingCost > 0 ? `RM ${Number(shippingCost).toFixed(2)}` : '—',
        order.status,
      ]
      tableRows.push(orderData)
    })

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    })
    doc.text('Orders List', 14, 15)
    doc.save('orders.pdf')
  }

  return (
    <div className="bg-gray-50 min-h-screen flex">
      {/* Sidebar Overlay for mobile */}
      <div
        className={`lg:hidden fixed inset-0 z-50 bg-gray-900 bg-opacity-75 ${
          sidebarOpen ? 'block' : 'hidden'
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Mobile Sidebar */}
      <div
        className={`lg:hidden fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Mobile sidebar"
      >
        <div className="flex items-center justify-between px-4 py-6 border-b">
          <img alt="Logo" src="/logo.png" className="h-10 w-auto" />
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-gray-400 hover:text-gray-700 transition"
            aria-label="Close sidebar"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <nav className="px-2 py-6">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const isActive =
                activeNav === item.name || item.children?.some((c) => c.name === activeNav)
              const isOpen = openMenus[item.name.toLowerCase()]
              return item.children ? (
                <li key={item.name}>
                  <button
                    onClick={() => handleNavigationClick(item)}
                    className={classNames(
                      isActive
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
                      aria-hidden="true"
                    >
                      <path d="M6 6L14 10L6 14V6Z" />
                    </svg>
                  </button>
                  {isOpen && (
                    <ul className="pl-12 mt-1 space-y-1">
                      {item.children.map((subItem) => {
                        const isSubActive = activeNav === subItem.name
                        return (
                          <li key={subItem.name}>
                            <button
                              onClick={() => handleSubMenuClick(subItem)}
                              className={classNames(
                                isSubActive
                                  ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                                  : 'text-gray-500 hover:bg-blue-50 hover:text-blue-700',
                                'block rounded-md p-2 text-base font-medium w-full text-left'
                              )}
                            >
                              {subItem.name}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              ) : (
                <li key={item.name}>
                  <button
                    onClick={() => handleNavigationClick(item)}
                    className={classNames(
                      isActive
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

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-72 lg:bg-white lg:fixed lg:inset-y-0 lg:z-50 shadow-lg border-r">
        <div className="flex flex-col gap-y-6 overflow-y-auto px-6 py-6">
          <div className="flex items-center justify-center mb-8">
            <img alt="Logo" src="/logo.png" className="h-16 w-auto" />
          </div>
          <nav className="flex-1">
            <ul className="space-y-2">
              {navigation.map((item) => {
                const isActive =
                  activeNav === item.name || item.children?.some((c) => c.name === activeNav)
                const isOpen = openMenus[item.name.toLowerCase()]
                return item.children ? (
                  <li key={item.name}>
                    <button
                      onClick={() => handleNavigationClick(item)}
                      className={classNames(
                        isActive
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
                        aria-hidden="true"
                      >
                        <path d="M6 6L14 10L6 14V6Z" />
                      </svg>
                    </button>
                    {isOpen && (
                      <ul className="mt-1 ml-8 space-y-1 border-l border-gray-300">
                        {item.children.map((subItem) => {
                          const isSubActive = activeNav === subItem.name
                          return (
                            <li key={subItem.name}>
                              <button
                                onClick={() => handleSubMenuClick(subItem)}
                                className={classNames(
                                  isSubActive
                                    ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                                    : 'text-gray-500 hover:bg-blue-50 hover:text-blue-700',
                                  'block rounded-md p-2 text-base font-medium w-full text-left'
                                )}
                              >
                                {subItem.name}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </li>
                ) : (
                  <li key={item.name}>
                    <button
                      onClick={() => handleNavigationClick(item)}
                      className={classNames(
                        isActive
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

      {/* Mobile Toggle Button */}
      <button
        className="lg:hidden text-gray-400 p-2 fixed top-4 left-4 z-50 bg-white rounded-full shadow border"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
      >
        <Bars3Icon className="h-6 w-6" />
      </button>

      <main className="flex-1 p-6 lg:p-10 bg-gray-50 min-h-screen overflow-auto lg:ml-72">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Order List</h2>

          {/* Export buttons */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={exportToExcel}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md shadow transition"
            >
              Export Excel
            </button>
            <button
              onClick={exportToCSV}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md shadow transition"
            >
              Export CSV
            </button>
            <button
              onClick={exportToPDF}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md shadow transition"
            >
              Export PDF
            </button>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-2 items-center">
                <button
                  onClick={handleAdd}
                  className="bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 focus:outline-none text-white px-4 py-2 rounded-md shadow transition"
                >
                  Add
                </button>
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  aria-label="Search orders"
                />
              </div>
            </div>

            <div className="overflow-x-auto mt-2">
              <table className="min-w-full text-left text-sm text-gray-700 border-collapse">
                <thead>
                  <tr>
                    <th className="px-3 sm:px-4 py-2 font-semibold border-b border-gray-200 text-xs sm:text-sm">ID</th>
                    <th className="px-3 sm:px-4 py-2 font-semibold border-b border-gray-200 text-xs sm:text-sm">Date</th>
                    <th className="px-3 sm:px-4 py-2 font-semibold border-b border-gray-200 text-xs sm:text-sm">Name</th>
                    <th className="px-3 sm:px-4 py-2 font-semibold border-b border-gray-200 text-xs sm:text-sm">Phone</th>
                    <th className="px-3 sm:px-4 py-2 font-semibold border-b border-gray-200 text-xs sm:text-sm">Email</th>
                    <th className="px-3 sm:px-4 py-2 font-semibold border-b border-gray-200 text-xs sm:text-sm">Product</th>
                    <th className="px-3 sm:px-4 py-2 font-semibold border-b border-gray-200 text-xs sm:text-sm">Quantity</th>
                    <th className="px-3 sm:px-4 py-2 font-semibold border-b border-gray-200 text-xs sm:text-sm">Price</th>
                    <th className="px-3 sm:px-4 py-2 font-semibold border-b border-gray-200 text-xs sm:text-sm">Shipping/Pickup</th>
                    <th className="px-3 sm:px-4 py-2 font-semibold border-b border-gray-200 text-xs sm:text-sm">Address</th>
                    <th className="px-3 sm:px-4 py-2 font-semibold border-b border-gray-200 text-xs sm:text-sm">Shipping Price</th>
                    <th className="px-3 sm:px-4 py-2 font-semibold border-b border-gray-200 text-xs sm:text-sm">Status</th>
                    <th className="px-3 sm:px-4 py-2 font-semibold border-b border-gray-200 text-xs sm:text-sm">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="px-4 py-8 text-center text-gray-500">
                        No orders found.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order, idx) => {
                      // requestShipping should already be set correctly from the data mapping above
                      const requestShipping = order.requestShipping === true || order.requestShipping === 'true'
                      const shippingMethod = requestShipping ? 'Shipping' : 'Pickup'
                      const address = requestShipping ? (order.address || '—') : '—'
                      const shippingCost = order.shippingCost || 0
                      
                      return (
                        <tr key={order.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="px-3 sm:px-4 py-2 border-b text-xs sm:text-sm">{order.id?.substring(0, 8) || '—'}</td>
                          <td className="px-3 sm:px-4 py-2 border-b text-xs sm:text-sm">{order.date}</td>
                          <td className="px-3 sm:px-4 py-2 border-b text-xs sm:text-sm">{order.name}</td>
                          <td className="px-3 sm:px-4 py-2 border-b text-xs sm:text-sm">{order.phone || '—'}</td>
                          <td className="px-3 sm:px-4 py-2 border-b text-xs sm:text-sm">{order.customerEmail || 'N/A'}</td>
                          <td className="px-3 sm:px-4 py-2 border-b text-xs sm:text-sm">{getProductName(order)}</td>
                          <td className="px-3 sm:px-4 py-2 border-b text-xs sm:text-sm">{order.quantity}</td>
                          <td className="px-3 sm:px-4 py-2 border-b text-xs sm:text-sm">RM{order.price}</td>
                          <td className="px-3 sm:px-4 py-2 border-b">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              requestShipping 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {shippingMethod}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-2 border-b text-xs sm:text-sm max-w-xs">
                            <div className="truncate" title={address}>
                              {address}
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-2 border-b text-xs sm:text-sm font-medium">
                            {requestShipping && shippingCost > 0 ? `RM ${Number(shippingCost).toFixed(2)}` : '—'}
                          </td>
                          <td className="px-3 sm:px-4 py-2 border-b">
                            <span className={statusBadge(order.status)}>{order.status}</span>
                          </td>
                          <td className="px-3 sm:px-4 py-2 border-b">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(order.id)}
                                className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded-md"
                                aria-label={`Edit ${order.name}`}
                              >
                                <PencilIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(order.id)}
                                className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-md"
                                aria-label={`Delete ${order.name}`}
                              >
                                <TrashIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Add/Edit Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="form-modal-title"
        >
          <div className="bg-white p-6 rounded-md shadow-lg w-full max-w-md relative">
            <h3 id="form-modal-title" className="text-xl font-bold mb-4 text-black">
              {editingOrder ? 'Edit Order' : 'Add Order'}
            </h3>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <input
                className="w-full border rounded px-3 py-2 text-black"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
                placeholder="Date"
                required
              />
              <input
                className="w-full border rounded px-3 py-2 text-black"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Customer Name"
                required
              />
              <input
                className="w-full border rounded px-3 py-2 text-black"
                name="customerEmail"
                type="email"
                value={formData.customerEmail}
                onChange={handleChange}
                placeholder="Customer Email"
                required
              />
              <input
                className="w-full border rounded px-3 py-2 text-black"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Phone"
              />
              <input
                className="w-full border rounded px-3 py-2 text-black"
                name="product"
                value={formData.product}
                onChange={handleChange}
                placeholder="Product"
                required
              />
              <input
                className="w-full border rounded px-3 py-2 text-black"
                name="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="Quantity"
                required
              />
              <input
                className="w-full border rounded px-3 py-2 text-black"
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={handleChange}
                placeholder="Price"
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shipping Method <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="shippingMethod"
                      value="pickup"
                      checked={formData.shippingMethod === 'pickup'}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Pickup</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="shippingMethod"
                      value="shipping"
                      checked={formData.shippingMethod === 'shipping'}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Shipping</span>
                  </label>
                </div>
              </div>
              {formData.shippingMethod === 'shipping' && (
                <>
                  <textarea
                    className="w-full border rounded px-3 py-2 text-black"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Address"
                    required={formData.shippingMethod === 'shipping'}
                    rows={3}
                  />
                  <input
                    className="w-full border rounded px-3 py-2 text-black"
                    name="shippingCost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.shippingCost}
                    onChange={handleChange}
                    placeholder="Shipping Cost (RM)"
                  />
                </>
              )}
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2 text-black"
                required
              >
                <option value="In Process">In Process</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  className="bg-gray-400 hover:bg-gray-500 px-4 py-2 rounded"
                  onClick={handleCloseModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  {editingOrder ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          aria-describedby="delete-modal-desc"
          className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-center items-center"
        >
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full text-center">
            <h2
              id="delete-modal-title"
              className="text-lg font-semibold text-gray-800 mb-4"
            >
              Confirm Delete
            </h2>
            <p id="delete-modal-desc" className="text-gray-600 mb-6">
              Are you sure you want to delete this order?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4 text-black">Confirm Logout</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to logout?</p>
            <div className="flex justify-end space-x-4">
              <button
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={() => {
                  setShowLogoutConfirm(false)
                  router.push('/logout')
                  setSidebarOpen(false)
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
