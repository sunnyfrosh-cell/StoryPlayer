import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Animated, StyleSheet, View, Text, Pressable } from 'react-native';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react-native';
import { colors, spacing, radius, typography, shadows } from '@/theme';

export type ToastVariant = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const VARIANT_CONFIG: Record<ToastVariant, { color: string; Icon: typeof Info }> = {
  success: { color: colors.success, Icon: CheckCircle },
  error: { color: colors.error, Icon: AlertCircle },
  info: { color: colors.secondary, Icon: Info },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = `toast_${++counter.current}`;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (m: string) => show(m, 'success'),
      error: (m: string) => show(m, 'error'),
      info: (m: string) => show(m, 'info'),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((toast) => {
          const { color, Icon } = VARIANT_CONFIG[toast.variant];
          return (
            <ToastItem
              key={toast.id}
              toast={toast}
              color={color}
              Icon={Icon}
              onDismiss={() => dismiss(toast.id)}
            />
          );
        })}
      </View>
    </ToastContext.Provider>
  );
}

interface ToastItemProps {
  toast: Toast;
  color: string;
  Icon: typeof Info;
  onDismiss: () => void;
}

function ToastItem({ toast, color, Icon, onDismiss }: ToastItemProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  Animated.timing(opacity, {
    toValue: 1,
    duration: 220,
    useNativeDriver: true,
  }).start();

  return (
    <Animated.View style={[styles.toast, { opacity, borderLeftColor: color }]}>
      <Icon size={18} color={color} />
      <Text style={[typography.label, styles.message]}>{toast.message}</Text>
      <Pressable onPress={onDismiss} hitSlop={10}>
        <X size={16} color={colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: spacing['2xl'],
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.base,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderLeftWidth: 3,
    maxWidth: 360,
    width: '100%',
    ...shadows.md,
  },
  message: {
    flex: 1,
    color: colors.text,
  },
});

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
