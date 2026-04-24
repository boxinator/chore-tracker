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
};

export type DashboardChild = {
  id: string;
  name: string;
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
  assigneeChildId: string | null;
  scheduleDays: number[];
};

export type AssignChildOption = {
  id: string;
  name: string;
};

export type Reward = {
  id: string;
  name: string;
  description: string;
  cost: number;
  isActive: boolean;
};

export type RewardsResponse = {
  rewards: Reward[];
};

export type RedeemRewardResult = {
  previousTotal: number;
  newTotal: number;
};
