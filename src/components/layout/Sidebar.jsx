import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  CreditCard,
  ListChecks,
  FileText,
  PiggyBank,
  Heart,
  CalendarDays,
  LogOut,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

const navItems = [
  { to: '/',            icon: LayoutDashboard, label: 'Painel'           },
  { to: '/lancamentos', icon: ListChecks,       label: 'Lançamentos'      },
  { to: '/cartoes',     icon: CreditCard,       label: 'Cartões'          },
  { to: '/fechamento',  icon: FileText,         label: 'Fechamento', adminOnly: true },
  { to: '/caixinhas',   icon: PiggyBank,        label: 'Caixinhas'        },
  { to: '/desejos',     icon: Heart,            label: 'Lista de Desejos' },
  { to: '/agenda',      icon: CalendarDays,     label: 'Agenda'           },
]

export function Sidebar() {
  const { profile, isAdmin } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin)

  return (
    <aside className="hidden md:flex flex-col w-[72px] min-h-screen shrink-0"
      style={{ backgroundColor: 'hsl(var(--sidebar-bg))' }}>
      {/* Logo */}
      <div className="flex items-center justify-center h-[64px] shrink-0">
        <div className="h-9 w-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: 'hsl(var(--primary))' }}>
          <span className="text-white font-bold text-sm">FF</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col flex-1 items-center gap-1 px-2 py-2">
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={label}
            className={({ isActive }) =>
              cn(
                'relative flex items-center justify-center h-10 w-10 rounded-xl transition-all group',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/40 hover:bg-white/10 hover:text-white/80'
              )
            }
          >
            <Icon className="h-5 w-5" />
            {/* Tooltip */}
            <span className="absolute left-full ml-3 px-2 py-1 rounded-md text-xs font-medium bg-gray-900 text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
              {label}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom: avatar + logout */}
      <div className="flex flex-col items-center gap-2 pb-4 px-2">
        <button
          onClick={handleLogout}
          title="Sair"
          className="flex items-center justify-center h-10 w-10 rounded-xl text-white/40 hover:bg-white/10 hover:text-white/80 transition-all"
        >
          <LogOut className="h-5 w-5" />
        </button>
        {/* Avatar */}
        <div
          title={profile?.full_name ?? 'Usuário'}
          className="h-9 w-9 rounded-full flex items-center justify-center text-white font-semibold text-xs shrink-0 cursor-default"
          style={{ backgroundColor: 'hsl(var(--primary))' }}
        >
          {initials}
        </div>
      </div>
    </aside>
  )
}
