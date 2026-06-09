import { create } from 'zustand';

export interface Filters {
  cropType: string;
  soilType: string;
  irrigationType: string;
  season: string;
  yieldRange: [number, number];
  areaRange: [number, number];
  fertilizerRange: [number, number];
  pesticideRange: [number, number];
  waterRange: [number, number];
}

interface AuthState {
  token: string | null;
  role: string | null;
  email: string | null;
  isAuthenticated: boolean;
}

interface PlatformState {
  filters: Filters;
  auth: AuthState;
  setFilter: (key: keyof Filters, value: any) => void;
  resetFilters: () => void;
  login: (token: string, email: string, role: string) => void;
  logout: () => void;
}

const initialFilters: Filters = {
  cropType: 'All',
  soilType: 'All',
  irrigationType: 'All',
  season: 'All',
  yieldRange: [0, 100],
  areaRange: [0, 1000],
  fertilizerRange: [0, 50],
  pesticideRange: [0, 50],
  waterRange: [0, 200000],
};

export const useStore = create<PlatformState>((set) => ({
  filters: initialFilters,
  auth: {
    token: localStorage.getItem('agri_auth_token'),
    role: localStorage.getItem('agri_auth_role'),
    email: localStorage.getItem('agri_auth_email'),
    isAuthenticated: !!localStorage.getItem('agri_auth_token'),
  },
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),
  resetFilters: () => set({ filters: initialFilters }),
  login: (token, email, role) => {
    localStorage.setItem('agri_auth_token', token);
    localStorage.setItem('agri_auth_role', role);
    localStorage.setItem('agri_auth_email', email);
    set({
      auth: { token, email, role, isAuthenticated: true },
    });
  },
  logout: () => {
    localStorage.removeItem('agri_auth_token');
    localStorage.removeItem('agri_auth_role');
    localStorage.removeItem('agri_auth_email');
    set({
      auth: { token: null, email: null, role: null, isAuthenticated: false },
    });
  },
}));
