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
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { db } from '../firebase'
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
  { name: 'Products', href: '/products', icon: ShoppingBagIcon },
  { name: 'Customers', href: '/customers', icon: UsersIcon },
  { name: 'Orders', href: '/orders', icon: FolderIcon },
  { name: 'Review and Inquiry', href: '/review', icon: StarIcon },
  { name: 'Logout', href: '/logout', icon: XMarkIcon },
]

const currentRoute = '/products'
const productCollections = [
  { label: 'Live Grass', value: 'LiveGrass' },
  { label: 'Artificial Grass', value: 'ArtificialGrass' },
]

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

function Sidebar({ onLogout }) {
  const initialActive = navigation.find((n) => n.href === currentRoute)?.name || ''
  const [activeNav, setActiveNav] = useState(initialActive)

  const handleNavClick = (item, e) => {
    if (item.name === 'Logout') {
      e.preventDefault()
      if (onLogout) {
        onLogout()
      }
    } else {
      setActiveNav(item.name)
    }
  }

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
              const isActive = activeNav === item.name
              return (
                <li key={item.name}>
                  <a
                    href={item.href}
                    onClick={(e) => handleNavClick(item, e)}
                    className={classNames(
                      isActive
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
  const [productsByCollection, setProductsByCollection] = useState({
    LiveGrass: [],
    ArtificialGrass: [],
  })
  const [activeCollection, setActiveCollection] = useState(productCollections[0].value)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProd, setEditingProd] = useState(null)
  const [productToDel, setProductToDel] = useState(null)
  const [showDelete, setShowDelete] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const [newProduct, setNewProduct] = useState({
    coverImage: '',
    description: '',
    features: [],
    images: [],
    priceDetails: [],
  })

  useEffect(() => {
    const unsubs = productCollections.map((col) =>
      onSnapshot(collection(db, col.value), (snap) => {
        const docs = snap.docs.map((d) => ({
          id: d.id,
          collection: col.value,
          ...d.data(),
        }))
        setProductsByCollection((prev) => ({
          ...prev,
          [col.value]: docs,
        }))
      })
    )
    return () => {
      unsubs.forEach((unsub) => unsub && unsub())
    }
  }, [])

  const allProducts = productsByCollection[activeCollection] || []
  
  // Filter products based on search query
  const products = allProducts.filter((prod) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      prod.description?.toLowerCase().includes(query) ||
      prod.features?.some((f) => 
        f.label?.toLowerCase().includes(query) || 
        f.description?.toLowerCase().includes(query)
      ) ||
      prod.priceDetails?.some((p) => 
        p.measurement?.toLowerCase().includes(query) ||
        p.sizeType?.toLowerCase().includes(query)
      )
    )
  })

  const resetModal = () => {
    setIsModalOpen(false)
    setEditingProd(null)
    setNewProduct({
      coverImage: '',
      description: '',
      features: [],
      images: [],
      priceDetails: [],
    })
  }

  const handleAddOrSave = async () => {
    const prodData = {
      ...newProduct,
      images: [
        { src: newProduct.coverImage, description: 'Main preview image' },
        ...newProduct.images.slice(0, 2), // max 3 images total
      ],
    }

    if (!prodData.coverImage || !prodData.description) {
      alert('Please fill all required fields.')
      return
    }

    const targetCollection = editingProd?.collection || activeCollection

    if (editingProd) {
      const ref = doc(db, targetCollection, editingProd.id)
      await updateDoc(ref, prodData)
    } else {
      await addDoc(collection(db, targetCollection), prodData)
    }

    resetModal()
  }

  const handleEditProduct = (product) => {
    const prod = product
    const imgWithoutFirst = prod.images?.slice(1) || []
    setEditingProd(prod)
    setActiveCollection(prod.collection)
    setNewProduct({
      coverImage: prod.coverImage || '',
      description: prod.description || '',
      features: prod.features || [],
      images: imgWithoutFirst,
      priceDetails: prod.priceDetails || [],
    })
    setIsModalOpen(true)
  }

  const confirmDelete = (product) => {
    setProductToDel(product)
    setShowDelete(true)
  }

  const deleteProduct = async () => {
    if (!productToDel) return
    await deleteDoc(doc(db, productToDel.collection, productToDel.id))
    setShowDelete(false)
    setProductToDel(null)
  }


  const updateFeature = (i, key, val) => {
    const updated = [...newProduct.features]
    updated[i] = { ...updated[i], [key]: val }
    setNewProduct({ ...newProduct, features: updated })
  }


  const updatePriceDetail = (i, key, val) => {
    const updated = [...newProduct.priceDetails]
    updated[i] = { ...updated[i], [key]: val }
    setNewProduct({ ...newProduct, priceDetails: updated })
  }


  const updateImage = (i, key, val) => {
    const updated = [...newProduct.images]
    updated[i] = { ...updated[i], [key]: val }
    setNewProduct({ ...newProduct, images: updated })
  }

  const confirmLogout = () => {
    setShowLogoutConfirm(false)
    router.push('/logout')
  }

  return (
    <div className="bg-gray-50 min-h-screen flex">
      <Sidebar onLogout={() => setShowLogoutConfirm(true)} />

      <main className="flex-1 ml-0 lg:ml-72 p-6 lg:p-8">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Products</h2>
              <p className="text-sm text-gray-500 mt-1">
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md hover:shadow-lg font-semibold"
            >
              <PlusIcon className="h-5 w-5" />
              Add Product
            </button>
          </div>

          {/* Collection Tabs and Search */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex gap-2">
              {productCollections.map((col) => (
                <button
                  key={col.value}
                  onClick={() => setActiveCollection(col.value)}
                  className={classNames(
                    'px-5 py-2.5 rounded-lg text-sm font-semibold transition shadow-sm',
                    activeCollection === col.value
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                  )}
                >
                  {col.label}
                </button>
              ))}
            </div>
            
            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <ShoppingBagIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {searchQuery ? 'No products found' : 'No products yet'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery 
                ? 'Try adjusting your search terms'
                : `Get started by adding your first ${activeCollection === 'LiveGrass' ? 'Live Grass' : 'Artificial Grass'} product`
              }
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                <PlusIcon className="h-5 w-5" />
                Add Your First Product
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((prod) => {
              const uniqueId = `${prod.collection}-${prod.id}`
              const isExpanded = expandedProductId === uniqueId
              return (
                <div
                  key={uniqueId}
                  className="bg-white shadow-md rounded-xl overflow-hidden hover:shadow-lg transition-shadow border border-gray-100"
                >
                  <div className="relative">
                    <img
                      src={prod.coverImage || '/placeholder-image.png'}
                      alt={prod.description || 'Product'}
                      className="h-56 w-full object-cover"
                      onError={(e) => {
                        e.target.src = '/placeholder-image.png'
                      }}
                    />
                    <span className="absolute top-3 right-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-gray-700">
                      {prod.collection === 'LiveGrass' ? 'Live Grass' : 'Artificial Grass'}
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="text-base font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[3rem]">
                      {prod.description || 'No description'}
                    </h3>
                    
                    {/* Quick Info */}
                    {prod.priceDetails?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1">Starting from</p>
                        <p className="text-lg font-bold text-blue-600">
                          RM {Math.min(...prod.priceDetails.map(p => Number(p.price) || 0)).toFixed(2)}
                        </p>
                      </div>
                    )}

                    <button
                      className="w-full text-blue-600 text-sm font-medium hover:text-blue-700 py-2 border-t border-gray-100 mt-3"
                      onClick={() =>
                        setExpandedProductId(isExpanded ? null : uniqueId)
                      }
                    >
                      {isExpanded ? '▲ Hide Details' : '▼ View Details'}
                    </button>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-100 space-y-4 text-sm">
                        {prod.features?.length > 0 && (
                          <div>
                            <p className="font-semibold text-gray-900 mb-2">Features</p>
                            <div className="space-y-1">
                              {prod.features.map((f, i) => (
                                <div key={i} className="bg-gray-50 p-2 rounded">
                                  <span className="font-medium text-gray-900">{f.label}:</span>{' '}
                                  <span className="text-gray-600">{f.description}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {prod.priceDetails?.length > 0 && (
                          <div>
                            <p className="font-semibold text-gray-900 mb-2">Pricing</p>
                            <div className="space-y-1">
                              {prod.priceDetails.map((p, i) => (
                                <div key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                  <span className="text-gray-700">
                                    {p.measurement} ({p.sizeType})
                                  </span>
                                  <span className="font-semibold text-blue-600">RM {p.price}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {prod.images?.length > 0 && (
                          <div>
                            <p className="font-semibold text-gray-900 mb-2">Additional Images</p>
                            <div className="grid grid-cols-2 gap-2">
                              {prod.images.map((img, i) => (
                                <div key={i} className="rounded overflow-hidden">
                                  <img
                                    src={img.src}
                                    alt={img.description || 'Product image'}
                                    className="h-20 w-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="px-5 pb-5 flex gap-2">
                    <button
                      onClick={() => handleEditProduct(prod)}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white px-4 py-2.5 rounded-lg hover:bg-green-600 transition font-medium text-sm"
                    >
                      <PencilIcon className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => confirmDelete(prod)}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white px-4 py-2.5 rounded-lg hover:bg-red-600 transition font-medium text-sm"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
              </div>
            )
          })}
          </div>
        )}

        {/* Add/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {editingProd ? 'Edit Product' : 'Add New Product'}
                  </h3>
                  {!editingProd && (
                    <select
                      value={activeCollection}
                      onChange={(e) => setActiveCollection(e.target.value)}
                      className="mt-2 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {productCollections.map((col) => (
                        <option key={col.value} value={col.value}>
                          {col.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {editingProd && (
                    <p className="text-sm text-gray-500 mt-1">
                      Collection: {editingProd.collection === 'LiveGrass' ? 'Live Grass' : 'Artificial Grass'}
                    </p>
                  )}
                </div>
                <button
                  onClick={resetModal}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Basic Information
                  </h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Cover Image URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="https://example.com/image.jpg"
                      value={newProduct.coverImage}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, coverImage: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                    {newProduct.coverImage && (
                      <img
                        src={newProduct.coverImage}
                        alt="Preview"
                        className="mt-2 h-32 w-32 object-cover rounded-lg border border-gray-200"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      placeholder="Enter product description..."
                      value={newProduct.description}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, description: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      rows={4}
                    />
                  </div>
                </div>

                {/* Features */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
                    Features
                  </h4>
                  {newProduct.features.map((f, i) => (
                    <div key={i} className="flex gap-2 mb-3 p-3 bg-gray-50 rounded-lg">
                      <input
                        type="text"
                        placeholder="Feature label"
                        value={f.label}
                        onChange={(e) => updateFeature(i, 'label', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Feature description"
                        value={f.description}
                        onChange={(e) =>
                          updateFeature(i, 'description', e.target.value)
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                      />
                      <button
                        onClick={() => {
                          const filtered = newProduct.features.filter(
                            (_, idx) => idx !== i
                          )
                          setNewProduct({ ...newProduct, features: filtered })
                        }}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Remove feature"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      setNewProduct({
                        ...newProduct,
                        features: [...newProduct.features, { label: '', description: '' }],
                      })
                    }
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add Feature
                  </button>
                </div>

                {/* Additional Images */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
                    Additional Images
                  </h4>
                {/* Show inputs for up to 2 images since coverImage is first */}
                  {newProduct.images.map((img, i) => (
                    <div key={i} className="flex gap-2 mb-3 p-3 bg-gray-50 rounded-lg">
                      <input
                        type="text"
                        placeholder="Image URL"
                        value={img.src}
                        onChange={(e) => updateImage(i, 'src', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Image description"
                        value={img.description}
                        onChange={(e) => updateImage(i, 'description', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                      />
                      <button
                        onClick={() => {
                          const filtered = newProduct.images.filter((_, idx) => idx !== i)
                          setNewProduct({ ...newProduct, images: filtered })
                        }}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Remove image"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                  {newProduct.images.length < 2 && (
                    <button
                      onClick={() =>
                        setNewProduct({
                          ...newProduct,
                          images: [...newProduct.images, { src: '', description: '' }],
                        })
                      }
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Add Image
                    </button>
                  )}
                </div>

                {/* Price Details */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
                    Price Details
                  </h4>
                  {newProduct.priceDetails.map((p, i) => (
                    <div key={i} className="flex gap-2 mb-3 p-3 bg-gray-50 rounded-lg">
                      <input
                        type="text"
                        placeholder="Measurement"
                        value={p.measurement}
                        onChange={(e) => updatePriceDetail(i, 'measurement', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Price (RM)"
                        value={p.price}
                        onChange={(e) => updatePriceDetail(i, 'price', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                        min="0"
                        step="0.01"
                      />
                      <input
                        type="text"
                        placeholder="Size Type"
                        value={p.sizeType}
                        onChange={(e) => updatePriceDetail(i, 'sizeType', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                      />
                      <button
                        onClick={() => {
                          const filtered = newProduct.priceDetails.filter(
                            (_, idx) => idx !== i
                          )
                          setNewProduct({ ...newProduct, priceDetails: filtered })
                        }}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Remove price detail"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      setNewProduct({
                        ...newProduct,
                        priceDetails: [...newProduct.priceDetails, { measurement: '', price: '', sizeType: '' }],
                      })
                    }
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add Price Detail
                  </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                <button
                  onClick={resetModal}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddOrSave}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition shadow-md hover:shadow-lg"
                >
                  {editingProd ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <TrashIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Delete Product</h3>
                    <p className="text-sm text-gray-500">This action cannot be undone</p>
                  </div>
                </div>
                <p className="text-gray-700 mb-6">
                  Are you sure you want to delete <strong>{productToDel?.description || 'this product'}</strong>? This will permanently remove it from your catalog.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowDelete(false)}
                    className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={deleteProduct}
                    className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition shadow-md"
                  >
                    Delete Product
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logout Confirmation Modal */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Logout</h3>
                <p className="text-gray-700 mb-6">Are you sure you want to logout?</p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmLogout}
                    className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition shadow-md"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
