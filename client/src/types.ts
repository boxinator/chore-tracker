export type VisibleChore = {
  id: string;
  title: string;
  description: string;
  pointValue: number;
  assigneeChildId: string | null;
  isCompletedToday: boolean;
  scheduledDays: number[];
  assignments: ChoreAssignment[];
  unassignedScheduleDays: number[];
};

export type ChoreAssignment = {
  childId: string;
  days: number[];
};

export type VisibleTask = {
  id: string;
  title: string;
  description: string;
  assigneeChildId: string;
  isCompletedToday: boolean;
};

export type DashboardChild = {
  id: string;
  name: string;
  avatarKey: string | null;
  totalPoints: number;
  tasks: VisibleTask[];
  chores: VisibleChore[];
};

export type DashboardResponse = {
  currentDateLocal: string;
  dayOfWeek: number;
  progressGoal: ProgressGoal | null;
  unassignedChores: VisibleChore[];
  children: DashboardChild[];
};

export type CalendarChild = {
  id: string;
  name: string;
  avatarKey: string | null;
};

export type CalendarTask = {
  id: string;
  title: string;
  description: string;
  assigneeChildId: string;
};

export type CalendarDay = {
  dateLocal: string;
  dayOfWeek: number;
  chores: VisibleChore[];
};

export type WeekCalendarResponse = {
  weekStartLocal: string;
  weekEndLocal: string;
  children: CalendarChild[];
  days: CalendarDay[];
  ongoingTasks: CalendarTask[];
};

export type CreateChoreInput = {
  title: string;
  description: string;
  pointValue: number;
  assignments: ChoreAssignment[];
  unassignedScheduleDays: number[];
};

export type UpdateChoreInput = CreateChoreInput;

export type CreateTaskInput = {
  title: string;
  description: string;
  childId: string;
};

export type Child = {
  id: string;
  name: string;
  avatarKey: string | null;
  sortOrder: number;
};

export type ChildInput = {
  name?: string;
  avatarKey?: string | null;
};

export type Reward = {
  id: string;
  name: string;
  description: string;
  cost: number;
  isActive: boolean;
};

export type HistoryEntry = {
  id: string;
  eventType: string;
  childId: string;
  childName: string;
  sourceType: string;
  sourceId: string;
  sourceName: string;
  pointDelta: number;
  timestamp: string;
};

export type RewardsResponse = {
  rewards: Reward[];
};

export type ChildrenResponse = {
  children: Child[];
};

export type RewardInput = {
  name: string;
  description: string;
  cost: number;
};

export type ProgressGoal = {
  id: string;
  name: string;
  targetPoints: number;
  startDateLocal: string;
  status: "active" | "awarded";
  awardedAt: string | null;
  earnedPoints: number;
  percentComplete: number;
};

export type ProgressGoalResponse = {
  progressGoal: ProgressGoal | null;
};

export type ProgressGoalInput = {
  name: string;
  targetPoints: number;
  startDateLocal: string;
};

export type HistoryResponse = {
  entries: HistoryEntry[];
};

export type AdjustmentInput = {
  childId: string;
  operation: "add" | "subtract";
  amount: number;
  reason: string;
};

export type RedeemRewardResult = {
  previousTotal: number;
  newTotal: number;
};
