"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  
  const VALID_USERNAME = "admin";
  const VALID_PASSWORD = "admin123";

  
  useEffect(() => {
    try {
      const isAuthed = sessionStorage.getItem("isAdminAuthenticated") === "true";
      if (isAuthed) {
        router.replace("/admin-dashboard");
      }
    } catch {
      
    }
    
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      if (username === VALID_USERNAME && password === VALID_PASSWORD) {
        try {
          sessionStorage.setItem("isAdminAuthenticated", "true");
        } catch {}
        router.push("/admin-dashboard");
      } else {
        setError("Invalid credentials. Try username: admin and password: admin123");
      }
    }, 400);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 text-black">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-4">Admin Sign In</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400"
            autoComplete="username"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400"
            autoComplete="current-password"
          />

          {error && <div className="text-sm text-red-600">{error}</div>}

          <button
            type="submit"
            className={`w-full py-2 text-white rounded-md shadow ${loading ? "bg-purple-400" : "bg-purple-600 hover:bg-purple-700"}`}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
