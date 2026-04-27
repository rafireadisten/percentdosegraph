import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  user: { id: string; name: string; email: string } | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: any) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setAuth: (token, user) =>
        set({ token, user, isAuthenticated: true }),
      clearAuth: () =>
        set({ token: null, user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

interface WorkspaceState {
  patientName: string;
  route: string;
  timeframe: string;
  selectedDrugIds: string[];
  setPatientName: (name: string) => void;
  setRoute: (route: string) => void;
  setTimeframe: (timeframe: string) => void;
  setSelectedDrugIds: (ids: string[]) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      patientName: 'Example Patient',
      route: 'PO',
      timeframe: '1y',
      selectedDrugIds: [],
      setPatientName: (name) => set({ patientName: name }),
      setRoute: (route) => set({ route }),
      setTimeframe: (timeframe) => set({ timeframe }),
      setSelectedDrugIds: (ids) => set({ selectedDrugIds: ids }),
    }),
    {
      name: 'workspace-storage',
    }
  )
);
