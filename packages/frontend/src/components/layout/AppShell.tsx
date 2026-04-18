import React, { useState } from 'react'
import { Outlet, useLocation, useMatches } from 'react-router-dom'
import { Menu, X, ChevronRight } from 'lucide-react'
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

// ─── Breadcrumb config ────────────────────────────────────────────────────────

interface BreadcrumbSegment { label: string; href?: string }

function useBreadcrumbs(): BreadcrumbSegment[] {
  const location = useLocation()
  const path = location.pathname

  if (path === '/dashboard') return [{ label: 'Dashboard' }]
  if (path === '/lc/new') return [{ label: 'Dashboard', href: '/dashboard' }, { label: 'New LC Review' }]
  if (path.match(/^\/lc\/[^/]+\/review$/)) return [{ label: 'Dashboard', href: '/dashboard' }, { label: 'Clause Review' }]
  if (path.match(/^\/lc\/[^/]+\/report$/)) return [{ label: 'Dashboard', href: '/dashboard' }, { label: 'Scrutiny Report' }]
  if (path === '/compliance') return [{ label: 'Dashboard', href: '/dashboard' }, { label: 'Compliance Dashboard' }]

  return [{ label: 'Dashboard' }]
}

function pageTitle(pathname: string): string {
  if (pathname === '/dashboard') return 'Dashboard'
  if (pathname === '/lc/new') return 'New LC Review'
  if (pathname.includes('/review')) return 'Clause Review'
  if (pathname.includes('/report')) return 'Scrutiny Report'
  if (pathname === '/compliance') return 'Compliance Dashboard'
  return 'LC Copilot'
}

export const AppShell: React.FC = () => {
  const user = getStoredUser()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const breadcrumbs = useBreadcrumbs()
  const title = pageTitle(location.pathname)

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ── Desktop sidebar ───────────────────────────────────────────────── */}
      <div className="hidden md:block">
        <Sidebar user={user} />
      </div>

      {/* ── Mobile sidebar overlay ────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative">
            <Sidebar user={user} />
            <button
              className="absolute top-4 right-4 text-white bg-white/20 rounded-lg p-1.5 hover:bg-white/30 transition-colors"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">

        {/* Desktop top header */}
        <header className="hidden md:flex items-center justify-between bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-30">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5" aria-label="Breadcrumb">
            {breadcrumbs.map((seg, i) => (
              <React.Fragment key={seg.label}>
                {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                {seg.href ? (
                  <a
                    href={seg.href}
                    className="text-sm text-gray-500 hover:text-[#1e3a5f] transition-colors"
                  >
                    {seg.label}
                  </a>
                ) : (
                  <span className="text-sm font-semibold text-gray-800">{seg.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* Right side: user info */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{user.email}</span>
            <div className="w-7 h-7 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-xs font-bold">
              {user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
          </div>
        </header>

        {/* Mobile top bar */}
        <header className="md:hidden bg-[#1e3a5f] text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-sm">{title}</span>
          <div className="ml-auto text-xs text-blue-200">{user.name}</div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
