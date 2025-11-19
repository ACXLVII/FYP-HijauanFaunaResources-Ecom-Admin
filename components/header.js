'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { XMarkIcon } from '@heroicons/react/24/outline';

const backgroundImages = [
  'https://images.landscapingnetwork.com/pictures/images/973x490Exact_0x84/site_8/backyard-lawn-grass-hillside-aloha-landscape_5606.JPG',
  'https://www.opulandscape.com/wp-content/uploads/2023/12/winter-landscaping-scaled.jpg',
  'https://www.lawnpop.com/wp-content/uploads/2024/04/5-creative-ways-to-use-artificial-grass-in-your-landscape.jpg',
];

export default function Header() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % backgroundImages.length);
    }, 5000);
    return () => clearInterval(intervalId);
  }, []);

  const handleSignInClick = () => {
    router.push('/login');
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
        {/* Overlay removed */}
      </div>

      {/* Content */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12">
        <button
          onClick={() => router.push('/')}
          aria-label="Go to homepage"
          className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 rounded"
        >
          <img src="/logo.png" alt="Logo" className="h-20 w-auto cursor-pointer" />
        </button>

        <nav className="flex items-center space-x-8 text-white">
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

        <button
          type="button"
          onClick={() => {}}
          className="md:hidden text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 rounded"
          aria-label="Toggle menu"
        >
          <XMarkIcon className="h-8 w-8" />
        </button>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center text-center h-[calc(100vh-7rem)] md:h-[calc(100vh-7rem)] px-6">
        <h1 className="text-4xl md:text-6xl font-bold leading-tight text-white drop-shadow-lg mb-2">
          Welcome to
        </h1>
        <h2 className="text-5xl md:text-7xl font-extrabold text-yellow-400 drop-shadow-lg">
          Hijauan Fauna Resources
        </h2>
      </main>
    </div>
  );
}
