import { useMemo, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import useStore, { SCORE_META } from '../store/useStore'
import { QUESTIONS, LEVEL_LABELS } from '../data/questions'

const CF_WORKER = 'https://delicate-firefly-bb32.voykoartem1987.workers.dev'

async function parseTranscription(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  if (ext === 'txt') return file.text()
  if (ext === 'docx') {
    const mammoth = await import('mammoth')
    const ab = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer: ab })
    return result.value
  }
  return ''
}

function ScoreBar({ pct, color }) {
  const bg = pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-slate-100 rounded-full h-3">
        <div className={`${bg} h-3 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`w-12 text-right text-sm font-bold ${pct >= 75 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{pct}%</span>
    </div>
  )
}

const REC_META = {
  hire:   { label: 'Рекомендуем нанять',  cls: 'bg-green-50 border-green-200 text-green-800', icon: '✓' },
  maybe:  { label: 'Нужно подумать',       cls: 'bg-blue-50 border-blue-200 text-blue-800',   icon: '~' },
  reject: { label: 'Не рекомендуем',       cls: 'bg-red-50 border-red-200 text-red-800',       icon: '✕' },
}

export default function InterviewResult() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getInterview, getCandidate, customQuestions, reopenInterview, setAnswer } = useStore()
  const interview = getInterview(id)
  const [verdictStatus, setVerdictStatus] = useState(null)
  const [verdictText, setVerdictText] = useState('')
  const [verdictError, setVerdictError] = useState('')
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [transcriptionText, setTranscriptionText] = useState('')
  const [transcriptionName, setTranscriptionName] = useState('')
  const [transcriptionParsing, setTranscriptionParsing] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const transcriptionRef = useRef()
  const initialPromptRef = useRef('')
  const [verdictEditing, setVerdictEditing] = useState(false)
  const [verdictDraft, setVerdictDraft] = useState('')
  const [autoScoredCount, setAutoScoredCount] = useState(0)

  const handleTranscriptionFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setTranscriptionParsing(true)
    try {
      const text = await parseTranscription(file)
      setTranscriptionText(text)
      setTranscriptionName(file.name)
    } catch (err) {
      console.error('Transcription parse error:', err)
    }
    setTranscriptionParsing(false)
    if (transcriptionRef.current) transcriptionRef.current.value = ''
  }

  const data = useMemo(() => {
    if (!interview) return null
    const questionMap = {}
    interview.sections.forEach(sec => {
      if (sec === 'custom') {
        customQuestions.forEach(q => {
          questionMap[q.id] = { ...q, themeTitle: q.theme || 'Мои вопросы', themeId: `cq_${q.id}`, section: 'custom' }
        })
        return
      }
      const level = QUESTIONS[sec]?.levels[interview.grade]
      if (!level) return
      level.themes.forEach(t => t.questions.forEach(q => {
        questionMap[q.id] = { ...q, themeTitle: t.title, themeId: t.id, section: sec }
      }))
    })

    const answered = Object.entries(interview.answers).filter(([, a]) => a.score !== null)
    const total = answered.length
    const totalInInterview = interview.questionIds.length
    const overall = total ? Math.round((answered.reduce((s, [, a]) => s + a.score, 0) / (total * 2)) * 100) : 0

    const bySection = {}
    interview.sections.forEach(sec => {
      if (sec === 'custom') {
        const ids = new Set(customQuestions.map(q => q.id))
        const vals = answered.filter(([qid]) => ids.has(qid))
        if (!vals.length) return
        const pct = Math.round((vals.reduce((s, [, a]) => s + a.score, 0) / (vals.length * 2)) * 100)
        bySection['custom'] = { pct, count: vals.length }
        return
      }
      const level = QUESTIONS[sec]?.levels[interview.grade]
      if (!level) return
      const ids = new Set(level.themes.flatMap(t => t.questions.map(q => q.id)))
      const vals = answered.filter(([qid]) => ids.has(qid))
      if (!vals.length) return
      const pct = Math.round((vals.reduce((s, [, a]) => s + a.score, 0) / (vals.length * 2)) * 100)
      bySection[sec] = { pct, count: vals.length }
    })

    const byTheme = {}
    answered.forEach(([qid, a]) => {
      const q = questionMap[qid]
      if (!q) return
      if (!byTheme[q.themeId]) byTheme[q.themeId] = { title: q.themeTitle, section: q.section, vals: [] }
      byTheme[q.themeId].vals.push(a.score)
    })
    Object.values(byTheme).forEach(t => {
      t.pct = Math.round((t.vals.reduce((s, v) => s + v, 0) / (t.vals.length * 2)) * 100)
    })

    const weakThemes = Object.values(byTheme).filter(t => t.pct < 50).sort((a, b) => a.pct - b.pct)
    const strongThemes = Object.values(byTheme).filter(t => t.pct >= 75).sort((a, b) => b.pct - a.pct)

    const flagged = Object.entries(interview.answers)
      .filter(([, a]) => a.flagged)
      .map(([qid, a]) => ({ ...questionMap[qid], note: a.note, score: a.score }))

    return { questionMap, overall, bySection, byTheme, weakThemes, strongThemes, flagged, total, totalInInterview }
  }, [interview, customQuestions])

  if (!interview || !data) return <div className="p-8 text-slate-400">Не найдено. <Link to="/" className="underline">На главную</Link></div>
  const candidate = getCandidate(interview.candidateId)
  const rec = interview.recommendation ? REC_META[interview.recommendation] : null

  const buildInitialPrompt = () => {
    const questionsList = interview.questionIds
      .map(qid => { const q = data.questionMap[qid]; return q ? `${qid}: ${q.q}` : null })
      .filter(Boolean)
      .join('\n')

    return `Ты — senior-специалист по платной рекламе с 10+ летним опытом. За плечами: управление рекламой в Meta Ads и Google Ads с бюджетами от $50K/мес, обучение junior и middle специалистов, построение performance-отделов с нуля. Ты знаешь, как выглядит сильный кандидат и как выглядит тот, кто просто выучил термины.

Тебе нужно оценить кандидата на позицию таргетолог/контекстолог уровня ${LEVEL_LABELS[interview.grade]}.
Кандидат: ${candidate?.name}

ТРАНСКРИПЦИЯ СОБЕСЕДОВАНИЯ:
${transcriptionText.slice(0, 9000)}

ВОПРОСЫ ИНТЕРВЬЮ (для контекста):
${questionsList}

Прочти транскрипцию и дай честную оценку — как будто рассказываешь коллеге после интервью. Пиши живо, без канцелярита. Опирайся только на то, что есть в транскрипции.

Структура ответа (5 блоков):

1. ТЕХНИЧЕСКИЙ УРОВЕНЬ
Что знает хорошо, что слабо, насколько соответствует заявленному грейду. Конкретные примеры из транскрипции.

2. МЫШЛЕНИЕ И ПОДХОД
Как рассуждает — мыслит ли цифрами и результатами, или говорит общими словами? Задаёт ли правильные вопросы? Понимает ли бизнес-логику за инструментами?

3. МОТИВАЦИЯ И РОСТ
Чувствуется ли реальное желание развиваться, или это просто работа? Есть ли собственный интерес к теме — читает ли что-то, экспериментирует ли? Как реагирует на сложные вопросы — теряется или пытается разобраться?

4. ЛИЧНЫЕ КРАСНЫЕ ФЛАГИ
Что лично тебя насторожило: в ответах, в формулировках, в подходе. Это субъективно — пиши честно.

5. ВЕРДИКТ
Взял бы ты этого человека к себе в команду на обучение? Чёткое да/нет и почему. Если да — что конкретно нужно подтянуть за первые 3 месяца.

Затем выставь оценку каждому вопросу на основе транскрипции.
Оценки: 2 = ответил хорошо, 1 = частично, 0 = не знает/не ответил, null = не обсуждалось.

ОБЯЗАТЕЛЬНО в самом конце добавь РОВНО в таком формате (без отступов, без markdown, без code block):
===ОЦЕНКИ===
{"question_id": score_or_null, "question_id2": score_or_null}

В процессе чата, если исправляешь анализ по замечаниям пользователя, выводи полный обновлённый текст анализа (только блоки 1-5, без оценок) в теге:
[ОБНОВЛЁННЫЙ_АНАЛИЗ]
...
[/ОБНОВЛЁННЫЙ_АНАЛИЗ]`
  }

  const callClaude = async (messages, key, maxTokens = 1000) => {
    const res = await fetch(CF_WORKER, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: maxTokens, messages }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || `HTTP ${res.status}`)
    }
    const result = await res.json()
    return result.content?.[0]?.text || ''
  }

  const handleGetVerdict = async () => {
    const key = localStorage.getItem('anthropic_api_key')
    if (!key) { setShowKeyInput(true); return }
    setVerdictStatus('loading')
    setVerdictError('')
    setChatMessages([])
    setAutoScoredCount(0)
    const prompt = buildInitialPrompt()
    initialPromptRef.current = prompt
    try {
      const raw = await callClaude([{ role: 'user', content: prompt }], key, 4000)

      let analysisText = raw
      let scoresJson = null
      let scoredCount = 0

      const stripTrailingNewlines = (s, idx) => { while (idx > 0 && (s[idx - 1] === '\n' || s[idx - 1] === '\r')) idx--; return idx }
      const cutBeforeHeading = (before) => {
        const hm = before.match(/\n#{1,6}[ \t][^\n]*\n*$/)
        return hm ? before.lastIndexOf('\n' + hm[0].trim()) : -1
      }

      // Strategy 1: ===ОЦЕНКИ=== marker (always strip display text at this point)
      const markerIdx = raw.indexOf('===ОЦЕНКИ===')
      if (markerIdx >= 0) {
        let cut = stripTrailingNewlines(raw, markerIdx)
        analysisText = raw.slice(0, cut)
        const afterMarker = raw.slice(markerIdx)
        const jsonMatch = afterMarker.match(/\{[\s\S]*\}/)
        if (jsonMatch) scoresJson = jsonMatch[0]
      }

      // Strategy 2: last code block containing JSON object
      if (!scoresJson) {
        const re = /```(?:json)?[ \t]*\r?\n([\s\S]*?)```/g
        let lastBlock = null; let m
        while ((m = re.exec(raw)) !== null) {
          const c = m[1].trim()
          if (c.startsWith('{')) lastBlock = { index: m.index, length: m[0].length, content: c }
        }
        if (lastBlock) {
          scoresJson = lastBlock.content
          const before = raw.slice(0, lastBlock.index)
          const hi = cutBeforeHeading(before)
          let cut = hi >= 0 ? hi : lastBlock.index
          cut = stripTrailingNewlines(raw, cut)
          analysisText = raw.slice(0, cut)
        }
      }

      // Strategy 3: bare JSON object with question ID keys (no code fences)
      if (!scoresJson) {
        const m3 = raw.match(/\{[\s\S]*?"(?:meta|g|cq)[_a-z0-9]+"[ \t]*:[ \t]*(?:\d+|null)[\s\S]*?\}/)
        if (m3) {
          scoresJson = m3[0]
          const before = raw.slice(0, raw.indexOf(m3[0]))
          const hi = cutBeforeHeading(before)
          let cut = hi >= 0 ? hi : raw.indexOf(m3[0])
          cut = stripTrailingNewlines(raw, cut)
          analysisText = raw.slice(0, cut)
        }
      }

      if (scoresJson) {
        try {
          const scores = JSON.parse(scoresJson)
          Object.entries(scores).forEach(([qid, score]) => {
            if (score === null || score === undefined) return
            const s = Number(score)
            if (!isNaN(s) && s >= 0 && s <= 2 && interview.questionIds.includes(qid)) {
              setAnswer(id, qid, Math.round(s), interview.answers[qid]?.note || '')
              scoredCount++
            }
          })
          setAutoScoredCount(scoredCount)
        } catch (_) {}
      }

      setVerdictText(analysisText.trim())
      setVerdictStatus('done')
    } catch (err) {
      setVerdictError(err.message)
      setVerdictStatus('error')
    }
  }

  const handleSendChat = async () => {
    const msg = chatInput.trim()
    if (!msg || chatLoading) return
    const key = localStorage.getItem('anthropic_api_key')
    if (!key) { setShowKeyInput(true); return }
    const newMessages = [...chatMessages, { role: 'user', content: msg }]
    setChatMessages(newMessages)
    setChatInput('')
    setChatLoading(true)
    try {
      const history = [
        { role: 'user', content: initialPromptRef.current },
        { role: 'assistant', content: verdictText },
        ...newMessages,
      ]
      const reply = await callClaude(history, key, 1500)
      let displayReply = reply
      const updMatch = reply.match(/\[ОБНОВЛЁННЫЙ_АНАЛИЗ\]([\s\S]*?)\[\/ОБНОВЛЁННЫЙ_АНАЛИЗ\]/)
      if (updMatch) {
        setVerdictText(updMatch[1].trim())
        displayReply = reply.replace(/\n*\[ОБНОВЛЁННЫЙ_АНАЛИЗ\][\s\S]*?\[\/ОБНОВЛЁННЫЙ_АНАЛИЗ\]\n*/, '').trim() || 'Анализ обновлён ✓'
      }
      setChatMessages(prev => [...prev, { role: 'assistant', content: displayReply }])
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: `Ошибка: ${err.message}` }])
    }
    setChatLoading(false)
  }

  const handleReopenInterview = () => {
    if (!window.confirm('Вернуть интервью в режим редактирования?\nРекомендация будет сброшена.')) return
    reopenInterview(id)
    navigate(`/interview/${id}`)
  }

  const handleExport = () => {
    const dateStr = new Date(interview.completedAt).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })
    const scoreColor = data.overall >= 75 ? '#16a34a' : data.overall >= 50 ? '#d97706' : '#dc2626'

    const sectionRows = interview.sections.map(sec => {
      const s = data.bySection[sec]
      if (!s) return ''
      const label = sec === 'custom' ? 'Мои вопросы' : (QUESTIONS[sec]?.label || sec)
      const c = s.pct >= 75 ? '#22c55e' : s.pct >= 50 ? '#f59e0b' : '#ef4444'
      return `<tr><td style="padding:5px 8px">${label}</td><td style="padding:5px 8px;color:#94a3b8;font-size:12px">${s.count} вопр.</td><td style="padding:5px 8px;width:200px"><div style="background:#f1f5f9;border-radius:9999px;height:8px"><div style="background:${c};height:8px;border-radius:9999px;width:${s.pct}%"></div></div></td><td style="padding:5px 8px;color:${c};font-weight:bold;text-align:right">${s.pct}%</td></tr>`
    }).join('')

    const answersHtml = interview.questionIds.map(qid => {
      const q = data.questionMap[qid]
      const a = interview.answers[qid]
      if (!q || !a || a.score === null) return ''
      const sm = SCORE_META[a.score]
      const bg = a.score === 2 ? '#22c55e' : a.score === 1 ? '#f59e0b' : '#ef4444'
      return `<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #f8fafc">
        <span style="flex-shrink:0;width:22px;height:22px;border-radius:50%;background:${bg};color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center;font-weight:bold">${sm.short}</span>
        <div><div style="font-size:13px;color:#334155">${q.q}</div>${a.note ? `<div style="font-size:11px;color:#94a3b8;font-style:italic">${a.note}</div>` : ''}</div>
      </div>`
    }).join('')

    const flaggedHtml = data.flagged.map(q => `<div style="border-left:4px solid #fca5a5;padding:6px 12px;margin-bottom:8px">
      <div style="font-size:11px;color:#94a3b8">${q.themeTitle || ''}</div>
      <div style="font-size:13px;font-weight:500">${q.q || ''}</div>
      ${q.note ? `<div style="font-size:12px;color:#dc2626;font-style:italic">Заметка: ${q.note}</div>` : ''}
    </div>`).join('')

    const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Отчёт: ${candidate?.name}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:800px;margin:0 auto;padding:32px 24px;color:#1e293b}h2{font-size:15px;margin:24px 0 10px;border-bottom:1px solid #e2e8f0;padding-bottom:6px}table{width:100%;border-collapse:collapse}@media print{body{padding:0}}</style>
</head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
  <div>
    <div style="font-size:22px;font-weight:800;margin-bottom:4px">${candidate?.name}</div>
    <div style="color:#64748b;font-size:13px">${candidate?.position} · ${LEVEL_LABELS[interview.grade]} · ${dateStr}</div>
    ${rec ? `<div style="margin-top:10px;padding:6px 12px;border-radius:8px;border:1px solid #e2e8f0;font-weight:600;font-size:13px;display:inline-block">${rec.icon} ${rec.label}</div>` : ''}
    ${interview.generalNote ? `<div style="margin-top:10px;font-size:13px;color:#475569;font-style:italic">"${interview.generalNote}"</div>` : ''}
  </div>
  <div style="text-align:right"><div style="font-size:42px;font-weight:800;color:${scoreColor}">${data.overall}%</div><div style="font-size:11px;color:#94a3b8">${data.total} вопросов</div></div>
</div>
<h2>Результаты по разделам</h2><table>${sectionRows}</table>
${data.weakThemes.length ? `<h2 style="color:#b91c1c">Слабые места</h2>${data.weakThemes.map(t => `<div style="display:flex;justify-content:space-between;padding:4px 0"><span>${t.title}</span><span style="color:#ef4444;font-weight:bold">${t.pct}%</span></div>`).join('')}` : ''}
${data.strongThemes.length ? `<h2 style="color:#15803d">Сильные стороны</h2>${data.strongThemes.map(t => `<div style="display:flex;justify-content:space-between;padding:4px 0"><span>${t.title}</span><span style="color:#22c55e;font-weight:bold">${t.pct}%</span></div>`).join('')}` : ''}
${data.flagged.length ? `<h2 style="color:#c2410c">Красные флаги</h2>${flaggedHtml}` : ''}
<h2>Все ответы</h2>${answersHtml}
${verdictText ? `<h2>Анализ Claude AI</h2><div style="font-size:13px;color:#334155;line-height:1.6;white-space:pre-wrap">${verdictText.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>` : ''}
<script>window.addEventListener('load',function(){window.print()})<\/script>
</body></html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `interview-${(candidate?.name || 'report').replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6 no-print">
        <Link to={`/candidates/${interview.candidateId}`} className="text-slate-400 hover:text-slate-600">←</Link>
        <h1 className="font-bold text-xl">Результат интервью</h1>
        <button className="btn-ghost text-sm" onClick={handleReopenInterview}>✏ Оценки</button>
        <button className="btn-ghost" onClick={() => window.print()}>🖨 Печать</button>
      </div>

      <div className="card p-6 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">{candidate?.name}</h2>
            <p className="text-sm text-slate-500">{candidate?.position} · {LEVEL_LABELS[interview.grade]} · {new Date(interview.completedAt).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold ${data.overall >= 75 ? 'text-green-600' : data.overall >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{data.overall}%</div>
            <div className="text-xs text-slate-400">
              {data.total < data.totalInInterview
                ? `${data.total} из ${data.totalInInterview} вопросов`
                : `${data.total} вопросов`}
            </div>
          </div>
        </div>
        {rec && (
          <div className={`mt-4 p-3 rounded-lg border ${rec.cls} font-semibold text-sm flex items-center gap-2`}>
            <span className="text-lg">{rec.icon}</span> {rec.label}
          </div>
        )}
        {interview.generalNote && (
          <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm text-slate-600 italic">"{interview.generalNote}"</div>
        )}
      </div>

      <div className="card p-5 mb-5">
        <h3 className="font-semibold mb-4">Результаты по разделам</h3>
        <div className="space-y-3">
          {interview.sections.map(sec => {
            const s = data.bySection[sec]
            if (!s) return null
            return (
              <div key={sec}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{sec === 'custom' ? 'Мои вопросы' : QUESTIONS[sec]?.label}</span>
                  <span className="text-xs text-slate-400">{s.count} вопросов</span>
                </div>
                <ScoreBar pct={s.pct} />
              </div>
            )
          })}
        </div>
      </div>

      {data.weakThemes.length > 0 && (
        <div className="card p-5 mb-5 border-red-100">
          <h3 className="font-semibold mb-3 text-red-700">Слабые места</h3>
          <div className="space-y-2">
            {data.weakThemes.map((t, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-slate-700">{t.title}</span>
                <span className="text-sm font-bold text-red-500">{t.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.strongThemes.length > 0 && (
        <div className="card p-5 mb-5 border-green-100">
          <h3 className="font-semibold mb-3 text-green-700">Сильные стороны</h3>
          <div className="space-y-2">
            {data.strongThemes.map((t, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-slate-700">{t.title}</span>
                <span className="text-sm font-bold text-green-600">{t.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.flagged.length > 0 && (
        <div className="card p-5 mb-5 border-orange-100">
          <h3 className="font-semibold mb-3 text-orange-700">Красные флаги с заметками</h3>
          <div className="space-y-3">
            {data.flagged.map((q, i) => (
              <div key={i} className="border-l-4 border-red-300 pl-3">
                <p className="text-xs text-slate-500 mb-0.5">{q.themeTitle}</p>
                <div className="flex items-start gap-2">
                  {q.score !== null && q.score !== undefined && (
                    <span className={`flex-shrink-0 w-5 h-5 rounded-full ${q.score === 2 ? 'bg-green-500' : q.score === 1 ? 'bg-amber-400' : 'bg-red-400'} text-white text-xs flex items-center justify-center font-bold mt-0.5`}>
                      {SCORE_META[q.score].short}
                    </span>
                  )}
                  <p className="text-sm font-medium text-slate-800">{q.q}</p>
                </div>
                {q.note && <p className="text-xs text-red-600 mt-1 italic">Заметка: {q.note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-5 mb-5">
        <h3 className="font-semibold mb-4">Все ответы</h3>
        <div className="space-y-2">
          {interview.questionIds.map(qid => {
            const q = data.questionMap[qid]
            const a = interview.answers[qid]
            if (!q || !a || a.score === null) return null
            const sm = SCORE_META[a.score]
            return (
              <div key={qid} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
                <span className={`flex-shrink-0 w-6 h-6 rounded-full ${a.score === 2 ? 'bg-green-500' : a.score === 1 ? 'bg-amber-400' : 'bg-red-400'} text-white text-xs flex items-center justify-center font-bold`}>{sm.short}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">{q.q}</p>
                  {a.note && <p className="text-xs text-slate-400 mt-0.5 italic">{a.note}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card p-5 mb-5 border-violet-100 no-print">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="font-semibold text-slate-800">✨ Анализ от Claude AI</span>
          {autoScoredCount > 0 && (
            <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
              {autoScoredCount} оценок проставлено автоматически
            </span>
          )}
        </div>

        <input ref={transcriptionRef} type="file" accept=".txt,.docx" className="hidden" onChange={handleTranscriptionFile} />
        <div className="mb-4">
          {transcriptionText ? (
            <div className="flex items-center gap-2 p-2.5 bg-violet-50 rounded-lg border border-violet-100">
              <span className="text-xs text-violet-700 flex-1 truncate">📄 {transcriptionName}</span>
              <button
                type="button"
                onClick={() => { setTranscriptionText(''); setTranscriptionName(''); setVerdictStatus(null); setVerdictText(''); setChatMessages([]) }}
                className="text-slate-400 hover:text-red-500 text-sm leading-none flex-shrink-0"
              >×</button>
            </div>
          ) : (
            <button
              type="button"
              disabled={transcriptionParsing}
              onClick={() => transcriptionRef.current?.click()}
              className="w-full py-3 border-2 border-dashed border-violet-200 rounded-lg text-sm text-violet-500 hover:border-violet-400 hover:bg-violet-50 transition-colors disabled:opacity-60"
            >
              {transcriptionParsing ? '↻ Читаю файл...' : '📄 Загрузить транскрипцию (.txt, .docx)'}
            </button>
          )}
        </div>

        {!transcriptionText ? (
          <p className="text-xs text-slate-400 text-center py-1">Загрузите транскрипцию — Claude проанализирует её и ответит на вопросы</p>
        ) : showKeyInput ? (
          <div className="space-y-2">
            <input
              className="input text-sm"
              placeholder="sk-ant-api03-..."
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && keyInput.trim()) {
                  localStorage.setItem('anthropic_api_key', keyInput.trim())
                  setShowKeyInput(false)
                  setKeyInput('')
                  handleGetVerdict()
                }
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!keyInput.trim()) return
                  localStorage.setItem('anthropic_api_key', keyInput.trim())
                  setShowKeyInput(false)
                  setKeyInput('')
                  handleGetVerdict()
                }}
                disabled={!keyInput.trim()}
                className="btn-primary text-sm flex-1 disabled:opacity-40"
              >Сохранить и проанализировать</button>
              <button onClick={() => setShowKeyInput(false)} className="btn-ghost text-sm">Отмена</button>
            </div>
            <p className="text-xs text-slate-400">Ключ хранится только в localStorage браузера</p>
          </div>
        ) : verdictStatus === 'loading' ? (
          <div className="flex items-center gap-2 text-violet-700 text-sm">
            <span className="inline-block animate-spin">↻</span> Анализирую транскрипцию...
          </div>
        ) : verdictStatus === 'error' ? (
          <div className="space-y-2">
            <p className="text-sm text-red-500">{verdictError || 'Ошибка — проверь API ключ'}</p>
            <div className="flex gap-2">
              <button onClick={handleGetVerdict} className="btn-ghost text-sm">Повторить</button>
              <button onClick={() => setShowKeyInput(true)} className="text-xs text-slate-400 hover:text-slate-600 underline self-center">сменить ключ</button>
            </div>
          </div>
        ) : verdictStatus === 'done' ? (
          <div>
            {verdictEditing ? (
              <div className="mb-4">
                <textarea
                  className="input resize-y text-sm w-full"
                  rows={10}
                  value={verdictDraft}
                  onChange={e => setVerdictDraft(e.target.value)}
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { setVerdictText(verdictDraft); setVerdictEditing(false) }} className="btn-primary text-sm">Сохранить</button>
                  <button onClick={() => setVerdictEditing(false)} className="btn-ghost text-sm">Отмена</button>
                </div>
              </div>
            ) : (
              <div className="relative mb-4 pb-4 border-b border-slate-100">
                <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{verdictText}</div>
                <button
                  onClick={() => { setVerdictDraft(verdictText); setVerdictEditing(true) }}
                  className="absolute top-0 right-0 text-xs text-slate-400 hover:text-slate-600 leading-none"
                  title="Редактировать текст"
                >✏</button>
              </div>
            )}

            {chatMessages.length > 0 && (
              <div className="space-y-3 mb-4">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'user' ? (
                      <span className="inline-block bg-indigo-100 text-indigo-900 text-sm px-3 py-2 rounded-2xl rounded-tr-sm max-w-xs">{msg.content}</span>
                    ) : (
                      <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-w-prose">{msg.content}</div>
                    )}
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex items-center gap-2 text-violet-600 text-sm">
                    <span className="inline-block animate-spin">↻</span> Отвечаю...
                  </div>
                )}
              </div>
            )}

            {!chatLoading && (
              <div className="flex gap-2 items-end">
                <textarea
                  className="input resize-none text-sm flex-1"
                  rows={2}
                  placeholder="Не согласен с чем-то? Задай уточняющий вопрос..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && chatInput.trim()) { e.preventDefault(); handleSendChat() } }}
                />
                <button
                  onClick={handleSendChat}
                  disabled={!chatInput.trim()}
                  className="btn-primary text-sm px-4 py-2 self-end disabled:opacity-40"
                >→</button>
              </div>
            )}

            <button onClick={handleGetVerdict} className="mt-3 text-xs text-slate-400 hover:text-slate-600 underline">Перезапустить анализ</button>
          </div>
        ) : (
          <button onClick={handleGetVerdict} className="btn-primary text-sm w-full">
            Проанализировать транскрипцию
          </button>
        )}
      </div>

      <div className="flex gap-3 no-print">
        <Link to={`/candidates/${interview.candidateId}`} className="btn-ghost flex-1 text-center">← К кандидату</Link>
        <button className="btn-ghost flex-1" onClick={handleExport}>⬇ Скачать PDF</button>
      </div>
    </div>
  )
}
