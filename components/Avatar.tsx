import { Image, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, typography } from '@/theme';
import { normalizeMediaUri } from '@/utils';

interface AvatarProps {
  uri: string | null;
  size?: number;
  initials?: string;
  ring?: boolean;
}

export function Avatar({ uri, size = 44, initials, ring = false }: AvatarProps) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };
  const normalizedUri = normalizeMediaUri(uri);

  if (normalizedUri) {
    if (ring) {
      return (
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.ring, { width: size + 4, height: size + 4, borderRadius: (size + 4) / 2 }]}
        >
          <Image
            source={{ uri: normalizedUri }}
            style={[dimension, styles.inner]}
            resizeMode="cover"
          />
        </LinearGradient>
      );
    }
    return (
      <Image
        source={{ uri: normalizedUri }}
        style={dimension}
        resizeMode="cover"
      />
    );
  }

  const label = (initials ?? 'SV').slice(0, 2).toUpperCase();

  return (
    <LinearGradient
      colors={[colors.primary, colors.secondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[dimension, styles.placeholder]}
    >
      <View style={[dimension, styles.placeholderInner]}>
        <Text style={[typography.h4, { color: colors.text, fontSize: size * 0.36 }]}>
          {label}
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  ring: {
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    borderWidth: 2,
    borderColor: colors.background,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderInner: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    margin: 2,
  },
});
