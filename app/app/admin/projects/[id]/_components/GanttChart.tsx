'use client'

import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

export type GanttTrack = 'production' | 'design' | 'service'
export type GanttStatus = '예정' | '진행중' | '완료' | '지연'

export type GanttTask = {
  id: string
  track: GanttTrack
  name: string
  start: string // YYYY-MM-DD
  end: string // YYYY-MM-DD
  status: GanttStatus
}

const TRACKS: { key: GanttTrack; label: string; bar: string; chip: string }[] = [
  { key: 'production', label: '생산', bar: 'bg-blue-500', chip: 'bg-blue-100 text-blue-700' },
  { key: 'design', label: '디자인', bar: 'bg-purple-500', chip: 'bg-purple-100 text-purple-700' },
  { key: 'service', label: '서비스', bar: 'bg-teal-500', chip: 'bg-teal-100 text-teal-700' },
]

const STATUS_OPTIONS: GanttStatus[] = ['예정', '진행중', '완료', '지연']

const STATUS_STYLE: Record<GanttStatus, string> = {
  예정: 'bg-gray-100 text-gray-500',
  진행중: 'bg-blue-50 text-blue-600',
  완료: 'bg-green-50 text-green-700',
  지연: 'bg-red-50 text-red-600',
}

const DAY_MS = 24 * 60 * 60 * 1000

const parseDate = (s: string): Date | null => {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

const fmtMonth = (d: Date) => `${d.getMonth() + 1}월`
const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const randomId = () => Math.random().toString(36).slice(2, 10)

export function GanttChart({
  tasks,
  onChange,
}: {
  tasks: GanttTask[]
  onChange: (next: GanttTask[]) => void
}) {
  // 텍스트 입력은 로컬 draft, 구조 변경은 즉시 persist
  const [draft, setDraft] = useState<GanttTask[]>(tasks)

  // tasks prop이 외부에서 갱신되면 draft 동기화
  const tasksKey = tasks.map((t) => t.id).join(',')
  const draftKey = draft.map((t) => t.id).join(',')
  if (tasksKey !== draftKey) {
    // 추가/삭제로 id 집합이 바뀌면 prop 기준으로 리셋
    setDraft(tasks)
  }

  const range = useMemo(() => {
    const dates: Date[] = []
    for (const t of draft) {
      const s = parseDate(t.start)
      const e = parseDate(t.end)
      if (s) dates.push(s)
      if (e) dates.push(e)
    }
    if (dates.length === 0) return null
    let min = dates[0]
    let max = dates[0]
    for (const d of dates) {
      if (d < min) min = d
      if (d > max) max = d
    }
    // 양쪽 3일 패딩
    const start = new Date(min.getTime() - 3 * DAY_MS)
    const end = new Date(max.getTime() + 3 * DAY_MS)
    const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS))
    return { start, end, totalDays }
  }, [draft])

  const monthTicks = useMemo(() => {
    if (!range) return []
    const ticks: { label: string; left: number }[] = []
    const cur = new Date(range.start.getFullYear(), range.start.getMonth(), 1)
    while (cur <= range.end) {
      if (cur >= range.start) {
        const offset = Math.round((cur.getTime() - range.start.getTime()) / DAY_MS)
        ticks.push({ label: fmtMonth(cur), left: (offset / range.totalDays) * 100 })
      }
      cur.setMonth(cur.getMonth() + 1)
    }
    return ticks
  }, [range])

  const todayLeft = useMemo(() => {
    if (!range) return null
    const t = parseDate(todayStr())
    if (!t || t < range.start || t > range.end) return null
    return ((t.getTime() - range.start.getTime()) / DAY_MS / range.totalDays) * 100
  }, [range])

  const barGeom = (t: GanttTask) => {
    if (!range) return null
    const s = parseDate(t.start)
    const e = parseDate(t.end)
    if (!s || !e) return null
    const left = ((s.getTime() - range.start.getTime()) / DAY_MS / range.totalDays) * 100
    const width = (((e.getTime() - s.getTime()) / DAY_MS + 1) / range.totalDays) * 100
    return { left: Math.max(0, left), width: Math.max(1.5, width) }
  }

  const persist = (next: GanttTask[]) => {
    setDraft(next)
    onChange(next)
  }

  const updateLocal = (id: string, patch: Partial<GanttTask>) => {
    setDraft((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  const persistField = (id: string, patch: Partial<GanttTask>) => {
    const next = draft.map((t) => (t.id === id ? { ...t, ...patch } : t))
    persist(next)
  }

  const addTask = (track: GanttTrack) => {
    const t = todayStr()
    const next = [
      ...draft,
      { id: randomId(), track, name: '', start: t, end: t, status: '예정' as GanttStatus },
    ]
    persist(next)
  }

  const removeTask = (id: string) => {
    persist(draft.filter((t) => t.id !== id))
  }

  return (
    <div className="flex-1 overflow-y-auto pr-2 space-y-5">
      {/* 간트 비주얼 */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">일정 타임라인</p>
          <div className="flex gap-3">
            {TRACKS.map((tr) => (
              <span key={tr.key} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={`w-2.5 h-2.5 rounded-sm ${tr.bar}`} />
                {tr.label}
              </span>
            ))}
          </div>
        </div>

        {!range ? (
          <p className="text-sm text-gray-400 text-center py-10">
            일정을 추가하면 간트차트가 표시됩니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              {/* 월 눈금 헤더 */}
              <div className="grid grid-cols-[120px_1fr] items-end mb-1">
                <div />
                <div className="relative h-5">
                  {monthTicks.map((tick, i) => (
                    <span
                      key={i}
                      className="absolute text-[11px] text-gray-400 -translate-x-1/2"
                      style={{ left: `${tick.left}%` }}
                    >
                      {tick.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* 트랙별 그룹 */}
              {TRACKS.map((tr) => {
                const trackTasks = draft.filter((t) => t.track === tr.key)
                return (
                  <div key={tr.key} className="border-t border-gray-100 py-2">
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                      <div className="flex items-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${tr.chip}`}>
                          {tr.label}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {trackTasks.length === 0 ? (
                          <div className="h-6 flex items-center text-[11px] text-gray-300">
                            일정 없음
                          </div>
                        ) : (
                          trackTasks.map((t) => {
                            const geom = barGeom(t)
                            return (
                              <div key={t.id} className="relative h-6">
                                {/* 트랙 배경선 */}
                                <div className="absolute inset-y-0 inset-x-0 bg-gray-50 rounded" />
                                {/* 오늘 라인 */}
                                {todayLeft !== null && (
                                  <div
                                    className="absolute inset-y-0 w-px bg-red-300 z-10"
                                    style={{ left: `${todayLeft}%` }}
                                  />
                                )}
                                {geom && (
                                  <div
                                    className={`absolute inset-y-0.5 rounded ${tr.bar} ${
                                      t.status === '완료'
                                        ? 'opacity-50'
                                        : t.status === '예정'
                                        ? 'opacity-30'
                                        : ''
                                    } ${t.status === '지연' ? 'ring-2 ring-red-400' : ''} flex items-center px-2 z-20`}
                                    style={{ left: `${geom.left}%`, width: `${geom.width}%` }}
                                    title={`${t.name || '(이름 없음)'} · ${t.start} ~ ${t.end} · ${t.status}`}
                                  >
                                    <span className="text-[11px] text-white font-medium truncate">
                                      {t.name || '(이름 없음)'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {todayLeft !== null && (
                <p className="text-[11px] text-red-400 mt-2 flex items-center gap-1">
                  <span className="w-px h-3 bg-red-300 inline-block" /> 오늘
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 일정 관리 (CRUD) */}
      <div className="space-y-3">
        {TRACKS.map((tr) => {
          const trackTasks = draft.filter((t) => t.track === tr.key)
          return (
            <div key={tr.key} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${tr.chip}`}>
                  {tr.label} 트랙
                </span>
                <button
                  type="button"
                  onClick={() => addTask(tr.key)}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> 일정 추가
                </button>
              </div>

              {trackTasks.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">등록된 일정이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {trackTasks.map((t) => (
                    <div
                      key={t.id}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <input
                        value={t.name}
                        onChange={(e) => updateLocal(t.id, { name: e.target.value })}
                        onBlur={(e) => persistField(t.id, { name: e.target.value })}
                        placeholder="업무명 (예: 1차 샘플 생산)"
                        className="flex-1 min-w-[140px] px-2 py-1.5 text-sm border border-gray-200 rounded-md"
                      />
                      <input
                        type="date"
                        value={t.start}
                        onChange={(e) => persistField(t.id, { start: e.target.value })}
                        className="w-[150px] shrink-0 px-2 py-1.5 text-sm border border-gray-200 rounded-md"
                      />
                      <span className="text-gray-300 text-xs">~</span>
                      <input
                        type="date"
                        value={t.end}
                        onChange={(e) => persistField(t.id, { end: e.target.value })}
                        className="w-[150px] shrink-0 px-2 py-1.5 text-sm border border-gray-200 rounded-md"
                      />
                      <select
                        value={t.status}
                        onChange={(e) => persistField(t.id, { status: e.target.value as GanttStatus })}
                        className={`w-[90px] shrink-0 px-2 py-1.5 text-xs font-medium border border-gray-200 rounded-md ${STATUS_STYLE[t.status]}`}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeTask(t.id)}
                        className="shrink-0 text-gray-300 hover:text-red-500 p-1"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
