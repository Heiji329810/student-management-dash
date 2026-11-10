import { createContext, useContext } from 'react';
import type { AppContextType } from '@student-dash/shared/context-types';

export const AppContext = createContext<AppContextType | undefined>(undefined);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}

export function useWritePending() {
  return useContext(AppContext)?.busy ?? false;
}
