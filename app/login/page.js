'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

export default function LoginPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const isValidEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Please fill out both fields.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (err) {
      switch (err.code) {
        case "auth/user-not-found":
          setError("No user found with this email.");
          break;
        case "auth/wrong-password":
          setError("Incorrect password.");
          break;
        case "auth/invalid-email":
          setError("Invalid email address.");
          break;
        default:
          setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-green-50 px-6 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-lg border border-gray-200 p-10">
        <div className="flex flex-col items-center mb-8">
          <img
            src="/logo.png"
            alt="Your Company"
            className="h-24 w-auto mb-4"
          />
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight text-center">
            Sign In
          </h2>
        </div>

        {error && (
          <div className="mb-6 text-center text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-gray-900"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-2 block w-full rounded-xl border-2 border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-600 focus:ring-2 focus:ring-indigo-400 focus:outline-none sm:text-sm transition"
              aria-invalid={error ? "true" : "false"}
              disabled={loading}
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-gray-900"
              >
                Password
              </label>
              <a
                href="#"
                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
              >
                Forgot password?
              </a>
            </div>
            <div className="relative mt-2">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="block w-full rounded-xl border-2 border-gray-300 px-4 py-3 pr-12 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-600 focus:ring-2 focus:ring-indigo-400 focus:outline-none sm:text-sm transition"
                aria-invalid={error ? "true" : "false"}
                disabled={loading}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-indigo-600 transition"
                tabIndex={-1}
                disabled={loading}
              >
                <img
                  src={showPassword ? "/visible.svg" : "/hidepass.svg"}
                  alt=""
                  className="h-5 w-5"
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="w-full rounded-xl bg-indigo-600 py-3 text-white font-semibold text-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
