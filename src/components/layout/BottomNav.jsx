import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ListChecks,
  CreditCard,
  PiggyBank,
  Heart,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Bottom nav mostra apenas as 5 abas mais usadas no mobile
const mobileNav = [
  { to: '/',            icon: LayoutDashboard, label: 'Painel'     },
  { to: '/lancamentos', icon: ListChecks,      label: 'Lançamentos'},
  { to: '/cartoes',     icon: CreditCard,      label: 'Cartões'    },
  { to: '/caixinhas',   icon: PiggyBank,       label: 'Caixinhas'  },
  { to: '/desejos',     icon: Heart,           label: 'Desejos'    },
]

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-stretch">
        {mobileNav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-1 text-xs transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span className="leading-none">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
