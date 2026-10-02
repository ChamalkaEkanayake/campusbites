import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { notificationApi, Notification } from '../api/notificationApi';
import { AuthContext } from './AuthContext';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  hasMore: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

export const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  hasMore: false,
  refresh: async () => {},
  loadMore: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  deleteNotification: async () => {}
});

const POLL_INTERVAL_MS = 30_000; // 30 seconds — lightweight polling for badge updates

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { token } = useContext(AuthContext);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // ── Fetch unread count only (lightweight, for badge) ────────────────
  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const { unreadCount: count } = await notificationApi.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Silently ignore — badge just won't update until next poll
    }
  }, [token]);

  // ── Full notification list fetch (page 1 refresh) ────────────────────
  const refresh = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await notificationApi.getNotifications(1, 20);
      setNotifications(data.notifications);
      setUnreadCount(data.notifications.filter(n => !n.isRead).length);
      setCurrentPage(1);
      setHasMore(data.pagination.pages > 1);
    } catch {
      // Gracefully degrade — UI keeps showing stale data
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // ── Load more pages (infinite scroll) ──────────────────────────────
  const loadMore = useCallback(async () => {
    if (!token || isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      const nextPage = currentPage + 1;
      const data = await notificationApi.getNotifications(nextPage, 20);
      setNotifications(prev => [...prev, ...data.notifications]);
      setCurrentPage(nextPage);
      setHasMore(nextPage < data.pagination.pages);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [token, isLoading, hasMore, currentPage]);

  // ── Mark a single notification as read ──────────────────────────────
  const markAsRead = useCallback(async (id: string) => {
    if (!token) return;
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  }, [token]);

  // ── Mark all as read ────────────────────────────────────────────────
  const markAllAsRead = useCallback(async () => {
    if (!token) return;
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }, [token]);

  // ── Delete notification ─────────────────────────────────────────────
  const deleteNotification = useCallback(async (id: string) => {
    if (!token) return;
    const notif = notifications.find(n => n._id === id);
    try {
      await notificationApi.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      if (notif && !notif.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch {
      // ignore
    }
  }, [token, notifications]);

  // ── Initial load when user logs in ─────────────────────────────────
  useEffect(() => {
    if (token) {
      refresh();
    } else {
      // Reset on logout
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [token]);

  // ── Polling: update unread count every 30s when app is active ───────
  useEffect(() => {
    if (!token) return;

    const startPolling = () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
      pollTimer.current = setInterval(fetchUnreadCount, POLL_INTERVAL_MS);
    };

    startPolling();

    // Pause polling when app is backgrounded; resume on foreground
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        fetchUnreadCount();
        startPolling();
      } else if (nextState.match(/inactive|background/)) {
        if (pollTimer.current) {
          clearInterval(pollTimer.current);
          pollTimer.current = null;
        }
      }
      appState.current = nextState;
    });

    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
      subscription.remove();
    };
  }, [token, fetchUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        hasMore,
        refresh,
        loadMore,
        markAsRead,
        markAllAsRead,
        deleteNotification
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
