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
  PlusIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ClockIcon,
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
  { name: 'Products', href: '/products', icon: ShoppingBagIcon },
  { name: 'Customers', href: '/customers', icon: UsersIcon },
  { name: 'Orders', href: '/orders', icon: FolderIcon },
  { name: 'Review and Inquiry', href: '/review', icon: StarIcon },
  { name: 'Logout', href: '/logout', icon: XMarkIcon },
]

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

function extractProductDetails(value) {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'object' && item !== null) {
        return {
          name: item.name || item.label,
          category: item.category || item.name || item.label,
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
    return [{
      name: value.name || value.label,
      category: value.category || value.name || value.label,
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

function normalizeProductInput(value) {
  const detailsList = extractProductDetails(value)
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
  const [orders, setOrders] = useState([])
  const [editingOrder, setEditingOrder] = useState(null)
  const [expandedOrders, setExpandedOrders] = useState(new Set())
  const [formData, setFormData] = useState({
    date: '',
    name: '',
    product: '',
    price: '',
    phone: '',
    email: '',
    address: '',
    status: 'Pending',
  })
  const [showForm, setShowForm] = useState(false)
  const [activeNav, setActiveNav] = useState('Orders')
  const [searchQuery, setSearchQuery] = useState('')

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
    setFormData({
      date: '',
      name: '',
      product: '',
      price: '',
      phone: '',
      email: '',
      address: '',
      status: 'Pending',
    })
    setShowForm(true)
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
    setFormData({
      date: formatDateInput(order.timestamp) || '',
      name: order.name || '',
      product: normalizeProductInput(order.products || order.product),
      price: order.price ?? '',
      phone: order.phone || order.phoneEmail || '',
      email: order.email || '',
      address: order.address || '',
      status: order.status || 'Pending',
    })
    setShowForm(true)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      timestamp: formData.date ? Timestamp.fromDate(new Date(formData.date)) : Timestamp.now(),
      name: formData.name,
      products: formData.product,
      price: Number(formData.price),
      phone: formData.phone,
      email: formData.email,
      phoneEmail: formData.phone || formData.email ? `${formData.phone} ${formData.email}`.trim() : undefined,
      address: formData.address,
      status: formData.status || 'Pending',
    }

    if (editingOrder) {
      await updateDoc(doc(db, 'Orders', editingOrder), payload)
    } else {
      await addDoc(collection(db, 'Orders'), payload)
    }

    setFormData({
      date: '',
      name: '',
      product: '',
      price: '',
      phone: '',
      email: '',
      address: '',
      status: 'Pending',
    })
    setEditingOrder(null)
    setShowForm(false)
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
    setFormData({
      date: '',
      name: '',
      product: '',
      price: '',
      phone: '',
      email: '',
      address: '',
      status: 'Pending',
    })
  }

  // Filter orders based on search query
  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      order.name?.toLowerCase().includes(query) ||
      order.phone?.toLowerCase().includes(query) ||
      order.email?.toLowerCase().includes(query) ||
      order.address?.toLowerCase().includes(query) ||
      normalizeProductInput(order.products || order.product).toLowerCase().includes(query) ||
      order.status?.toLowerCase().includes(query)
    )
  })

  return (
    <div className="bg-gray-50 min-h-screen flex">
      {/* Mobile Sidebar */}
      <div className={`lg:hidden fixed inset-0 z-50 bg-gray-900 bg-opacity-75 ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="flex flex-col w-64 bg-white h-full shadow-lg">
          <div className="flex items-center justify-between px-4 py-6 mb-4 border-b">
            <img alt="Logo" src="/logo.png" className="h-10 w-auto" />
            <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-700 transition">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1">
            <ul role="list" className="space-y-2 px-2">
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
                    <item.icon aria-hidden="true" className="h-6 w-6" />
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* Sidebar for larger screens */}
      <div className="hidden lg:flex lg:flex-col lg:w-72 lg:bg-white lg:fixed lg:inset-y-0 lg:z-50 shadow-lg border-r">
        <div className="flex flex-col gap-y-6 overflow-y-auto px-6 py-6">
          <div className="flex items-center justify-center mb-8">
            <img alt="Your Company" src="/logo.png" className="h-16 w-auto" />
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
                    <item.icon aria-hidden="true" className="h-6 w-6" />
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-10 bg-gray-50 min-h-screen overflow-auto lg:ml-72">
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
          <div className="bg-white rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg border border-gray-100">
            {/* Header Section */}
            <div className="mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Orders</h2>
                  <p className="text-sm sm:text-base text-gray-500 mt-1">Manage and track all customer orders</p>
                </div>
                <button
                  onClick={handleAdd}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg shadow-md hover:shadow-lg transition font-semibold text-sm sm:text-base"
                >
                  <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline">Add New Order</span>
                  <span className="sm:hidden">Add</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                />
              </div>
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
                    className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm sm:text-base"
                  >
                    <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    Add Your First Order
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {filteredOrders.map((order, idx) => {
                  const productDetailsList = extractProductDetails(order.products || order.product)
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
                  const orderDate = order.timestamp?.toDate
                    ? order.timestamp.toDate().toLocaleDateString()
                    : order.date || '—'

                  return (
                    <div key={order.id}>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-1">
                              <div>
                                <div className="text-sm sm:text-base font-semibold text-gray-900 mb-0.5">{order.name}</div>
                                <div className="text-xs sm:text-sm text-gray-500">{orderDate}</div>
                              </div>
                              <div className="sm:ml-4">
                                <select
                                  value={orderStatus}
                                  onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                  className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium border-2 transition cursor-pointer ${
                                    isPending
                                      ? 'bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100'
                                      : 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                                  }`}
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="Shipped">Shipped</option>
                                </select>
                              </div>
                            </div>
                            <div className="mt-2 space-y-1">
                              {hasMultipleItems ? (
                                <>
                                  <div className="text-xs sm:text-sm">
                                    <span className="text-gray-500">Items: </span>
                                    <button
                                      onClick={() => toggleOrderExpansion(order.id)}
                                      className="text-blue-600 hover:text-blue-800 underline font-medium"
                                    >
                                      {isExpanded ? 'Hide' : 'Show'} {productDetailsList.length} items
                                    </button>
                                  </div>
                                  <div className="text-xs sm:text-sm">
                                    <span className="text-gray-500">Total Quantity: </span>
                                    <span className="text-gray-700">{totalQuantity}</span>
                                  </div>
                                </>
                              ) : (
                                <div className="text-xs sm:text-sm">
                                  <span className="text-gray-500">Product: </span>
                                  <span className="text-gray-700">{productDetailsList[0]?.category || productDetailsList[0]?.name || '—'}</span>
                                  {productDetailsList[0]?.quantity && (
                                    <>
                                      <span className="text-gray-500 ml-2">Quantity: </span>
                                      <span className="text-gray-700">{productDetailsList[0].quantity}</span>
                                    </>
                                  )}
                                  {productDetailsList[0]?.sizeType && (
                                    <>
                                      <span className="text-gray-500 ml-2">Type: </span>
                                      <span className="text-gray-700">{productDetailsList[0].sizeType}</span>
                                    </>
                                  )}
                                </div>
                              )}
                              <div className="text-xs sm:text-sm">
                                <span className="text-gray-500">Price: </span>
                                <span className="text-gray-700 font-semibold">
                                  {formatAmount(hasMultipleItems ? totalPrice : (productDetailsList[0]?.price ?? order.price ?? 0))}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Expanded items for multiple products */}
                      {hasMultipleItems && isExpanded && (
                        <div className="mt-2 ml-4 space-y-2">
                          {productDetailsList.map((item, itemIdx) => (
                            <div
                              key={`${order.id}-item-${itemIdx}`}
                              className="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-2 sm:p-3"
                            >
                              <div className="text-xs sm:text-sm space-y-1">
                                <div>
                                  <span className="text-gray-500">Product: </span>
                                  <span className="text-gray-700 font-medium">• {item.name || item.category}</span>
                                </div>
                                {item.quantity && (
                                  <div>
                                    <span className="text-gray-500">Quantity: </span>
                                    <span className="text-gray-700">{item.quantity}</span>
                                  </div>
                                )}
                                {item.sizeType && (
                                  <div>
                                    <span className="text-gray-500">Type: </span>
                                    <span className="text-gray-700">{item.sizeType}</span>
                                  </div>
                                )}
                                <div>
                                  <span className="text-gray-500">Price: </span>
                                  <span className="text-gray-700 font-semibold">{formatAmount(item.price || 0)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>

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
                <XMarkIcon className="h-6 w-6" />
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
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Address <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        required
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Product Information Section */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                    Product Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Product <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="product"
                        value={formData.product}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Price (RM) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        required
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      />
                    </div>
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
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md hover:shadow-lg transition font-medium"
                  >
                    {editingOrder ? 'Update Order' : 'Add Order'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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

