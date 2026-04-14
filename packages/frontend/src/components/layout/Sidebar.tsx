import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Plus, Shield, LogOut } from 'lucide-react'
import { UserRole } from '@lc-copilot/shared'
import type { User } from '../../api/client'

interface SidebarProps {
  user: User
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const roleLabelMap: Record<UserRole, string> = {
  [UserRole.TRADE_RM]: 'Trade RM',
  [UserRole.COMPLIANCE_OFFICER]: 'Compliance',
  [UserRole.ADMIN]: 'Admin',
}

export const Sidebar: React.FC<SidebarProps> = ({ user }) => {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('lc_token')
    localStorage.removeItem('lc_user')
    navigate('/login')
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-white/20 text-white'
        : 'text-blue-100 hover:bg-white/10 hover:text-white'
    }`

  const canViewCompliance =
    user.role === UserRole.COMPLIANCE_OFFICER || user.role === UserRole.ADMIN

  return (
    <aside className="fixed top-0 left-0 h-full w-60 bg-[#1e3a5f] flex flex-col z-40 select-none">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-400 rounded flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#1e3a5f]" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">LC Copilot</p>
            <p className="text-blue-300 text-xs">Negotiation AI</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <NavLink to="/dashboard" className={navLinkClass}>
          <Home className="w-4 h-4 flex-shrink-0" />
          Dashboard
        </NavLink>
        <NavLink to="/lc/new" className={navLinkClass}>
          <Plus className="w-4 h-4 flex-shrink-0" />
          New LC Review
        </NavLink>
        {canViewCompliance && (
          <NavLink to="/compliance" className={navLinkClass}>
            <Shield className="w-4 h-4 flex-shrink-0" />
            Compliance
          </NavLink>
        )}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-amber-400 flex items-center justify-center text-[#1e3a5f] font-bold text-sm flex-shrink-0">
            {getInitials(user.name)}
          </div>
          <div className="overflow-hidden">
            <p className="text-white text-sm font-medium truncate">{user.name}</p>
            <span className="inline-block text-xs bg-blue-700 text-blue-200 rounded px-1.5 py-0.5 mt-0.5">
              {roleLabelMap[user.role] ?? user.role}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg text-sm transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
