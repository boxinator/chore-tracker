export type HealthResponse = {
  status: string;
  timestamp: string;
  app: string;
  databasePath: string;
};

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

export type DashboardChild = {
  id: string;
  name: string;
  avatarKey: string | null;
  totalPoints: number;
  chores: VisibleChore[];
};

export type DashboardResponse = {
  currentDateLocal: string;
  dayOfWeek: number;
  unassignedChores: VisibleChore[];
  children: DashboardChild[];
};

export type CreateChoreInput = {
  title: string;
  description: string;
  pointValue: number;
  assignments: ChoreAssignment[];
  unassignedScheduleDays: number[];
};

export type UpdateChoreInput = CreateChoreInput;

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

export type HistoryResponse = {
  entries: HistoryEntry[];
};

export type RedeemRewardResult = {
  previousTotal: number;
  newTotal: number;
};
