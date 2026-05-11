import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  phone: string | null;
  role: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  hasHydrated: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  logout: () => void;
  markHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      hasHydrated: false,
      setAuth: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
      markHydrated: () => set({ hasHydrated: true }),
    }),
    {
      name: 'penalty-system-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);
