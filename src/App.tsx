import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, CircleHelp, Clock3, Download, FileText, LayoutDashboard, MoreHorizontal, Pencil, Plus, Search, Settings2, Sparkles, Trash2, Users, X } from 'lucide-react'
import { goalGroups, seedSessions, seedStudents } from './data'
import type { Session, Student } from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null
const storage = { students: 'lvaep-students-v1', sessions: 'lvaep-sessions-v1' }
function read<T>(key: string, fallback: T): T { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback } catch { return fallback } }
function monthKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
function dateLabel(value: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) { return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', options) }
function initials(name: string) { return name.split(' ').map((part) => part[0]).slice(0, 2).join('') }
function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(!supabase)
  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setAuthReady(true) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); setAuthReady(true) })
    return () => listener.subscription.unsubscribe()
  }, [])
  if (import.meta.env.PROD && !supabase) return <ConfigurationRequired />
  if (supabase && !authReady) return <div className="auth-loading">Opening your tutor workspace…</div>
  if (supabase && !user) return <AuthScreen />
  return <Workspace user={user} />
}

function ConfigurationRequired() {
  return <div className="auth-page"><section className="auth-card"><div className="brand-mark"><BookOpen size={19} /></div><div className="eyebrow">DEPLOYMENT SETUP</div><h1>Authentication isn’t configured</h1><p>This production deployment is missing its Supabase connection settings, so the demo workspace is disabled.</p><div className="setup-vars"><code>VITE_SUPABASE_URL</code><code>VITE_SUPABASE_ANON_KEY</code></div><p>Add both variables to this Vercel project’s Production environment, then redeploy.</p></section></div>
}

function AuthScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!supabase) return
    setBusy(true); setMessage('')
    const result = mode === 'sign-in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
    setBusy(false)
    setMessage(result.error?.message ?? (mode === 'sign-up' ? 'Check your email to confirm your account, then sign in.' : ''))
  }
  return <div className="auth-page"><form className="auth-card" onSubmit={submit}><div className="brand-mark"><BookOpen size={19} /></div><div className="eyebrow">LVAEP TUTOR WORKSPACE</div><h1>{mode === 'sign-in' ? 'Welcome back' : 'Create your tutor account'}</h1><p>Sign in to access your students and session history.</p><label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label><label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} /></label>{message && <div className="auth-message">{message}</div>}<button className="button button-primary auth-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}</button><button type="button" className="auth-toggle" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setMessage('') }}>{mode === 'sign-in' ? 'New tutor? Create an account' : 'Already registered? Sign in'}</button></form></div>
}

function Workspace({ user }: { user: User | null }) {
  const [dataReady, setDataReady] = useState(!user)
  const [students, setStudents] = useState<Student[]>(() => read(storage.students, seedStudents))
  const [sessions, setSessions] = useState<Session[]>(() => read(storage.sessions, seedSessions))
  const [month, setMonth] = useState(() => new Date())
  const [page, setPage] = useState<'dashboard' | 'students' | 'sessions'>('dashboard')
  const [studentId, setStudentId] = useState<string | null>(null)
  const [modal, setModal] = useState<'session' | 'goals' | 'stopped' | 'export' | null>(null)
  const [editing, setEditing] = useState<Session | null>(null)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const [exportMonth, setExportMonth] = useState(monthKey(month))
  const selectedStudent = students.find((student) => student.id === studentId) ?? null
  const activeStudents = students.filter((student) => student.status === 'active')
  const selectedSessions = sessions.filter((session) => session.studentId === studentId)
  const currentSessions = sessions.filter((session) => session.date.startsWith(monthKey(month)))
  const totalHours = currentSessions.reduce((sum, session) => sum + session.hours, 0)

  useEffect(() => { localStorage.setItem(storage.students, JSON.stringify(students)) }, [students])
  useEffect(() => { localStorage.setItem(storage.sessions, JSON.stringify(sessions)) }, [sessions])
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 2800); return () => window.clearTimeout(timer) }, [toast])
  useEffect(() => {
    let cancelled = false
    if (!user || !supabase) { setDataReady(true); return }
    setDataReady(false)
    void (async () => {
      const [studentResult, sessionResult] = await Promise.all([
        supabase!.from('students').select('*').eq('tutor_id', user.id).order('name'),
        supabase!.from('sessions').select('*').eq('tutor_id', user.id).order('session_date', { ascending: false }),
      ])
      if (cancelled) return
      if (studentResult.error || sessionResult.error) { setStudents([]); setSessions([]); setToast(studentResult.error?.message ?? sessionResult.error?.message ?? 'Could not load your data'); setDataReady(true); return }
      setStudents((studentResult.data ?? []).map((row) => ({ id: row.id, name: row.name, site: row.tutoring_site, status: row.status, goals: row.goals ?? [], otherGoal: row.other_goal ?? '', stoppedReason: row.stopped_reason ?? '', stoppedDays: row.stopped_days ?? '', stoppedTimes: row.stopped_times ?? '' })))
      setSessions((sessionResult.data ?? []).map((row) => ({ id: row.id, studentId: row.student_id, date: row.session_date, hours: Number(row.hours), notes: row.notes ?? '' })))
      setDataReady(true)
    })()
    return () => { cancelled = true }
  }, [user?.id])
  useEffect(() => {
    if (!user || !supabase || !dataReady) return
    void (async () => {
      const rows = students.map((student) => ({ id: student.id, tutor_id: user.id, name: student.name, tutoring_site: student.site, status: student.status, goals: student.goals, other_goal: student.otherGoal, stopped_reason: student.stoppedReason, stopped_days: student.stoppedDays, stopped_times: student.stoppedTimes }))
      if (rows.length) { const { error } = await supabase!.from('students').upsert(rows); if (error) setToast(error.message) }
      const { data: existing, error: readError } = await supabase!.from('students').select('id').eq('tutor_id', user.id)
      if (!readError && existing) { const stale = existing.map((row) => row.id).filter((id) => !students.some((student) => student.id === id)); if (stale.length) await supabase!.from('students').delete().in('id', stale) }
    })()
  }, [students, user?.id, dataReady])
  useEffect(() => {
    if (!user || !supabase || !dataReady) return
    void (async () => {
      const rows = sessions.map((session) => ({ id: session.id, tutor_id: user.id, student_id: session.studentId, session_date: session.date, hours: session.hours, notes: session.notes }))
      if (rows.length) { const { error } = await supabase!.from('sessions').upsert(rows); if (error) setToast(error.message) }
      const { data: existing, error: readError } = await supabase!.from('sessions').select('id').eq('tutor_id', user.id)
      if (!readError && existing) { const stale = existing.map((row) => row.id).filter((id) => !sessions.some((session) => session.id === id)); if (stale.length) await supabase!.from('sessions').delete().in('id', stale) }
    })()
  }, [sessions, user?.id, dataReady])

  const visibleSessions = sessions.filter((session) => {
    const person = students.find((student) => student.id === session.studentId)?.name ?? ''
    return `${person} ${session.notes}`.toLowerCase().includes(search.toLowerCase())
  }).sort((a, b) => b.date.localeCompare(a.date))

  if (!dataReady) return <div className="auth-loading">Loading your students and sessions…</div>

  function saveSession(data: Omit<Session, 'id'>, id?: string) {
    if (id) setSessions((old) => old.map((session) => session.id === id ? { ...data, id } : session))
    else setSessions((old) => [{ ...data, id: crypto.randomUUID() }, ...old])
    setModal(null); setEditing(null); setToast(id ? 'Session updated' : 'Session saved')
  }
  function removeSession(id: string) { setSessions((old) => old.filter((session) => session.id !== id)); setToast('Session deleted') }
  function setStudent(patch: Partial<Student>) { if (selectedStudent) setStudents((old) => old.map((student) => student.id === selectedStudent.id ? { ...student, ...patch } : student)) }
  function openLog(session?: Session) { setEditing(session ?? null); setModal('session') }
  function exportReport() { const target = studentId ?? activeStudents[0]?.id; if (!target) { setToast('Add a student before preparing a report'); return } setStudentId(target); setExportMonth(monthKey(month)); setModal('export') }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><BookOpen size={19} strokeWidth={2.2} /></div><div><div className="brand-name">brightpath</div><div className="brand-caption">LVAEP tutor workspace</div></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="nav-list">
        <button className={`nav-item ${page === 'dashboard' && !studentId ? 'active' : ''}`} onClick={() => { setPage('dashboard'); setStudentId(null) }}><LayoutDashboard size={17} />Overview</button>
        <button className={`nav-item ${page === 'students' || studentId ? 'active' : ''}`} onClick={() => { setPage('students'); setStudentId(null) }}><Users size={17} />My students <span className="nav-count">{activeStudents.length}</span></button>
        <button className={`nav-item ${page === 'sessions' ? 'active' : ''}`} onClick={() => { setPage('sessions'); setStudentId(null) }}><CalendarDays size={17} />Sessions</button>
      </nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={16} /></div><div><b>Need a hand?</b><span>We're here to help</span></div><ArrowRight size={15} /></div><button className="profile-switch" onClick={() => { if (supabase) void supabase.auth.signOut() }}><div className="avatar avatar-user">{user?.email?.[0]?.toUpperCase() ?? 'M'}</div><span className="profile-copy"><b>{user?.email ?? 'Molly Zhong'}</b><small>{user ? 'Tutor · Sign out' : 'Tutor · Demo'}</small></span><MoreHorizontal size={18} className="profile-more" /></button></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumb"><span>LVAEP</span><ChevronRight size={14} />{studentId && selectedStudent ? <><button onClick={() => { setStudentId(null); setPage('students') }}>My students</button><ChevronRight size={14} /><b>{selectedStudent.name}</b></> : <b>{page === 'dashboard' ? 'Overview' : page === 'sessions' ? 'Sessions' : 'My students'}</b>}</div><div className="top-actions"><span className={`sync-status ${supabase ? 'connected' : ''}`}><i />{supabase ? 'Synced' : 'Demo mode'}</span><button className="icon-button" title="Settings"><Settings2 size={18} /></button><div className="avatar avatar-user top-avatar">M</div></div></header>
      <div className="content">
        {studentId && selectedStudent ? <StudentView student={selectedStudent} sessions={selectedSessions} month={month} setMonth={setMonth} openLog={openLog} setModal={setModal} setStudent={setStudent} exportReport={exportReport} onBack={() => { setStudentId(null); setPage('students') }} /> : page === 'dashboard' ? <Dashboard month={month} setMonth={setMonth} students={activeStudents} sessions={sessions} currentSessions={currentSessions} totalHours={totalHours} openStudent={(id) => id ? setStudentId(id) : setPage('students')} openLog={() => openLog()} exportReport={exportReport} /> : page === 'students' ? <StudentsView students={students} sessions={sessions} openStudent={(id) => setStudentId(id)} /> : <SessionsView sessions={visibleSessions} students={students} search={search} setSearch={setSearch} openLog={openLog} removeSession={removeSession} />}
      </div>
    </main>
    {modal === 'session' && <SessionModal students={activeStudents} initial={editing} onClose={() => { setModal(null); setEditing(null) }} onSave={saveSession} />}
    {modal === 'goals' && selectedStudent && <GoalsModal student={selectedStudent} onClose={() => setModal(null)} onSave={(goals, otherGoal) => { setStudent({ goals, otherGoal }); setModal(null); setToast('Goals updated') }} />}
    {modal === 'stopped' && selectedStudent && <StoppedModal student={selectedStudent} onClose={() => setModal(null)} onSave={(values) => { setStudent({ ...values, status: 'stopped' }); setModal(null); setToast('Student marked as stopped') }} />}
    {modal === 'export' && selectedStudent && <ExportModal student={selectedStudent} sessions={selectedSessions} tutorName={String(user?.user_metadata?.full_name ?? user?.email ?? 'Molly Zhong')} reportMonth={exportMonth} setReportMonth={setExportMonth} onClose={() => setModal(null)} />}
    {toast && <div className="toast"><span className="toast-check"><Check size={14} /></span>{toast}</div>}
  </div>
}

function MonthPicker({ month, setMonth }: { month: Date; setMonth: (date: Date) => void }) {
  return <div className="month-picker"><button aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={16} /></button><span>{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span><button aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={16} /></button></div>
}
function Dashboard({ month, setMonth, students, sessions, currentSessions, totalHours, openStudent, openLog, exportReport }: { month: Date; setMonth: (date: Date) => void; students: Student[]; sessions: Session[]; currentSessions: Session[]; totalHours: number; openStudent: (id: string) => void; openLog: () => void; exportReport: () => void }) {
  const monthHours = (id: string) => currentSessions.filter((item) => item.studentId === id).reduce((sum, item) => sum + item.hours, 0)
  const recent = [...sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
  return <>
    <div className="page-heading"><div><div className="eyebrow"><Sparkles size={13} /> YOUR TUTOR SPACE</div><h1>Good morning, Molly <span className="wave">✳</span></h1><p>Here’s your tutoring activity at a glance.</p></div><button className="button button-primary" onClick={openLog}><Plus size={17} />Log a session</button></div>
    <div className="welcome-strip"><div className="welcome-art"><div className="sun-circle" /><div className="hill hill-back" /><div className="hill hill-front" /><div className="little-flower">✳</div><div className="little-star">✦</div></div><div className="welcome-copy"><span className="welcome-kicker">A little progress adds up</span><b>Every session makes a difference.</b><span>Thanks for showing up for your students.</span></div><div className="welcome-note"><span>THIS MONTH</span><strong>{totalHours.toFixed(1)}<small> hrs</small></strong><i>across {currentSessions.length} sessions</i></div></div>
    <div className="metrics-grid"><Metric icon={<Clock3 size={18} />} label="Hours this month" value={totalHours.toFixed(1)} suffix="hrs" tone="mint" /><Metric icon={<CalendarDays size={18} />} label="Sessions logged" value={String(currentSessions.length).padStart(2, '0')} suffix="" tone="peach" /><Metric icon={<Users size={18} />} label="Active students" value={String(students.length).padStart(2, '0')} suffix="" tone="lilac" /></div>
    <div className="section-head"><div><h2>Your students</h2><p>A little support goes a long way.</p></div><button className="text-link" onClick={() => openStudent(students[0]?.id ?? '')}>View all students <ArrowRight size={15} /></button></div>
    <div className="student-grid">{students.slice(0, 3).map((student, index) => <button className="student-card" key={student.id} onClick={() => openStudent(student.id)}><div className={`student-avatar avatar-tone-${index % 3}`}>{initials(student.name)}</div><div className="student-card-main"><b>{student.name}</b><span>{student.site}</span><div className="student-monthly"><span className="mini-dot" />{currentSessions.filter((item) => item.studentId === student.id).length} sessions this month</div></div><div className="student-card-hours"><b>{monthHours(student.id).toFixed(1)}</b><span>hours</span><ChevronRight size={16} /></div></button>)}</div>
    <div className="below-grid"><section className="panel activity-panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Your latest session logs</p></div><button className="icon-button small" aria-label="More activity"><MoreHorizontal size={19} /></button></div><div className="activity-list">{recent.map((item) => { const student = students.find((s) => s.id === item.studentId); return <div className="activity-row" key={item.id}><div className="activity-date"><b>{dateLabel(item.date, { day: '2-digit' })}</b><span>{dateLabel(item.date, { month: 'short' })}</span></div><div className="activity-mark"><BookOpen size={15} /></div><div className="activity-detail"><b>{student?.name ?? 'Student'}</b><span>{item.notes || 'Tutoring session'}</span></div><div className="activity-hours">{item.hours.toFixed(1)} <small>hrs</small></div></div> })}</div></section><section className="panel month-panel"><div className="panel-heading"><div><h2>Monthly overview</h2><p>A quick look at your month</p></div><CalendarDays size={17} className="muted-icon" /></div><MonthPicker month={month} setMonth={setMonth} /><div className="month-summary"><div><span>Total sessions</span><b>{currentSessions.length}</b></div><div><span>Total hours</span><b>{totalHours.toFixed(1)} <small>hrs</small></b></div></div><button className="button button-secondary export-shortcut" onClick={exportReport}><FileText size={16} />Prepare monthly form<ArrowRight size={15} /></button></section></div>
  </>
}
function Metric({ icon, label, value, suffix, tone }: { icon: ReactNode; label: string; value: string; suffix: string; tone: string }) { return <div className="metric-card"><div className={`metric-icon ${tone}`}>{icon}</div><div className="metric-copy"><span>{label}</span><strong>{value}<small>{suffix}</small></strong></div><span className="metric-spark">↗</span></div> }

function StudentView({ student, sessions, month, setMonth, openLog, setModal, setStudent, exportReport, onBack }: { student: Student; sessions: Session[]; month: Date; setMonth: (date: Date) => void; openLog: (session?: Session) => void; setModal: (value: 'session' | 'goals' | 'stopped' | 'export' | null) => void; setStudent: (patch: Partial<Student>) => void; exportReport: () => void; onBack: () => void }) {
  const monthSessions = sessions.filter((item) => item.date.startsWith(monthKey(month))).sort((a, b) => b.date.localeCompare(a.date))
  const hours = monthSessions.reduce((sum, item) => sum + item.hours, 0)
  return <><button className="back-link" onClick={onBack}><ArrowLeft size={15} /> My students</button><div className="profile-heading"><div className="profile-person"><div className="student-avatar avatar-tone-0 profile-avatar">{initials(student.name)}</div><div><div className="eyebrow">STUDENT PROFILE <span className={`status-pill ${student.status}`}>{student.status === 'active' ? 'Active' : 'Stopped'}</span></div><h1>{student.name}</h1><p>{student.site}</p></div></div><div className="profile-actions"><button className="button button-secondary" onClick={() => setModal('goals')}><Check size={16} />Student goals</button><button className="button button-primary" onClick={() => openLog()}><Plus size={17} />Log session</button></div></div>
    <div className="profile-monthbar"><div><h2>Session history</h2><p>Sessions are organized automatically by date.</p></div><MonthPicker month={month} setMonth={setMonth} /></div>
    <div className="profile-stats"><div><span>Hours this month</span><b>{hours.toFixed(1)} <small>hrs</small></b></div><div><span>Sessions this month</span><b>{monthSessions.length.toString().padStart(2, '0')}</b></div><div><span>Goals achieved</span><b>{student.goals.length.toString().padStart(2, '0')}</b></div></div>
    <div className="panel history-panel"><div className="panel-heading"><div><h2>{month.toLocaleDateString('en-US', { month: 'long' })} sessions</h2><p>{monthSessions.length ? `${monthSessions.length} sessions · ${hours.toFixed(1)} total hours` : 'No sessions logged for this month yet.'}</p></div><button className="text-link" onClick={exportReport}><Download size={15} />Export monthly form</button></div>{monthSessions.length ? <div className="history-list">{monthSessions.map((session) => <div className="history-row" key={session.id}><div className="history-day"><b>{dateLabel(session.date, { day: '2-digit' })}</b><span>{dateLabel(session.date, { weekday: 'short', month: 'short' })}</span></div><div className="history-icon"><BookOpen size={16} /></div><div className="history-description"><b>{session.notes || 'Tutoring session'}</b><span>One-on-one tutoring</span></div><b className="history-hours">{session.hours.toFixed(1)} <small>hrs</small></b><button className="icon-button small" title="Edit session" onClick={() => openLog(session)}><Pencil size={15} /></button></div>)}</div> : <div className="empty-state"><div className="empty-icon"><CalendarDays size={22} /></div><b>A fresh page for {month.toLocaleDateString('en-US', { month: 'long' })}</b><span>Log a session and it’ll show up here.</span></div>}<div className="history-footer"><button className="button button-secondary" onClick={() => setModal('goals')}><Check size={15} />Manage student goals <span className="footer-count">{student.goals.length}</span></button><button className="button button-quiet" onClick={() => student.status === 'active' ? setModal('stopped') : setStudent({ status: 'active' })}>{student.status === 'active' ? 'End tutoring' : 'Mark active'}</button></div></div>
    {student.status === 'stopped' && <div className="stopped-note"><b>Tutoring ended</b><span>{student.stoppedReason || 'Reason not provided'}{student.stoppedDays ? ` · ${student.stoppedDays}` : ''}{student.stoppedTimes ? ` · ${student.stoppedTimes}` : ''}</span></div>}
  </>
}

function StudentsView({ students, sessions, openStudent }: { students: Student[]; sessions: Session[]; openStudent: (id: string) => void }) {
  return <><div className="page-heading"><div><div className="eyebrow">YOUR LEARNERS</div><h1>My students</h1><p>Keep up with the people you support.</p></div></div><div className="student-list-panel panel">{students.map((student, index) => { const count = sessions.filter((session) => session.studentId === student.id).length; const hours = sessions.filter((session) => session.studentId === student.id).reduce((sum, session) => sum + session.hours, 0); return <button className="student-list-row" key={student.id} onClick={() => openStudent(student.id)}><div className={`student-avatar avatar-tone-${index % 3}`}>{initials(student.name)}</div><div className="student-list-name"><b>{student.name}</b><span>{student.site}</span></div><span className={`status-pill ${student.status}`}>{student.status}</span><div className="student-list-stat"><b>{count}</b><span>sessions</span></div><div className="student-list-stat"><b>{hours.toFixed(1)}</b><span>hours total</span></div><ChevronRight size={17} className="muted-icon" /></button> })}</div></>
}
function SessionsView({ sessions, students, search, setSearch, openLog, removeSession }: { sessions: Session[]; students: Student[]; search: string; setSearch: (s: string) => void; openLog: (session?: Session) => void; removeSession: (id: string) => void }) {
  const [menu, setMenu] = useState<string | null>(null)
  return <><div className="page-heading"><div><div className="eyebrow">YOUR SESSION LOG</div><h1>Sessions</h1><p>All your tutoring sessions, in one place.</p></div><button className="button button-primary" onClick={() => openLog()}><Plus size={17} />Log a session</button></div><div className="panel sessions-panel"><div className="table-toolbar"><div className="search-box"><Search size={16} /><input placeholder="Search students or notes" value={search} onChange={(e) => setSearch(e.target.value)} /></div><span className="record-count">{sessions.length} sessions</span></div><div className="session-table-wrap"><table className="session-table"><thead><tr><th>DATE</th><th>STUDENT</th><th>SESSION NOTES</th><th>HOURS</th><th /></tr></thead><tbody>{sessions.map((session) => <tr key={session.id}><td className="table-date">{dateLabel(session.date, { month: 'short', day: 'numeric', year: 'numeric' })}</td><td><span className="table-student"><span className="table-avatar">{initials(students.find((s) => s.id === session.studentId)?.name ?? '?')}</span>{students.find((s) => s.id === session.studentId)?.name ?? 'Student'}</span></td><td className="table-notes">{session.notes || '—'}</td><td><b>{session.hours.toFixed(1)}</b> <span className="table-muted">hrs</span></td><td className="row-menu-cell"><button className="icon-button small" onClick={() => setMenu(menu === session.id ? null : session.id)}><MoreHorizontal size={17} /></button>{menu === session.id && <div className="row-menu"><button onClick={() => { openLog(session); setMenu(null) }}><Pencil size={14} />Edit session</button><button className="danger-action" onClick={() => { removeSession(session.id); setMenu(null) }}><Trash2 size={14} />Delete session</button></div>}</td></tr>)}</tbody></table>{!sessions.length && <div className="empty-state">No sessions found.</div>}</div></div></>
}

function ModalFrame({ title, subtitle, onClose, children, wide = false }: { title: string; subtitle: string; onClose: () => void; children: ReactNode; wide?: boolean }) { return <div className="modal-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className={`modal-card ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true"><div className="modal-header"><div><h2>{title}</h2><p>{subtitle}</p></div><button className="icon-button" aria-label="Close" onClick={onClose}><X size={19} /></button></div>{children}</section></div> }
function SessionModal({ students, initial, onClose, onSave }: { students: Student[]; initial: Session | null; onClose: () => void; onSave: (data: Omit<Session, 'id'>, id?: string) => void }) {
  const [studentId, setStudentId] = useState(initial?.studentId ?? students[0]?.id ?? '')
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10))
  const [hours, setHours] = useState(initial?.hours ?? 1)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [error, setError] = useState('')
  function submit(event: FormEvent) { event.preventDefault(); if (!studentId || !date || !Number.isFinite(Number(hours)) || Number(hours) <= 0 || Number(hours) > 12) { setError('Choose a student, date, and a duration between 0 and 12 hours.'); return } onSave({ studentId, date, hours: Number(hours), notes: notes.trim() }, initial?.id) }
  return <ModalFrame title={initial ? 'Edit session' : 'Log a session'} subtitle="A few details, then you’re all set." onClose={onClose}><form className="form-body" onSubmit={submit}><label>Student<select value={studentId} onChange={(e) => setStudentId(e.target.value)} required>{students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></label><label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label><label>How long?<div className="hours-input"><input type="number" min="0.25" max="12" step="0.25" value={hours} onChange={(e) => setHours(Number(e.target.value))} required /><span>hours</span></div><small className="field-hint">Use quarter-hour increments, like 1.5.</small></label><label>Session notes <span className="optional">OPTIONAL</span><textarea rows={3} placeholder="What did you work on together?" value={notes} onChange={(e) => setNotes(e.target.value)} /></label>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-primary"><Check size={16} />{initial ? 'Save changes' : 'Save session'}</button></div></form></ModalFrame>
}
function GoalsModal({ student, onClose, onSave }: { student: Student; onClose: () => void; onSave: (goals: string[], otherGoal: string) => void }) {
  const [goals, setGoals] = useState(student.goals)
  const [otherGoal, setOtherGoal] = useState(student.otherGoal)
  function toggle(goal: string) { setGoals((old) => old.includes(goal) ? old.filter((item) => item !== goal) : [...old, goal]) }
  return <ModalFrame title="Student goals" subtitle={`Track achievements for ${student.name}.`} onClose={onClose} wide><form className="goals-body" onSubmit={(event) => { event.preventDefault(); onSave(goals, otherGoal) }}><p className="goal-instruction"><Check size={15} />Check a goal when the student achieves it. Completed goals are included on the monthly form.</p><div className="goals-grid">{goalGroups.map((group) => <div className="goal-group" key={group.category}><h3>{group.category}</h3>{group.goals.map((goal) => <label className="goal-check" key={goal}><input type="checkbox" checked={goals.includes(goal)} onChange={() => toggle(goal)} /><span className="custom-check"><Check size={12} /></span><span>{goal}</span></label>)}</div>)}</div><label className="other-goal">Other goal <span className="optional">OPTIONAL</span><input value={otherGoal} onChange={(e) => setOtherGoal(e.target.value)} placeholder="Add a goal not listed above" /></label><div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-primary"><Check size={16} />Save goals</button></div></form></ModalFrame>
}
function StoppedModal({ student, onClose, onSave }: { student: Student; onClose: () => void; onSave: (values: Pick<Student, 'stoppedReason' | 'stoppedDays' | 'stoppedTimes'>) => void }) {
  const [reason, setReason] = useState(student.stoppedReason)
  const [days, setDays] = useState(student.stoppedDays)
  const [times, setTimes] = useState(student.stoppedTimes)
  return <ModalFrame title="End tutoring" subtitle={`Record the details for ${student.name}.`} onClose={onClose}><form className="form-body" onSubmit={(event) => { event.preventDefault(); onSave({ stoppedReason: reason, stoppedDays: days, stoppedTimes: times }) }}><div className="notice-box"><CircleHelp size={17} /><span>Marking this student as stopped removes them from your active student list. You can reactivate them from their profile.</span></div><label>Reason<input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason tutoring ended" /></label><label>Day(s)<input value={days} onChange={(e) => setDays(e.target.value)} placeholder="e.g. Tuesdays and Thursdays" /></label><label>Time(s)<input value={times} onChange={(e) => setTimes(e.target.value)} placeholder="e.g. 4:00–5:30 PM" /></label><div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-primary">Mark as stopped</button></div></form></ModalFrame>
}

function ExportModal({ student, sessions, tutorName, reportMonth, setReportMonth, onClose }: { student: Student; sessions: Session[]; tutorName: string; reportMonth: string; setReportMonth: (value: string) => void; onClose: () => void }) {
  const [notice, setNotice] = useState('')
  const reportDate = new Date(`${reportMonth}-01T12:00:00`)
  const reportSessions = sessions.filter((session) => session.date.startsWith(reportMonth))
  const hours = reportSessions.reduce((sum, session) => sum + session.hours, 0)
  const totalDays = new Date(reportDate.getFullYear(), reportDate.getMonth() + 1, 0).getDate()
  const byDay = new Map<number, number>()
  reportSessions.forEach((session) => { const day = Number(session.date.slice(8, 10)); byDay.set(day, (byDay.get(day) ?? 0) + session.hours) })
  function printReport() { document.body.classList.add('printing-report'); window.print(); window.setTimeout(() => document.body.classList.remove('printing-report'), 500); setNotice('Choose “Save as PDF” in the print dialog to download your report.') }
  return <ModalFrame title="Export monthly form" subtitle="Review the report, then save a PDF copy." onClose={onClose} wide><div className="export-config"><label>Reporting month<input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} /></label><div className="export-total"><span>Monthly total</span><b>{hours.toFixed(1)} <small>hours</small></b></div><button className="button button-primary" onClick={printReport}><Download size={16} />Print / save as PDF</button></div>{notice && <div className="export-notice">{notice}</div>}<div className="report-preview" id="report-preview"><div className="report-topline"><b>LVAEP</b><span>STUDENT ATTENDANCE &amp; ACHIEVEMENT</span></div><h2>Student Attendance &amp; Achievement Form</h2><div className="report-meta"><span><b>Tutor</b><i>{tutorName}</i></span><span><b>Student</b><i>{student.name}</i></span><span><b>Tutoring site</b><i>{student.site}</i></span><span><b>Reporting month</b><i>{reportDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</i></span></div><h3>Attendance</h3><p className="report-instruction">Enter the number of tutoring hours on each day of the month.</p><table className="report-grid"><thead><tr><th>Day</th><th>Hours</th><th>Day</th><th>Hours</th></tr></thead><tbody>{Array.from({ length: Math.ceil(totalDays / 2) }, (_, i) => { const first = i + 1; const second = first + Math.ceil(totalDays / 2); return <tr key={i}><td>{first}</td><td>{byDay.has(first) ? byDay.get(first)?.toFixed(2) : ''}</td><td>{second <= totalDays ? second : ''}</td><td>{second <= totalDays && byDay.has(second) ? byDay.get(second)?.toFixed(2) : ''}</td></tr> })}</tbody></table><div className="report-total">Total tutoring hours <b>{hours.toFixed(1)}</b></div><h3>Achievement goals</h3><p className="report-instruction">Place a check next to each student’s goal when attained.</p><div className="report-goal-grid">{goalGroups.map((group) => <div key={group.category}><b>{group.category}</b>{group.goals.map((goal) => <span key={goal}>{student.goals.includes(goal) ? '✓' : '□'} {goal}</span>)}</div>)}</div>{student.otherGoal && <div className="report-other"><b>Other(s)</b><span>{student.otherGoal}</span></div>}{student.status === 'stopped' && <div className="report-stopped"><h3>Student no longer being tutored</h3><p><b>Reason:</b> {student.stoppedReason || '—'} &nbsp; <b>Day(s):</b> {student.stoppedDays || '—'} &nbsp; <b>Time(s):</b> {student.stoppedTimes || '—'}</p></div>}<div className="report-footer">LVAEP · Student Attendance &amp; Achievement Form <span>Generated {new Date().toLocaleDateString('en-US')}</span></div></div><div className="export-bottom"><span><FileText size={15} />One report per student, matching the LVAEP form sections.</span><button className="button button-secondary" onClick={onClose}>Done</button></div></ModalFrame>
}

export default App
