'use client'

import { useState, useEffect } from 'react'
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
} from '@heroicons/react/24/outline'
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
      { name: 'Product Plants', href: '/products/productplants' },
      { name: 'Decorative Plants', href: '/products/decorativeplants' },
      { name: 'Boulders Rocks', href: '/products/bouldersplants' },
      { name: 'Pebbles Rocks', href: '/products/pebblesrocks' },
      { name: 'Furniture', href: '/products/furniture' },
      { name: 'Ornaments', href: '/products/ornaments' },
    ],
  },
  { name: 'Customers', href: '/customers', icon: UsersIcon },
  { name: 'Orders', href: '/order', icon: FolderIcon },
  { name: 'Reviews and Inquiries', href: '/review', icon: StarIcon },
  { name: 'Logout', href: '/logout', icon: XMarkIcon },
]

const currentRoute = '/products/ornaments'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

function Sidebar({ currentRoute, onLogout }) {
  const router = useRouter()

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
    <div className="hidden lg:flex lg:flex-col lg:w-64 lg:bg-white lg:fixed lg:inset-y-0 lg:z-50 border-r border-gray-200">
      <div className="flex flex-col gap-y-6 overflow-y-auto px-4 py-6 h-full">
        <div className="flex items-center gap-3 px-2 mb-2">
            <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
          <span className="text-lg font-semibold text-gray-900">Admin</span>
        </div>
        
        <nav className="flex-1">
          <ul role="list" className="space-y-1">
            {navigation.map((item) => {
              const isParentActive =
                activeNav === item.name ||
                (item.children && item.children.some((c) => c.name === activeNav))
              const isActive = activeNav === item.name

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
                      if (item.name === 'Logout') {
                        e.preventDefault()
                        onLogout()
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
  )
}

export default function ProductsPage() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeNav, setActiveNav] = useState('Ornaments')
  const [openMenus, setOpenMenus] = useState({ products: true })

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
    priceGroup: [],
  })

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'OthersOrnaments'), (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data()
        // Preserve Firestore document ID as docId, and keep custom id field if it exists
        return { 
          docId: d.id, // Firestore document ID (always use this for updates/deletes)
          ...data, // This may contain a custom 'id' field
          id: d.id // Override with document ID for compatibility with existing code
        }
      })
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
      priceGroup: [],
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
        images: newProduct.images
          .slice(0, 3)
          .map((img) => (typeof img === 'string' ? { src: img } : img)),
        inStock: newProduct.inStock,
        name: newProduct.name,
        priceGroup: newProduct.priceGroup,
      }
      if (editingProd) {
        // Use docId (Firestore document ID) for updates
        const docId = editingProd.docId || editingProd.id
        if (!docId) {
          alert('Error: Cannot find document ID for this product')
          return
        }
        const ref = doc(db, 'OthersOrnaments', docId)
        await updateDoc(ref, prodData)
      } else {
        await addDoc(collection(db, 'OthersOrnaments'), prodData)
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
      priceGroup: prod.priceGroup || [],
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
      await deleteDoc(doc(db, 'OthersOrnaments', productToDel))
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
    const updated = [...newProduct.priceGroup]
    updated[index] = { ...updated[index], [key]: value }
    setNewProduct({ ...newProduct, priceGroup: updated })
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
      updateImage(i, 'src', reader.result)
    }
    reader.readAsDataURL(file)
  }

  const confirmLogout = () => {
    setShowLogoutConfirm(false)
    router.push('/logout')
  }

  return (
    <div className="bg-gray-50 min-h-screen flex">
      <div className={`lg:hidden fixed inset-0 z-50 bg-gray-900 bg-opacity-75 ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="flex flex-col w-64 bg-white h-full shadow-lg border-r">
          <div className="flex flex-col gap-y-6 overflow-y-auto px-4 py-6">
            <div className="flex items-center justify-between px-2 mb-2">
              <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
                <span className="text-lg font-semibold text-gray-900">Admin</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-400 hover:text-gray-700 transition"
                aria-label="Close sidebar"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <nav className="flex-1">
              <ul role="list" className="space-y-1">
                {navigation.map((item) => {
                  const isParentActive =
                    activeNav === item.name ||
                    (item.children && item.children.some((c) => c.name === activeNav))
                  const isOpen = openMenus[item.name.toLowerCase()] || false
                  const isActive = activeNav === item.name

                  if (item.children) {
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
                              ? 'bg-gray-900 text-white'
                              : 'text-gray-700 hover:bg-gray-100',
                            'group flex items-center gap-x-3 rounded-lg px-3 py-2.5 text-sm font-medium w-full text-left transition-all duration-200'
                          )}
                        >
                          <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
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
                          if (item.name === 'Logout') {
                            e.preventDefault()
                            setShowLogoutConfirm(true)
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
                        <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
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

      <Sidebar currentRoute={currentRoute} onLogout={() => setShowLogoutConfirm(true)} />
      <div className="flex flex-col lg:pl-64 w-full">
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="px-4 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden text-gray-600 hover:text-gray-900 p-2"
                  aria-label="Open menu"
                >
                  <Bars3Icon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="flex-1 lg:flex-none lg:text-center">
                <h1 className="text-2xl font-bold text-gray-900">Ornaments</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="hidden lg:flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Product
                </button>
                <button className="hidden lg:block p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                  <BellIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </header>
        
        <main className="p-4 lg:p-8 flex-1 overflow-auto bg-gray-50">
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm"
            >
              Add Product
            </button>
          </div>
        
        <div className="space-y-3 lg:space-y-4">
          {products.map((prod) => {
            const isExpanded = expandedProductId === prod.id
            const mainImage = prod.images && prod.images.length > 0
              ? typeof prod.images[0] === 'string'
                ? prod.images[0]
                : prod.images[0]?.src
              : ''
            return (
              <div
                key={prod.id}
                className="bg-white border border-gray-200 rounded-xl lg:rounded-lg p-3 lg:p-5 shadow-sm"
              >
                <div className="lg:hidden">
                  {mainImage && (
                    <img
                      src={mainImage}
                      alt={prod.name || 'Product Image'}
                      className="w-full h-48 object-cover rounded-lg mb-3"
                    />
                  )}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate">{prod.name}</div>
                      {prod.category && (
                        <div className="text-xs text-gray-500 mt-0.5">{prod.category}</div>
                      )}
                    </div>
                    {prod.inStock === false ? (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold shrink-0 ml-2">Out</span>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold shrink-0 ml-2">In Stock</span>
                    )}
                  </div>
                  {prod.description && (
                    <p className="text-xs text-gray-700 mb-3 line-clamp-2">{prod.description}</p>
                  )}
                  {prod.priceGroup?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {prod.priceGroup.slice(0, 3).map((p, i) => {
                        const sizeTypeLower = (p.sizeType || '').toLowerCase()
                        const isRoll = sizeTypeLower === 'roll' || sizeTypeLower === 'rolls'
                        const isSqft = sizeTypeLower === 'sqft' || sizeTypeLower === 'sq ft' || sizeTypeLower === 'square feet' || sizeTypeLower === 'sq.ft' || sizeTypeLower === 'sq. ft' || sizeTypeLower === 'square inch' || sizeTypeLower === 'square inches' || sizeTypeLower === 'sq inch' || sizeTypeLower === 'sq inches'
                        const bgColor = isRoll ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-green-50 border-green-200 text-green-700'
                        const label = isRoll ? 'Roll' : 'Sqft'
                        return (
                          <div key={i} className={`${bgColor} border rounded-lg px-2 py-1.5`}>
                            <div className="text-xs font-semibold">{label}</div>
                            <div className="text-xs font-bold">RM {Number(p.price || 0).toFixed(2)}</div>
                          </div>
                        )
                      })}
                      {prod.priceGroup.length > 3 && (
                        <div className="text-xs text-gray-500 self-center">+{prod.priceGroup.length - 3} more</div>
                      )}
                    </div>
                  )}
                  <button
                    className="text-xs text-blue-600 underline w-full text-left"
                    onClick={() => setExpandedProductId(isExpanded ? null : prod.id)}
                  >
                    {isExpanded ? 'Hide Details' : 'View Details'}
                  </button>
                </div>
                
                <div className="hidden lg:block">
                  <div className="flex gap-4 mb-4 pb-4 border-b border-gray-200">
                    {mainImage && (
                      <img
                        src={mainImage}
                        alt={prod.name || 'Product Image'}
                        className="w-40 h-40 object-cover rounded-lg shrink-0"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-lg font-bold text-gray-900 mb-1">{prod.name}</div>
                          {prod.category && (
                            <div className="text-sm text-gray-500">Category: {prod.category}</div>
                          )}
                        </div>
                        {prod.inStock === false ? (
                          <span className="px-3 py-1.5 bg-red-100 text-red-800 rounded-full text-xs font-semibold">Out of Stock</span>
                        ) : (
                          <span className="px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-xs font-semibold">In Stock</span>
                        )}
                      </div>
                      {prod.description && (
                        <div className="text-sm text-gray-700 mb-3 leading-relaxed">{prod.description}</div>
                      )}
                      {prod.priceGroup?.length > 0 && (
                        <div className="mt-3">
                          <div className="text-xs text-gray-500 font-semibold mb-2">Pricing</div>
                          <div className="flex flex-wrap gap-3">
                            {prod.priceGroup.map((p, i) => {
                              const sizeTypeLower = (p.sizeType || '').toLowerCase()
                              const isRoll = sizeTypeLower === 'roll' || sizeTypeLower === 'rolls'
                              const isSqft = sizeTypeLower === 'sqft' || sizeTypeLower === 'sq ft' || sizeTypeLower === 'square feet' || sizeTypeLower === 'sq.ft' || sizeTypeLower === 'sq. ft' || sizeTypeLower === 'square inch' || sizeTypeLower === 'square inches' || sizeTypeLower === 'sq inch' || sizeTypeLower === 'sq inches'
                              
                              let bgColor = 'bg-green-50'
                              let borderColor = 'border-green-200'
                              let textColor = 'text-green-700'
                              let label = 'Sqft'
                              
                              if (isRoll) {
                                bgColor = 'bg-blue-50'
                                borderColor = 'border-blue-200'
                                textColor = 'text-blue-700'
                                label = 'Roll'
                              } else if (isSqft) {
                                bgColor = 'bg-green-50'
                                borderColor = 'border-green-200'
                                textColor = 'text-green-700'
                                label = 'Sqft'
                              }
                              
                              return (
                                <div key={i} className={`${bgColor} border ${borderColor} rounded-lg px-3 py-2`}>
                                  <div className="text-xs text-gray-600">{label}</div>
                                  <div className={`text-sm font-bold ${textColor}`}>
                                    {p.measurement ? `${p.measurement} - ` : ''}RM {Number(p.price || 0).toFixed(2)}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <button
                      className="text-sm text-blue-600 hover:text-blue-800 font-semibold underline"
                      onClick={() => setExpandedProductId(isExpanded ? null : prod.id)}
                    >
                      {isExpanded ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                    {prod.priceGroup?.length > 0 && (
                      <div>
                        <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">Price Details</div>
                        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                          {prod.priceGroup.map((p, i) => (
                            <div key={i} className="bg-white border border-gray-200 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-sm font-medium text-gray-900">{p.measurement}</span>
                                  {p.sizeType && (
                                    <span className="text-xs text-gray-500 ml-2">({p.sizeType})</span>
                                  )}
                                </div>
                                <span className="text-sm font-bold text-blue-700">RM {Number(p.price || 0).toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {prod.features?.length > 0 && (
                      <div>
                        <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">Features</div>
                        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                          {prod.features.map((f, i) => (
                            <div key={i} className="bg-white border border-gray-200 rounded-lg p-3">
                              <div className="text-sm font-semibold text-gray-900 mb-1">{f.title}</div>
                              <div className="text-xs sm:text-sm text-gray-600">{f.description}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {prod.images?.length > 1 && (
                      <div>
                        <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">Additional Images</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {prod.images.slice(1).map((img, idx) => (
                            <img
                              key={idx}
                              src={typeof img === 'string' ? img : img.src}
                              alt={`Image ${idx + 1}`}
                              className="h-32 w-full object-cover rounded-lg border border-gray-200"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleEditProduct(prod.id)}
                    className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 text-sm font-semibold transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => confirmDelete(prod.id)}
                    className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 text-sm font-semibold transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">
                {editingProd ? 'Edit Product' : 'Add Product'}
              </h3>
                <button
                  onClick={resetModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-4 overflow-y-auto flex-1 space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Basic Information</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Name</label>
              <input
                type="text"
                        placeholder="Enter product name"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900 placeholder-gray-400"
              />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
              <input
                type="text"
                        placeholder="Enter category"
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900 placeholder-gray-400"
              />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea
                        placeholder="Enter product description"
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900 placeholder-gray-400 resize-none"
                        rows={4}
              />
                    </div>
                  </div>
                </div>

                {/* Images Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Images (max 3)</h4>
                    {newProduct.images.length < 3 && (
                      <button
                        onClick={() =>
                          setNewProduct({ ...newProduct, images: [...(newProduct.images || []), { src: '' }] })
                        }
                        className="text-sm text-gray-900 hover:text-gray-700 font-medium"
                      >
                        + Add Image
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                {newProduct.images.map((img, i) => (
                      <div key={i} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-1 space-y-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">Image URL or Base64</label>
                    <input
                      type="text"
                              placeholder="Enter image URL or paste Base64"
                      value={img.src || ''}
                      onChange={(e) => updateImage(i, 'src', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm text-gray-900 placeholder-gray-400"
                    />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">Upload File</label>
                            <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, i)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                id={`file-upload-${i}`}
                              />
                              <label
                                htmlFor={`file-upload-${i}`}
                                className="block px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-center"
                              >
                                Choose File
                              </label>
                            </div>
                          </div>
                        </div>
                    <button
                      onClick={() => {
                        const filtered = newProduct.images.filter((_, idx) => idx !== i)
                        setNewProduct((prev) => ({ ...prev, images: filtered }))
                      }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-6"
                          aria-label="Remove image"
                    >
                          <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
                    {newProduct.images.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No images added yet</p>
                    )}
                  </div>
                </div>

                {/* Features Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Features</h4>
                  <button
                    onClick={() =>
                        setNewProduct({ ...newProduct, features: [...(newProduct.features || []), { title: '', description: '' }] })
                    }
                      className="text-sm text-gray-900 hover:text-gray-700 font-medium"
                  >
                      + Add Feature
                  </button>
              </div>
                  <div className="space-y-3">
                {newProduct.features.map((f, i) => (
                      <div key={i} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-1 space-y-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">Feature Title</label>
                    <input
                      type="text"
                              placeholder="e.g., Low Maintenance"
                      value={f.title || ''}
                      onChange={(e) => updateFeature(i, 'title', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm text-gray-900 placeholder-gray-400"
                    />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">Feature Description</label>
                    <input
                      type="text"
                              placeholder="e.g., Grows well with minimal mowing"
                      value={f.description || ''}
                      onChange={(e) => updateFeature(i, 'description', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm text-gray-900 placeholder-gray-400"
                    />
                          </div>
                        </div>
                    <button
                      onClick={() => {
                        const filtered = newProduct.features.filter((_, idx) => idx !== i)
                        setNewProduct((prev) => ({ ...prev, features: filtered }))
                      }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-6"
                          aria-label="Remove feature"
                    >
                          <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
                    {newProduct.features.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No features added yet</p>
                    )}
                  </div>
                </div>

                {/* Price Details Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Price Details</h4>
                <button
                  onClick={() =>
                        setNewProduct({ ...newProduct, priceGroup: [...(newProduct.priceGroup || []), { measurement: '', price: '', sizeType: '' }] })
                  }
                      className="text-sm text-gray-900 hover:text-gray-700 font-medium"
                >
                      + Add Price
                </button>
              </div>
                  <div className="space-y-3">
                {newProduct.priceGroup.map((p, i) => (
                      <div key={i} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-1 grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">Measurement</label>
                    <input
                      type="text"
                              placeholder="e.g., 1ft x 1ft"
                      value={p.measurement || ''}
                      onChange={(e) => updatePriceDetail(i, 'measurement', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm text-gray-900 placeholder-gray-400"
                    />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">Size Type</label>
                    <input
                      type="text"
                              placeholder="e.g., roll, sqft"
                      value={p.sizeType || ''}
                      onChange={(e) => updatePriceDetail(i, 'sizeType', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm text-gray-900 placeholder-gray-400"
                    />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">Price (RM)</label>
                    <input
                      type="number"
                              placeholder="e.g., 4.5"
                      value={p.price || ''}
                      onChange={(e) => updatePriceDetail(i, 'price', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm text-gray-900 placeholder-gray-400"
                      min="0"
                      step="0.01"
                    />
                          </div>
                        </div>
                    <button
                      onClick={() => {
                        const filtered = newProduct.priceGroup.filter((_, idx) => idx !== i)
                        setNewProduct((prev) => ({ ...prev, priceGroup: filtered }))
                      }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-6"
                          aria-label="Remove price"
                    >
                          <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
                    {newProduct.priceGroup.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No price details added yet</p>
                    )}
              </div>
                </div>

                {/* In Stock Checkbox */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  checked={newProduct.inStock}
                  onChange={(e) => setNewProduct({ ...newProduct, inStock: e.target.checked })}
                  id="inStockCheckbox"
                    className="h-4 w-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                />
                  <label htmlFor="inStockCheckbox" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Product is in stock
                </label>
              </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={resetModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddOrSave}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  {editingProd ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </div>
          </div>
        )}
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
    </div>
  )
}

