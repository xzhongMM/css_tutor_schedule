import type { GoalGroup, Session, Student } from './types'

export const goalGroups: GoalGroup[] = [
  { category: 'Economic', goals: ['Enter Employment', 'Retain Employment', 'Leave public assistance', 'Achieve work-based project learner goal', 'Enter Occupational Skills Training Program'] },
  { category: 'Educational', goals: ['Obtain High School Diploma', 'Enter Postsecondary Education'] },
  { category: 'Family', goals: ['Help more frequently with school', "Increase contact with children's teachers", "More involvement in children's school activities", 'Purchase books or magazines', 'Read to children', 'Visit the library with/for children'] },
  { category: 'Societal / Community', goals: ['Obtain citizenship', 'Achieve civics skills', 'Increase involvement in community activities', 'Vote or register to vote'] },
]

const today = new Date()
const y = today.getFullYear()
const m = String(today.getMonth() + 1).padStart(2, '0')
export const seedStudents: Student[] = [
  { id: 's1', name: 'Alex Johnson', site: 'Eastside Learning Center', status: 'active', goals: ['Enter Postsecondary Education'], otherGoal: '', stoppedReason: '', stoppedDays: '', stoppedTimes: '' },
  { id: 's2', name: 'Jamie Chen', site: 'Eastside Learning Center', status: 'active', goals: ['Obtain High School Diploma', 'Read to children'], otherGoal: '', stoppedReason: '', stoppedDays: '', stoppedTimes: '' },
  { id: 's3', name: 'Sam Rivera', site: 'North Community Hub', status: 'active', goals: [], otherGoal: '', stoppedReason: '', stoppedDays: '', stoppedTimes: '' },
]
export const seedSessions: Session[] = [
  { id: 'a1', studentId: 's1', date: `${y}-${m}-22`, hours: 1.5, notes: 'Algebra practice' },
  { id: 'a2', studentId: 's2', date: `${y}-${m}-19`, hours: 1, notes: 'Reading comprehension' },
  { id: 'a3', studentId: 's1', date: `${y}-${m}-15`, hours: 1.5, notes: 'Quadratic equations' },
  { id: 'a4', studentId: 's3', date: `${y}-${m}-12`, hours: 2, notes: 'Study skills' },
  { id: 'a5', studentId: 's2', date: `${y}-${m}-08`, hours: 1.5, notes: 'Essay planning' },
  { id: 'a6', studentId: 's1', date: `${y}-${m}-05`, hours: 2, notes: 'Homework support' },
  { id: 'a7', studentId: 's3', date: `${y}-${m}-03`, hours: 1, notes: 'Math review' },
]
