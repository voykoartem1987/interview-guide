import { Outlet, Link, useLocation } from 'react-router-dom'

export default function Layout() {
  const loc = useLocation()
  const isInterview = loc.pathname.includes('/interview/')

  return (
    <div className="min-h-screen flex flex-col">
      {!isInterview && (
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-5 no-print">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-base tracking-tight text-slate-900">
            <span className="w-7 h-7 rounded-lg bg-[#E84B2A] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">F</span>
            Interview Guide
          </Link>
          <nav className="flex items-center gap-1">
            <Link to="/knowledge" className="px-3 py-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg text-sm transition-colors">База знаний</Link>
            <Link to="/compare" className="px-3 py-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg text-sm transition-colors">Сравнение</Link>
            <Link to="/custom-questions" className="px-3 py-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg text-sm transition-colors">Мои вопросы</Link>
          </nav>
          <span className="text-slate-400 text-xs ml-auto">Таргетолог / Контекстолог</span>
        </header>
      )}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
