import { t as translate } from '@/i18n'
export enum TicketStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

export enum StatusType {
  BACKLOG = 'BACKLOG',
  UNSTARTED = 'UNSTARTED',
  STARTED = 'STARTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TicketPriority {
  NO_PRIORITY = 'NO_PRIORITY',
  URGENT = 'URGENT',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export const TICKET_STATUS_OPTIONS = [
  { get label() { return translate("Todo") }, value: TicketStatus.TODO },
  { get label() { return translate("In Progress") }, value: TicketStatus.IN_PROGRESS },
  { get label() { return translate("Done") }, value: TicketStatus.DONE },
]

export const STATUS_TYPE_OPTIONS = [
  { get label() { return translate("Backlog") }, value: StatusType.BACKLOG },
  { get label() { return translate("Unstarted") }, value: StatusType.UNSTARTED },
  { get label() { return translate("Started") }, value: StatusType.STARTED },
  { get label() { return translate("Completed") }, value: StatusType.COMPLETED },
  { get label() { return translate("Cancelled") }, value: StatusType.CANCELLED },
]

export const DEFAULT_STATUSES: {
  key: string
  name: string
  type: StatusType
  order: number
  legacy: TicketStatus
}[] = [
  { key: 'todo', name: 'Todo', type: StatusType.UNSTARTED, order: 1000, legacy: TicketStatus.TODO },
  {
    key: 'in_progress',
    name: 'In Progress',
    type: StatusType.STARTED,
    order: 2000,
    legacy: TicketStatus.IN_PROGRESS,
  },
  { key: 'done', name: 'Done', type: StatusType.COMPLETED, order: 3000, legacy: TicketStatus.DONE },
]

export const LEGACY_STATUS_KEYS: Record<string, string> = {
  [TicketStatus.TODO]: 'todo',
  [TicketStatus.IN_PROGRESS]: 'in_progress',
  [TicketStatus.DONE]: 'done',
}

export const TICKET_PRIORITY_OPTIONS = [
  { get label() { return translate("No Priority") }, value: TicketPriority.NO_PRIORITY },
  { get label() { return translate("Urgent") }, value: TicketPriority.URGENT },
  { get label() { return translate("High") }, value: TicketPriority.HIGH },
  { get label() { return translate("Medium") }, value: TicketPriority.MEDIUM },
  { get label() { return translate("Low") }, value: TicketPriority.LOW },
]

export const PROJECT_STATUS_OPTIONS = [
  { get label() { return translate("Active") }, value: ProjectStatus.ACTIVE },
  { get label() { return translate("On Hold") }, value: ProjectStatus.ON_HOLD },
  { get label() { return translate("Completed") }, value: ProjectStatus.COMPLETED },
  { get label() { return translate("Cancelled") }, value: ProjectStatus.CANCELLED },
]

export const PROJECT_ICONS = [
  'folder',
  'rocket',
  'zap',
  'star',
  'heart',
  'flag',
  'target',
  'briefcase',
  'code',
  'box',
  'layers',
  'database',
  'megaphone',
  'cloud',
  'users',
]

export const PROJECT_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
]

export enum CycleRollover {
  NEXT = 'NEXT',
  BACKLOG = 'BACKLOG',
  NONE = 'NONE',
}

export enum CycleAutomation {
  AUTOMATIC = 'AUTOMATIC',
  MANUAL = 'MANUAL',
}

export const CYCLE_ROLLOVER_OPTIONS = [
  { get label() { return translate("Move to the next cycle") }, value: CycleRollover.NEXT },
  { get label() { return translate("Move back to the backlog") }, value: CycleRollover.BACKLOG },
  { get label() { return translate("Leave in the closed cycle") }, value: CycleRollover.NONE },
]

export const CYCLE_AUTOMATION_OPTIONS = [
  { get label() { return translate("Automatic") }, value: CycleAutomation.AUTOMATIC },
  { get label() { return translate("Manual") }, value: CycleAutomation.MANUAL },
]

export const CYCLE_START_DAY_OPTIONS = [
  { get label() { return translate("Monday") }, value: 1 },
  { get label() { return translate("Tuesday") }, value: 2 },
  { get label() { return translate("Wednesday") }, value: 3 },
  { get label() { return translate("Thursday") }, value: 4 },
  { get label() { return translate("Friday") }, value: 5 },
  { get label() { return translate("Saturday") }, value: 6 },
  { get label() { return translate("Sunday") }, value: 0 },
]

export const CYCLE_LENGTH_OPTIONS = [
  { get label() { return translate("1 week") }, value: 1 },
  { get label() { return translate("2 weeks") }, value: 2 },
  { get label() { return translate("3 weeks") }, value: 3 },
  { get label() { return translate("4 weeks") }, value: 4 },
  { get label() { return translate("6 weeks") }, value: 6 },
  { get label() { return translate("8 weeks") }, value: 8 },
]
export enum LabelColor {
  SLATE = 'SLATE',
  INDIGO = 'INDIGO',
  BLUE = 'BLUE',
  GREEN = 'GREEN',
  AMBER = 'AMBER',
  RED = 'RED',
}

export const LABEL_COLOR_OPTIONS = [
  { get label() { return translate("Slate") }, value: LabelColor.SLATE },
  { get label() { return translate("Indigo") }, value: LabelColor.INDIGO },
  { get label() { return translate("Blue") }, value: LabelColor.BLUE },
  { get label() { return translate("Green") }, value: LabelColor.GREEN },
  { get label() { return translate("Amber") }, value: LabelColor.AMBER },
  { get label() { return translate("Red") }, value: LabelColor.RED },
]

export enum EstimateScale {
  LINEAR = 'LINEAR',
  EXPONENTIAL = 'EXPONENTIAL',
  FIBONACCI = 'FIBONACCI',
  TSHIRT = 'TSHIRT',
}

export const ESTIMATE_SCALE_OPTIONS = [
  { get label() { return translate("Linear — 1, 2, 3, 4, 5") }, value: EstimateScale.LINEAR },
  { get label() { return translate("Fibonacci — 1, 2, 3, 5, 8, 13") }, value: EstimateScale.FIBONACCI },
  { get label() { return translate("Exponential — 1, 2, 4, 8, 16") }, value: EstimateScale.EXPONENTIAL },
  { get label() { return translate("T-shirt — XS, S, M, L, XL") }, value: EstimateScale.TSHIRT },
]

export const LEGACY_LABEL_COLORS: Record<string, LabelColor> = {
  '#64748b': LabelColor.SLATE,
  '#6366f1': LabelColor.INDIGO,
  '#8b5cf6': LabelColor.INDIGO,
  '#a855f7': LabelColor.INDIGO,
  '#d946ef': LabelColor.INDIGO,
  '#ec4899': LabelColor.RED,
  '#ef4444': LabelColor.RED,
  '#f97316': LabelColor.AMBER,
  '#f59e0b': LabelColor.AMBER,
  '#eab308': LabelColor.AMBER,
  '#22c55e': LabelColor.GREEN,
  '#10b981': LabelColor.GREEN,
  '#14b8a6': LabelColor.GREEN,
  '#06b6d4': LabelColor.BLUE,
  '#3b82f6': LabelColor.BLUE,
}

export enum InitiativeStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export const INITIATIVE_STATUS_OPTIONS = [
  { get label() { return translate("Planned") }, value: InitiativeStatus.PLANNED },
  { get label() { return translate("Active") }, value: InitiativeStatus.ACTIVE },
  { get label() { return translate("Completed") }, value: InitiativeStatus.COMPLETED },
  { get label() { return translate("Cancelled") }, value: InitiativeStatus.CANCELLED },
]

export const INITIATIVE_ICONS = [
  'target',
  'rocket',
  'flag',
  'star',
  'zap',
  'layers',
  'briefcase',
  'megaphone',
  'heart',
  'cloud',
]
