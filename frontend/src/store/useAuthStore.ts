import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
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
      user: { id: 'bypass-id', email: 'lovec23@iitk.ac.in', role: 'SUPERADMIN' },
      token: 'bypass-token-value',
      hasHydrated: false,
      setAuth: (user, token) => set({ user, token }),
      logout: () => set({
        user: { id: 'bypass-id', email: 'lovec23@iitk.ac.in', role: 'SUPERADMIN' },
        token: 'bypass-token-value'
      }),
      markHydrated: () => set({ hasHydrated: true }),
    }),
    {
      name: 'penalty-system-auth-bypass',
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
