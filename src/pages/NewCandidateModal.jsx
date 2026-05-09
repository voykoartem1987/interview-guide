import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'
import { LEVEL_LABELS } from '../data/questions'

export default function NewCandidateModal({ onClose }) {
  const addCandidate = useStore(s => s.addCandidate)
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', position: 'Таргетолог / Контекстолог', targetGrade: 'middle', notes: '' })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    const id = addCandidate(form)
    onClose()
    navigate(`/candidates/${id}`)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Новый кандидат</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Имя</label>
            <input className="input" placeholder="Иван Петренко" value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">Должность</label>
            <input className="input" placeholder="Таргетолог / Контекстолог" value={form.position} onChange={e => set('position', e.target.value)} />
          </div>
          <div>
            <label className="label">Целевой грейд</label>
            <div className="flex gap-2">
              {Object.entries(LEVEL_LABELS).map(([k, v]) => (
                <button type="button" key={k} onClick={() => set('targetGrade', k)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${form.targetGrade === k ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Заметки</label>
            <textarea className="input resize-none" rows={2} placeholder="Ссылка на резюме, комментарии..." value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" className="btn-ghost flex-1" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn-primary flex-1">Создать</button>
          </div>
        </form>
      </div>
    </div>
  )
}
