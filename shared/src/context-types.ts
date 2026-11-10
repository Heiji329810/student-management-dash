import type { CommandArgs, CommandName } from "./contracts.js";
import type { createSelectors } from "./selectors.js";
import type { AppState } from "./state.js";
import type { User } from "./types.js";
export type AppContextType = Omit<AppState, "readNotificationIds"> &
  ReturnType<typeof createSelectors> & {
    currentUser: User | null;
    isAuthenticated: boolean;
    loading: boolean;
    busy: boolean;
    error: string;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
  } & { [K in CommandName]: (...args: CommandArgs<K>) => Promise<boolean> };
