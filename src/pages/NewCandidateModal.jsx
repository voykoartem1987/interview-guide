import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'
import { LEVEL_LABELS } from '../data/questions'

const ACCEPT = '.pdf,.docx,.txt'

function extractName(lines) {
  for (const line of lines.slice(0, 12)) {
    const clean = line.trim()
    if (!clean) continue
    const words = clean.split(/\s+/)
    if (words.length < 2 || words.length > 4) continue
    const namePattern = /^[А-ЯЁІЇЄA-Z][а-яёіїєa-zA-ZА-ЯЁІЇЄЬъ''-]{1,}$/
    if (words.every(w => namePattern.test(w))) return clean
  }
  return ''
}

async function parseResume(file) {
  const ext = file.name.split('.').pop().toLowerCase()

  if (ext === 'txt') {
    return file.text()
  }

  if (ext === 'docx') {
    const mammoth = await import('mammoth')
    const ab = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer: ab })
    return result.value
  }

  if (ext === 'pdf') {
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
    const ab = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: ab }).promise
    const page = await pdf.getPage(1)
    const content = await page.getTextContent()
    const byY = {}
    for (const item of content.items) {
      if (!item.str?.trim()) continue
      const y = Math.round(item.transform[5])
      byY[y] = (byY[y] || '') + item.str + ' '
    }
    return Object.entries(byY)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([, v]) => v.trim())
      .join('\n')
  }

  return ''
}

async function callClaude(apiKey, resumeText) {
  const prompt = `На основе резюме кандидата на позицию таргетолог/контекстолог сгенерируй 4-5 технических вопросов для собеседования, специфических для опыта и инструментов этого кандидата. К каждому вопросу дай эталонный ответ (2-3 предложения).\n\nРезюме:\n${resumeText.slice(0, 3000)}\n\nВерни ТОЛЬКО JSON массив, без пояснений:\n[\n  {"q": "вопрос", "a": "эталонный ответ", "theme": "тема (например: Facebook Ads, Google Ads, Аналитика, Стратегия)"},\n  ...\n]`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-allow-browser': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `HTTP ${res.status}`)
  }

  const data = await res.json()
  const text = data.content?.[0]?.text || ''
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('Не удалось распарсить ответ')
  return JSON.parse(match[0])
}

export default function NewCandidateModal({ onClose }) {
  const addCandidate = useStore(s => s.addCandidate)
  const addCustomQuestion = useStore(s => s.addCustomQuestion)
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', position: 'Таргетолог / Контекстолог', targetGrade: 'middle', notes: '' })
  const [parsing, setParsing] = useState(false)
  const [autoFilled, setAutoFilled] = useState(false)
  const [parseError, setParseError] = useState(false)
  const [resumeText, setResumeText] = useState('')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('anthropic_api_key') || '')
  const [keyInput, setKeyInput] = useState('')
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [aiStatus, setAiStatus] = useState(null)
  const [aiError, setAiError] = useState('')
  const [aiCount, setAiCount] = useState(0)
  const fileRef = useRef()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const saveKey = () => {
    const key = keyInput.trim()
    if (!key) return
    localStorage.setItem('anthropic_api_key', key)
    setApiKey(key)
    setKeyInput('')
    setShowKeyInput(false)
  }

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setParsing(true)
    setParseError(false)
    setResumeText('')
    setAiStatus(null)
    try {
      const text = await parseResume(file)
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
      const name = extractName(lines)
      if (name) {
        set('name', name)
        setAutoFilled(true)
      }
      if (!form.notes) set('notes', `Резюме: ${file.name}`)
      setResumeText(text)
    } catch (err) {
      console.error('Resume parse error:', err)
      setParseError(true)
    }
    setParsing(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleGenerate = async () => {
    if (!apiKey || !resumeText) return
    setAiStatus('loading')
    setAiError('')
    try {
      const questions = await callClaude(apiKey, resumeText)
      questions.forEach(q => addCustomQuestion({ q: q.q, a: q.a, theme: q.theme || 'AI вопросы' }))
      setAiCount(questions.length)
      setAiStatus('done')
    } catch (err) {
      setAiError(err.message)
      setAiStatus('error')
    }
  }

  const submit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    const id = addCandidate(form)
    onClose()
    navigate(`/candidates/${id}`)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-md overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Новый кандидат</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={handleFile} />
        <button
          type="button"
          disabled={parsing}
          onClick={() => fileRef.current?.click()}
          className="w-full mb-4 py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm hover:border-indigo-300 transition-colors flex flex-col items-center justify-center gap-1 disabled:opacity-60"
        >
          {parsing ? (
            <span className="text-indigo-500 flex items-center gap-2">
              <span className="inline-block animate-spin">↻</span> Читаю резюме...
            </span>
          ) : parseError ? (
            <span className="text-red-500">Не удалось прочитать файл — попробуй другой формат</span>
          ) : resumeText ? (
            <span className="text-green-600 font-medium">✓ Резюме загружено — нажми чтобы заменить</span>
          ) : (
            <>
              <span className="text-slate-500 font-medium">📄 Загрузить резюме</span>
              <span className="text-slate-400 text-xs">PDF, DOCX, TXT — имя определится автоматически</span>
            </>
          )}
        </button>

        {resumeText && (
          <div className="mb-4 p-3.5 bg-violet-50 rounded-xl border border-violet-100">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-sm font-semibold text-violet-800">✨ Claude AI</span>
              <span className="text-xs text-violet-500">— индивидуальные вопросы по резюме</span>
            </div>

            {!apiKey || showKeyInput ? (
              <div className="space-y-2">
                <input
                  className="input text-sm"
                  placeholder="sk-ant-api03-..."
                  value={keyInput}
                  onChange={e => setKeyInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveKey()}
                />
                <div className="flex gap-2">
                  <button type="button" onClick={saveKey} disabled={!keyInput.trim()} className="btn-primary flex-1 text-sm disabled:opacity-40">Сохранить ключ</button>
                  {apiKey && <button type="button" onClick={() => setShowKeyInput(false)} className="btn-ghost text-sm">Отмена</button>}
                </div>
                <p className="text-xs text-violet-400">Ключ хранится только в localStorage вашего браузера</p>
              </div>
            ) : aiStatus === 'loading' ? (
              <span className="text-violet-700 text-sm flex items-center gap-2">
                <span className="inline-block animate-spin">↻</span> Анализирую резюме...
              </span>
            ) : aiStatus === 'done' ? (
              <span className="text-green-700 text-sm font-medium">✓ {aiCount} вопросов добавлено в "Мои вопросы"</span>
            ) : (
              <div className="space-y-1.5">
                {aiStatus === 'error' && (
                  <p className="text-xs text-red-500">{aiError || 'Ошибка — проверь API ключ'}</p>
                )}
                <div className="flex items-center gap-2">
                  <button type="button" onClick={handleGenerate} className="btn-primary flex-1 text-sm">
                    {aiStatus === 'error' ? 'Повторить' : 'Сгенерировать вопросы'}
                  </button>
                  <button type="button" onClick={() => { setShowKeyInput(true); setKeyInput('') }} className="text-xs text-slate-400 hover:text-slate-600 underline whitespace-nowrap">сменить ключ</button>
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">Имя</label>
              {autoFilled && <span className="text-xs text-green-600 font-medium">✓ из резюме</span>}
            </div>
            <input
              className="input"
              placeholder="Иван Петренко"
              value={form.name}
              onChange={e => { set('name', e.target.value); setAutoFilled(false) }}
              autoFocus
            />
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
