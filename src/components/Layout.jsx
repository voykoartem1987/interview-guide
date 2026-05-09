import { Outlet, Link, useLocation } from 'react-router-dom'

export default function Layout() {
  const loc = useLocation()
  const isInterview = loc.pathname.includes('/interview/')

  return (
    <div className="min-h-screen flex flex-col">
      {!isInterview && (
        <header className="bg-slate-900 text-white px-6 py-3 flex items-center gap-4 no-print">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <span className="text-indigo-400">⬡</span> Interview Guide
          </Link>
          <Link to="/knowledge" className="text-slate-400 hover:text-white text-sm transition-colors">База знаний</Link>
          <Link to="/compare" className="text-slate-400 hover:text-white text-sm transition-colors">Сравнение</Link>
          <Link to="/custom-questions" className="text-slate-400 hover:text-white text-sm transition-colors">Мои вопросы</Link>
          <span className="text-slate-600 text-xs ml-auto">Таргетолог / Контекстолог</span>
        </header>
      )}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
