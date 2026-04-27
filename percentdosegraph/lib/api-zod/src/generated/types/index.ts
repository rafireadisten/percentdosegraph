export type CreateDrugInput = {
  name: string;
  genericName?: string;
  drugClass?: string;
  maxDailyDose?: number;
  maxSingleDose?: number;
  unit?: string;
  notes?: string;
};

export type CreateDoseInput = {
  drugId?: number;
  date: string;
  endDate?: string;
  route: string;
  amount: number;
  notes?: string;
};

export type CreateProfileInput = {
  name: string;
  payload: Record<string, unknown>;
};
