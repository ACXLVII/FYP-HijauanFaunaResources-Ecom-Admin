'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { XMarkIcon, Bars3Icon } from '@heroicons/react/24/outline';

const backgroundImages = [
  'https://images.landscapingnetwork.com/pictures/images/973x490Exact_0x84/site_8/backyard-lawn-grass-hillside-aloha-landscape_5606.JPG',
  'https://www.opulandscape.com/wp-content/uploads/2023/12/winter-landscaping-scaled.jpg',
  'https://www.lawnpop.com/wp-content/uploads/2024/04/5-creative-ways-to-use-artificial-grass-in-your-landscape.jpg',
];

export default function Header() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % backgroundImages.length);
    }, 5000);
    return () => clearInterval(intervalId);
  }, []);

  const handleSignInClick = () => {
    router.push('/login');
    setMenuOpen(false);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Background slideshow */}
      <div className="absolute inset-0 z-0">
        {backgroundImages.map((src, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === currentImageIndex ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              backgroundImage: `url('${src}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Content */}
      <header className="relative z-10 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 md:px-12">
        <button
          onClick={() => router.push('/')}
          aria-label="Go to homepage"
          className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 rounded"
        >
          <img src="/logo.png" alt="Logo" className="h-16 sm:h-20 w-auto cursor-pointer" />
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8 text-white">
          <a
            href="tel:+1234567890"
            className="text-sm font-medium hover:text-green-400 transition"
          >
            Contact
          </a>
          <button
            onClick={handleSignInClick}
            type="button"
            className="rounded-md bg-yellow-500 px-5 py-2 text-sm font-bold text-black shadow-md hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition"
          >
            Sign In
          </button>
        </nav>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded p-2 z-20"
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <XMarkIcon className="h-7 w-7" />
          ) : (
            <Bars3Icon className="h-7 w-7" />
          )}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div 
          className="md:hidden fixed inset-0 z-30 bg-gray-900 bg-opacity-75"
          onClick={() => setMenuOpen(false)}
        >
          <div 
            className="absolute right-0 top-0 h-full w-64 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
                <img src="/logo.png" alt="Logo" className="h-12 w-auto" />
                <button
                  onClick={() => setMenuOpen(false)}
                  className="text-gray-400 hover:text-gray-700 transition p-2"
                  aria-label="Close menu"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <nav className="flex-1 px-4 py-6">
                <div className="flex flex-col space-y-4">
                  <a
                    href="tel:+1234567890"
                    onClick={() => setMenuOpen(false)}
                    className="text-gray-700 hover:text-green-600 font-medium transition py-2"
                  >
                    Contact
                  </a>
                  <button
                    onClick={handleSignInClick}
                    type="button"
                    className="w-full text-left rounded-md bg-yellow-500 px-5 py-2.5 text-sm font-bold text-black shadow-md hover:bg-yellow-400 transition"
                  >
                    Sign In
                  </button>
                </div>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Adjusted to not be blocked by header */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-20 sm:pt-24 md:pt-0 h-[calc(100vh-5rem)] sm:h-[calc(100vh-6rem)] md:h-[calc(100vh-7rem)]">
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold leading-tight text-white drop-shadow-lg mb-2">
          Welcome to
        </h1>
        <h2 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-yellow-400 drop-shadow-lg">
          Hijauan Fauna Resources
        </h2>
      </main>
    </div>
  );
}
