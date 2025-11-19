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
  const [editingOrder, setEditingOrder] = useState(null)
  const [formData, setFormData] = useState({
    date: '',
    name: '',
    customerEmail: '',
    product: '',
    quantity: '1',
    price: '',
    status: 'In Process',
  })
  const [showForm, setShowForm] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const coll = collection(db, 'orders')
    const q = query(coll, orderBy('date', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const d = doc.data()
        const dateObj = d.date?.toDate instanceof Function ? d.date.toDate() : null
        return {
          id: doc.id,
          date: dateObj ? dateObj.toLocaleDateString() : d.date || '',
          name: d.name || '',
          customerEmail: d.customerEmail || '',
          product: d.product || '',
          quantity: d.quantity ? String(d.quantity) : '1',
          price: d.price || '',
          status: d.status || 'In Process',
        }
      })
      setOrders(data)
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
      product: '',
      quantity: '1',
      price: '',
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

      setFormData({
        date: dateValue,
        name: order.name,
        customerEmail: order.customerEmail,
        product: order.product,
        quantity: order.quantity,
        price: order.price,
        status: order.status,
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
      const orderData = {
        date: dateForFirestore,
        name: formData.name,
        customerEmail: formData.customerEmail,
        product: formData.product,
        quantity: Number(formData.quantity) || 1,
        price: formData.price,
        status: formData.status,
      }
      if (editingOrder) {
        const orderRef = doc(db, 'orders', editingOrder)
        await updateDoc(orderRef, orderData)
      } else {
        const ordersCollection = collection(db, 'orders')
        await addDoc(ordersCollection, orderData)
      }

      setShowForm(false)
      setEditingOrder(null)
      setFormData({
        date: '',
        name: '',
        customerEmail: '',
        product: '',
        quantity: '1',
        price: '',
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
      product: '',
      quantity: '1',
      price: '',
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
        await deleteDoc(doc(db, 'orders', deleteId))
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
    
    // Get headers from the first order
    const headers = Object.keys(orders[0])
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
      const row = headers.map(header => {
        const value = order[header]
        // Handle nested objects/arrays
        if (value && typeof value === 'object') {
          return JSON.stringify(value)
        }
        return value ?? ''
      })
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
    const csv = Papa.unparse(orders)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, 'orders.csv')
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    const tableColumn = ['Date', 'Name', 'Email', 'Product', 'Quantity', 'Price', 'Status']
    const tableRows = []

    orders.forEach((order) => {
      const orderData = [
        order.date,
        order.name,
        order.customerEmail || 'N/A',
        order.product,
        order.quantity,
        `RM${order.price}`,
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
                    <th className="px-4 py-2 font-semibold border-b border-gray-200">Date</th>
                    <th className="px-4 py-2 font-semibold border-b border-gray-200">Name</th>
                    <th className="px-4 py-2 font-semibold border-b border-gray-200">Email</th>
                    <th className="px-4 py-2 font-semibold border-b border-gray-200">Product</th>
                    <th className="px-4 py-2 font-semibold border-b border-gray-200">Quantity</th>
                    <th className="px-4 py-2 font-semibold border-b border-gray-200">Price</th>
                    <th className="px-4 py-2 font-semibold border-b border-gray-200">Status</th>
                    <th className="px-4 py-2 font-semibold border-b border-gray-200">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        No orders found.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order, idx) => (
                      <tr key={order.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="px-4 py-2 border-b">{order.date}</td>
                        <td className="px-4 py-2 border-b">{order.name}</td>
                        <td className="px-4 py-2 border-b">{order.customerEmail || 'N/A'}</td>
                        <td className="px-4 py-2 border-b">{order.product}</td>
                        <td className="px-4 py-2 border-b">{order.quantity}</td>
                        <td className="px-4 py-2 border-b">RM{order.price}</td>
                        <td className="px-4 py-2 border-b">
                          <span className={statusBadge(order.status)}>{order.status}</span>
                        </td>
                        <td className="px-4 py-2 border-b flex gap-2">
                          <button
                            onClick={() => handleEdit(order.id)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded-md"
                            aria-label={`Edit ${order.name}`}
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(order.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-md"
                            aria-label={`Delete ${order.name}`}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))
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
