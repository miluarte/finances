import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar — desktop only */}
      <Sidebar />

      {/* Main area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-2 border-b bg-white px-4 py-3 shrink-0 shadow-sm">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'hsl(var(--primary))' }}>
            <span className="text-white font-bold text-xs">FF</span>
          </div>
          <span className="font-semibold text-sm">FamilyFinance</span>
        </header>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 pb-24 md:pb-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <BottomNav />
    </div>
  )
}
