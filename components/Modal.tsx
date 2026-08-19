import { Modal as RNModal, View, StyleSheet, Pressable, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { colors, spacing, radius, typography } from '@/theme';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export function Modal({ visible, onClose, title, children, footer }: ModalProps) {
  const translateY = useSharedValue(SCREEN_HEIGHT);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleShow = () => {
    translateY.value = withSpring(0, { damping: 22, stiffness: 240 });
  };
  const handleHide = () => {
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 220 });
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      onShow={handleShow}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View style={[styles.sheet, animatedStyle]}>
          <SafeAreaView style={styles.safeArea} edges={['bottom']}>
            <View style={styles.handle} />
            {title ? (
              <View style={styles.header}>
                <Animated.Text style={[typography.h3, styles.title]}>{title}</Animated.Text>
                <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                  <X size={22} color={colors.textSecondary} />
                </Pressable>
              </View>
            ) : null}
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.body}
            >
              {children}
            </KeyboardAvoidingView>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </SafeAreaView>
        </Animated.View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlayStrong,
  },
  sheet: {
    backgroundColor: colors.cardElevated,
    borderTopLeftRadius: radius['3xl'],
    borderTopRightRadius: radius['3xl'],
    maxHeight: '90%',
  },
  safeArea: {
    flex: 1,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  title: {
    color: colors.text,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
});
