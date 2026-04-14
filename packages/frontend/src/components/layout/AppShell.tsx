import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Sidebar } from './Sidebar'
import type { User } from '../../api/client'

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('lc_user')
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export const AppShell: React.FC = () => {
  const user = getStoredUser()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar user={user} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative">
            <Sidebar user={user} />
            <button
              className="absolute top-4 right-4 text-white"
              onClick={() => setMobileOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        {/* Top bar (mobile only) */}
        <header className="md:hidden bg-[#1e3a5f] text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
          <button onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-sm">LC Copilot</span>
          <div className="ml-auto text-xs text-blue-200">{user.name}</div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
