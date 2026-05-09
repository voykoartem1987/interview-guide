import { useState } from 'react'
import { Link } from 'react-router-dom'
import useStore from '../store/useStore'

function QuestionCard({ q, onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="card p-5">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {q.theme && <div className="text-xs text-violet-600 font-medium mb-1">{q.theme}</div>}
          <button className="w-full text-left flex items-start gap-2 group" onClick={() => setOpen(o => !o)}>
            <span className="text-slate-300 group-hover:text-indigo-400 text-sm mt-0.5 flex-shrink-0">{open ? '▾' : '▸'}</span>
            <span className="text-sm font-medium text-slate-800 leading-snug">{q.q}</span>
          </button>
          {open && (
            <div className="mt-2 ml-5 p-3 bg-indigo-50 border-l-4 border-indigo-300 rounded-r-lg text-sm text-slate-700 leading-relaxed">
              {q.a}
            </div>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => onEdit(q)} className="text-xs text-slate-400 hover:text-indigo-600 px-2 py-1 rounded hover:bg-slate-50 transition-colors">Изм.</button>
          <button onClick={() => onDelete(q.id)} className="text-xs text-slate-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 transition-colors">×</button>
        </div>
      </div>
    </div>
  )
}

const EMPTY = { q: '', a: '', theme: '' }

export default function CustomQuestions() {
  const { customQuestions, addCustomQuestion, updateCustomQuestion, deleteCustomQuestion } = useStore()
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setE = (k, v) => setEditing(e => ({ ...e, [k]: v }))

  const handleAdd = () => {
    if (!form.q.trim() || !form.a.trim()) return
    addCustomQuestion(form)
    setForm(EMPTY)
  }

  const handleSaveEdit = () => {
    if (!editing.q.trim() || !editing.a.trim()) return
    updateCustomQuestion(editing.id, { q: editing.q, a: editing.a, theme: editing.theme })
    setEditing(null)
  }

  const themes = [...new Set(customQuestions.map(q => q.theme).filter(Boolean))]

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="text-slate-400 hover:text-slate-600 text-sm">← Кандидаты</Link>
        <h1 className="text-2xl font-bold text-slate-900">Мои вопросы</h1>
        <span className="text-slate-400 text-sm ml-auto">{customQuestions.length} вопросов</span>
      </div>

      <div className="card p-5 mb-6">
        <h3 className="font-semibold mb-4">Добавить вопрос</h3>
        <div className="space-y-3">
          <div>
            <label className="label">Вопрос</label>
            <textarea className="input resize-none" rows={2} placeholder="Текст вопроса..."
              value={form.q} onChange={e => setF('q', e.target.value)} />
          </div>
          <div>
            <label className="label">Эталонный ответ</label>
            <textarea className="input resize-none" rows={3} placeholder="Что должен знать кандидат..."
              value={form.a} onChange={e => setF('a', e.target.value)} />
          </div>
          <div>
            <label className="label">Тема (необязательно)</label>
            <input className="input" placeholder="Например: Ретаргетинг" list="themes-list"
              value={form.theme} onChange={e => setF('theme', e.target.value)} />
            <datalist id="themes-list">
              {themes.map(t => <option key={t} value={t} />)}
            </datalist>
          </div>
          <button className="btn-primary" disabled={!form.q.trim() || !form.a.trim()} onClick={handleAdd}>
            + Добавить
          </button>
        </div>
      </div>

      {customQuestions.length === 0 && (
        <div className="card p-12 text-center text-slate-400">
          <div className="text-3xl mb-3">📝</div>
          <p className="text-sm">Вопросов пока нет. Добавьте первый!</p>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-lg">
            <h3 className="font-bold mb-4">Редактировать вопрос</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Вопрос</label>
                <textarea className="input resize-none" rows={2} value={editing.q}
                  onChange={e => setE('q', e.target.value)} />
              </div>
              <div>
                <label className="label">Эталонный ответ</label>
                <textarea className="input resize-none" rows={3} value={editing.a}
                  onChange={e => setE('a', e.target.value)} />
              </div>
              <div>
                <label className="label">Тема</label>
                <input className="input" value={editing.theme} onChange={e => setE('theme', e.target.value)} />
              </div>
              <div className="flex gap-2 pt-1">
                <button className="btn-ghost flex-1" onClick={() => setEditing(null)}>Отмена</button>
                <button className="btn-primary flex-1" onClick={handleSaveEdit}
                  disabled={!editing.q.trim() || !editing.a.trim()}>Сохранить</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {customQuestions.map(q => (
          <QuestionCard key={q.id} q={q}
            onEdit={setEditing}
            onDelete={id => { if (confirm('Удалить вопрос?')) deleteCustomQuestion(id) }}
          />
        ))}
      </div>
    </div>
  )
}
