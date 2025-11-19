'use client'

import { useState, useEffect } from 'react'
import {
  HomeIcon,
  UsersIcon,
  ShoppingBagIcon,
  FolderIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { StarIcon } from '@heroicons/react/20/solid'
import { useRouter } from 'next/navigation'

import { db } from '../../firebase'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from 'firebase/firestore'

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
  { name: 'Orders', href: '/order', icon: FolderIcon },
  { name: 'Review and Inquiry', href: '/review', icon: StarIcon },
  { name: 'Logout', href: '/logout', icon: XMarkIcon },
]

const currentRoute = '/products/livegrass' // Adjust dynamically in your real app if needed

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

function Sidebar({ currentRoute, onLogout }) {
  const router = useRouter()

  // Determine active nav item (parent or child)
  const findActiveNav = () => {
    for (const item of navigation) {
      if (item.href === currentRoute) return item.name
      if (item.children) {
        for (const child of item.children) {
          if (child.href === currentRoute) return child.name
        }
      }
    }
    return ''
  }

  const [activeNav, setActiveNav] = useState(findActiveNav())
  const [openMenus, setOpenMenus] = useState(() => {
    const productsMenu = navigation.find((i) => i.name === 'Products')
    const isOpen = productsMenu.children.some((c) => c.href === currentRoute)
    return { products: isOpen }
  })

  return (
    <div className="hidden lg:flex lg:flex-col lg:w-72 lg:bg-white lg:fixed lg:inset-y-0 lg:z-50 shadow-lg border-r border-gray-200">
      <div className="flex flex-col gap-y-6 overflow-y-auto px-6 py-6 h-full">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <img alt="Logo" src="/logo.png" className="h-16 w-auto" />
        </div>
        {/* Navigation */}
        <nav className="flex-1">
          <ul role="list" className="space-y-2">
            {navigation.map((item) => {
              const isParentActive =
                activeNav === item.name ||
                (item.children && item.children.some((c) => c.name === activeNav))

              if (item.children) {
                const isOpen = openMenus[item.name.toLowerCase()] || false

                return (
                  <li key={item.name}>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenus((prev) => ({
                          ...prev,
                          [item.name.toLowerCase()]: !prev[item.name.toLowerCase()],
                        }))
                      }
                      className={classNames(
                        isParentActive
                          ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                          : 'text-gray-500 hover:bg-blue-50 hover:text-blue-700',
                        'group flex gap-x-4 rounded-md p-3 text-lg font-semibold w-full text-left transition-colors duration-200'
                      )}
                    >
                      <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                      {item.name}
                      <svg
                        className={classNames(
                          'ml-auto h-5 w-5 shrink-0',
                          isOpen ? 'rotate-90' : 'rotate-0',
                          'transform transition-transform duration-200'
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
                                  router.push(subitem.href) // Navigate to subpage
                                }}
                                className={classNames(
                                  isSubActive
                                    ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                                    : 'text-gray-500 hover:bg-blue-50 hover:text-blue-700',
                                  'block rounded-md p-2 text-base font-medium'
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
                      if (item.name === 'Logout') {
                        e.preventDefault()
                        onLogout()
                      } else {
                        setActiveNav(item.name)
                        router.push(item.href) // Navigate on main item click
                      }
                    }}
                    className={classNames(
                      activeNav === item.name
                        ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                        : 'text-gray-500 hover:bg-blue-50 hover:text-blue-700',
                      'group flex gap-x-4 rounded-md p-3 text-lg font-semibold transition-colors duration-200'
                    )}
                  >
                    <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                    {item.name}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  const router = useRouter()

  const [expandedProductId, setExpandedProductId] = useState(null)
  const [products, setProducts] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProd, setEditingProd] = useState(null)
  const [productToDel, setProductToDel] = useState(null)
  const [showDelete, setShowDelete] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const [newProduct, setNewProduct] = useState({
    category: '',
    description: '',
    features: [],
    images: [],
    inStock: true,
    name: '',
    priceDetails: [],
  })

  useEffect(() => {
    // Listen to LiveGrass collection realtime
    const unsub = onSnapshot(collection(db, 'LiveGrass'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      setProducts(list)
    })

    return unsub
  }, [])

  const resetModal = () => {
    setIsModalOpen(false)
    setEditingProd(null)
    setNewProduct({
      category: '',
      description: '',
      features: [],
      images: [],
      inStock: true,
      name: '',
      priceDetails: [],
    })
  }

  const handleAddOrSave = async () => {
    if (!newProduct.name || !newProduct.description || newProduct.images.length === 0) {
      alert('Please fill required fields: Name, Description, and add at least one Image')
      return
    }
    try {
      const prodData = {
        category: newProduct.category,
        description: newProduct.description,
        features: newProduct.features,
        // Always store images as { src: ... }
        images: newProduct.images
          .slice(0, 3)
          .map((img) => (typeof img === 'string' ? { src: img } : img)),
        inStock: newProduct.inStock,
        name: newProduct.name,
        priceDetails: newProduct.priceDetails,
      }
      if (editingProd && editingProd.id) {
        const ref = doc(db, 'LiveGrass', editingProd.id)
        await updateDoc(ref, prodData)
      } else {
        await addDoc(collection(db, 'LiveGrass'), prodData)
      }
      resetModal()
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Failed to save product. Please try again.')
    }
  }

  const handleEditProduct = (id) => {
    const prod = products.find((p) => p.id === id)
    if (!prod) return
    setEditingProd(prod)
    setNewProduct({
      category: prod.category || '',
      description: prod.description || '',
      features: prod.features || [],
      images: prod.images || [],
      inStock: prod.inStock ?? true,
      name: prod.name || '',
      priceDetails: prod.priceDetails || [],
    })
    setIsModalOpen(true)
  }

  const confirmDelete = (id) => {
    setProductToDel(id)
    setShowDelete(true)
  }

  const deleteProduct = async () => {
    if (!productToDel) return
    try {
      await deleteDoc(doc(db, 'LiveGrass', productToDel))
      setShowDelete(false)
      setProductToDel(null)
    } catch (error) {
      console.error('Failed to delete product:', error)
      alert('Failed to delete product.')
    }
  }

  const updateFeature = (index, key, value) => {
    const updated = [...newProduct.features]
    updated[index] = { ...updated[index], [key]: value }
    setNewProduct({ ...newProduct, features: updated })
  }

  const updatePriceDetail = (index, key, value) => {
    const updated = [...newProduct.priceDetails]
    updated[index] = { ...updated[index], [key]: value }
    setNewProduct({ ...newProduct, priceDetails: updated })
  }

  const updateImage = (index, key, value) => {
    const updated = [...newProduct.images]
    updated[index] = { ...updated[index], [key]: value }
    setNewProduct({ ...newProduct, images: updated })
  }

  const handleImageUpload = async (event, i) => {
    const file = event.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      updateImage(i, 'src', reader.result) // base64 data URI string
    }
    reader.readAsDataURL(file)
  }

  const confirmLogout = () => {
    setShowLogoutConfirm(false)
    router.push('/logout')
  }

  return (
    <div className="bg-gray-50 min-h-screen flex">
      <Sidebar currentRoute={currentRoute} onLogout={() => setShowLogoutConfirm(true)} />
      <main className="flex-1 ml-0 lg:ml-72 p-6 overflow-auto">
        <h2 className="text-2xl font-semibold text-black mb-4">Products - Live Grass</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Product
        </button>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((prod) => {
            const isExpanded = expandedProductId === prod.id
            return (
              <div
                key={prod.id}
                className="bg-white shadow rounded-lg overflow-hidden flex flex-col h-full"
              >
                <img
                  src={
                    prod.images && prod.images.length > 0
                      ? typeof prod.images[0] === 'string'
                        ? prod.images[0]
                        : prod.images[0]?.src
                      : ''
                  }
                  alt={prod.name || 'Product Image'}
                  className="h-48 w-full object-cover"
                />
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-semibold text-lg text-black">{prod.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{prod.description}</p>
                  {prod.inStock === false ? (
                    <p className="text-red-600 font-medium">Out of Stock</p>
                  ) : (
                    <p className="text-green-600 font-medium">In Stock</p>
                  )}
                  <button
                    className="text-blue-600 text-sm underline mb-2"
                    onClick={() => setExpandedProductId(isExpanded ? null : prod.id)}
                  >
                    {isExpanded ? 'Hide Details' : 'View Details'}
                  </button>
                  {isExpanded && (
                    <div className="text-sm text-gray-700 space-y-4 mt-2">
                      {prod.category && <p><strong>Category:</strong> {prod.category}</p>}
                      {prod.priceDetails?.length > 0 && (
                        <div>
                          <p className="font-semibold">Price Details:</p>
                          <ul className="list-disc list-inside">
                            {prod.priceDetails.map((p, i) => (
                              <li key={i}>
                                {p.measurement} - RM {p.price} {p.sizeType && `(${p.sizeType})`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {prod.features?.length > 0 && (
                        <div>
                          <p className="font-semibold">Features:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {prod.features.map((f, i) => (
                              <li key={i}>
                                <span className="font-semibold">{f.title}:</span> {f.description}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {prod.images?.length > 0 && (
                        <div>
                          <p className="font-semibold">Images:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {prod.images.map((img, idx) => (
                              <div key={idx}>
                                <img
                                  src={typeof img === 'string' ? img : img.src}
                                  alt={`Image ${idx + 1}`}
                                  className="h-24 w-full object-cover rounded"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex justify-between px-4 pb-4 mt-auto">
                  <button
                    onClick={() => handleEditProduct(prod.id)}
                    className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => confirmDelete(prod.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Add/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto p-4">
            <div className="bg-white p-6 rounded-lg w-full max-w-3xl space-y-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-semibold text-gray-800">
                {editingProd ? 'Edit Product' : 'Add Product'}
              </h3>
              <input
                type="text"
                placeholder="Name"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                className="border p-2 rounded w-full text-gray-900"
              />
              <input
                type="text"
                placeholder="Category"
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                className="border p-2 rounded w-full text-gray-900"
              />
              <textarea
                placeholder="Description"
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                className="border p-2 rounded w-full text-gray-900"
                rows={3}
              />
              {/* Images Editor */}
              <div>
                <h4 className="font-semibold mb-2 text-gray-800">Images (max 3)</h4>
                {newProduct.images.map((img, i) => (
                  <div key={i} className="flex gap-2 mb-2 items-center">
                    <input
                      type="text"
                      placeholder="Image URL or Base64"
                      value={img.src || ''}
                      onChange={(e) => updateImage(i, 'src', e.target.value)}
                      className="border p-1 rounded flex-1 text-gray-900"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, i)}
                      className="border p-1 rounded flex-1"
                    />
                    <button
                      onClick={() => {
                        const filtered = newProduct.images.filter((_, idx) => idx !== i)
                        setNewProduct((prev) => ({ ...prev, images: filtered }))
                      }}
                      className="text-red-600 font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {newProduct.images.length < 3 && (
                  <button
                    onClick={() =>
                      setNewProduct({ ...newProduct, images: [...(newProduct.images || []), { src: '' }] })
                    }
                    className="text-blue-600 underline text-sm"
                  >
                    Add Image
                  </button>
                )}
              </div>
              {/* Features Editor */}
              <div>
                <h4 className="font-semibold mb-2 text-gray-800">Features</h4>
                {newProduct.features.map((f, i) => (
                  <div key={i} className="flex gap-2 mb-2 items-center">
                    <input
                      type="text"
                      placeholder="Title"
                      value={f.title || ''}
                      onChange={(e) => updateFeature(i, 'title', e.target.value)}
                      className="border p-1 rounded flex-1 text-gray-900"
                    />
                    <input
                      type="text"
                      placeholder="Description"
                      value={f.description || ''}
                      onChange={(e) => updateFeature(i, 'description', e.target.value)}
                      className="border p-1 rounded flex-1 text-gray-900"
                    />
                    <button
                      onClick={() => {
                        const filtered = newProduct.features.filter((_, idx) => idx !== i)
                        setNewProduct((prev) => ({ ...prev, features: filtered }))
                      }}
                      className="text-red-600 font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    setNewProduct({ ...newProduct, features: [...(newProduct.features || []), { title: '', description: '' }] })
                  }
                  className="text-blue-600 underline text-sm"
                >
                  Add Feature
                </button>
              </div>
              {/* Price Details Editor */}
              <div>
                <h4 className="font-semibold mb-2 text-gray-800">Price Details</h4>
                {newProduct.priceDetails.map((p, i) => (
                  <div key={i} className="flex gap-2 mb-2 items-center">
                    <input
                      type="text"
                      placeholder="Measurement"
                      value={p.measurement || ''}
                      onChange={(e) => updatePriceDetail(i, 'measurement', e.target.value)}
                      className="border p-1 rounded flex-1 text-gray-900"
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      value={p.price || ''}
                      onChange={(e) => updatePriceDetail(i, 'price', e.target.value)}
                      className="border p-1 rounded flex-1 text-gray-900"
                      min="0"
                      step="0.01"
                    />
                    <button
                      onClick={() => {
                        const filtered = newProduct.priceDetails.filter((_, idx) => idx !== i)
                        setNewProduct((prev) => ({ ...prev, priceDetails: filtered }))
                      }}
                      className="text-red-600 font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    setNewProduct({ ...newProduct, priceDetails: [...(newProduct.priceDetails || []), { measurement: '', price: '' }] })
                  }
                  className="text-blue-600 underline text-sm"
                >
                  Add Price Detail
                </button>
              </div>
              {/* In Stock Checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newProduct.inStock}
                  onChange={(e) => setNewProduct({ ...newProduct, inStock: e.target.checked })}
                  id="inStockCheckbox"
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="inStockCheckbox" className="text-gray-700">
                  In Stock
                </label>
              </div>
              <div className="flex justify-end gap-4 mt-4">
                <button
                  onClick={resetModal}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddOrSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingProd ? 'Save' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Delete Confirmation Modal */}
        {showDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6 text-center">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Delete Product</h2>
              <p className="text-gray-600 mb-4">Are you sure you want to delete this product?</p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setShowDelete(false)}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteProduct}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
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
                  onClick={confirmLogout}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
