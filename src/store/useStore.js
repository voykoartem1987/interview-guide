import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const uid = () => Math.random().toString(36).slice(2, 10)

export const STATUS_META = {
  pending: { label: 'На рассмотрении', color: 'bg-yellow-100 text-yellow-800' },
  passed:  { label: 'Принят',          color: 'bg-green-100 text-green-800'  },
  failed:  { label: 'Отказ',           color: 'bg-red-100 text-red-800'      },
  thinking:{ label: 'Думаем',          color: 'bg-blue-100 text-blue-800'    },
}

export const SCORE_META = {
  2: { label: 'Знает отлично', short: '✓✓', color: 'bg-green-500',  text: 'text-green-700' },
  1: { label: 'Частично',      short: '~',  color: 'bg-yellow-400', text: 'text-yellow-700' },
  0: { label: 'Не знает',      short: '✕',  color: 'bg-red-400',    text: 'text-red-700'    },
}

const useStore = create(
  persist(
    (set, get) => ({
      candidates: [],
      interviews: [],

      addCandidate: (data) => {
        const c = { id: uid(), createdAt: new Date().toISOString(), status: 'pending', ...data }
        set(s => ({ candidates: [c, ...s.candidates] }))
        return c.id
      },

      updateCandidate: (id, data) =>
        set(s => ({ candidates: s.candidates.map(c => c.id === id ? { ...c, ...data } : c) })),

      deleteCandidate: (id) =>
        set(s => ({
          candidates: s.candidates.filter(c => c.id !== id),
          interviews: s.interviews.filter(i => i.candidateId !== id),
        })),

      startInterview: (candidateId, { sections, grade, questionIds }) => {
        const id = uid()
        const interview = {
          id, candidateId,
          sections, grade, questionIds,
          answers: {},
          generalNote: '',
          recommendation: null,
          startedAt: new Date().toISOString(),
          completedAt: null,
        }
        set(s => ({ interviews: [interview, ...s.interviews] }))
        return id
      },

      setAnswer: (interviewId, questionId, score, note) =>
        set(s => ({
          interviews: s.interviews.map(i =>
            i.id === interviewId
              ? { ...i, answers: { ...i.answers, [questionId]: { score, note: note ?? i.answers[questionId]?.note ?? '' } } }
              : i
          ),
        })),

      setNote: (interviewId, questionId, note) =>
        set(s => ({
          interviews: s.interviews.map(i =>
            i.id === interviewId
              ? { ...i, answers: { ...i.answers, [questionId]: { ...(i.answers[questionId] || { score: null }), note } } }
              : i
          ),
        })),

      setGeneralNote: (interviewId, note) =>
        set(s => ({
          interviews: s.interviews.map(i => i.id === interviewId ? { ...i, generalNote: note } : i),
        })),

      toggleFlag: (interviewId, questionId) =>
        set(s => ({
          interviews: s.interviews.map(i =>
            i.id === interviewId
              ? {
                  ...i,
                  answers: {
                    ...i.answers,
                    [questionId]: {
                      ...(i.answers[questionId] || { score: null, note: '' }),
                      flagged: !(i.answers[questionId]?.flagged),
                    },
                  },
                }
              : i
          ),
        })),

      completeInterview: (interviewId, recommendation) =>
        set(s => ({
          interviews: s.interviews.map(i =>
            i.id === interviewId
              ? { ...i, recommendation, completedAt: new Date().toISOString() }
              : i
          ),
        })),

      deleteInterview: (id) =>
        set(s => ({ interviews: s.interviews.filter(i => i.id !== id) })),

      getCandidate: (id) => get().candidates.find(c => c.id === id),
      getInterview: (id) => get().interviews.find(i => i.id === id),
      getCandidateInterviews: (candidateId) => get().interviews.filter(i => i.candidateId === candidateId),
    }),
    { name: 'interview-guide-v1' }
  )
)

export default useStore
