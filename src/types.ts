export type StudentStatus = 'active' | 'stopped'
export type Student = { id: string; name: string; site: string; status: StudentStatus; goals: string[]; otherGoal: string; stoppedReason: string; stoppedDays: string; stoppedTimes: string }
export type Session = { id: string; studentId: string; date: string; hours: number; notes: string }
export type GoalGroup = { category: string; goals: string[] }
