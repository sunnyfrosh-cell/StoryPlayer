import { Share, Platform, Linking, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';

const SCHEME = 'storyverse';

export function buildDeepLink(videoId: string): string {
  return `${SCHEME}://watch/${videoId}`;
}

export function buildWebLink(videoId: string): string {
  const slug = Constants.expoConfig?.slug ?? 'storyverse';
  return `https://${slug}.app/${videoId}`;
}

export interface SharePayload {
  title: string;
  description?: string;
  videoId: string;
}

export async function shareVideo({ title, description, videoId }: SharePayload): Promise<boolean> {
  const link = buildWebLink(videoId);
  const message = description
    ? `${title}\n\n${description}\n\nWatch on StoryVerse: ${link}`
    : `${title}\n\nWatch on StoryVerse: ${link}`;

  try {
    const result = await Share.share(
      { message, title: `StoryVerse: ${title}`, url: link },
      Platform.select({
        ios: { subject: title },
        android: { dialogTitle: title },
      }) ?? undefined,
    );
    if (result.action === Share.sharedAction) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function copyLink(videoId: string): Promise<boolean> {
  try {
    const link = buildWebLink(videoId);
    await Clipboard.setStringAsync(link);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

export interface SocialShareTarget {
  name: string;
  scheme: string;
  fallbackUrl: (link: string, text: string) => string;
}

export const SOCIAL_TARGETS: SocialShareTarget[] = [
  { name: 'WhatsApp', scheme: 'whatsapp://send', fallbackUrl: (l, t) => `https://wa.me/?text=${encodeURIComponent(`${t} ${l}`)}` },
  { name: 'Facebook', scheme: 'fb://', fallbackUrl: (l) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(l)}` },
  { name: 'Messenger', scheme: 'fb-messenger://', fallbackUrl: (l) => `https://www.facebook.com/dialog/send?app_id=&link=${encodeURIComponent(l)}&redirect_uri=${encodeURIComponent(l)}` },
  { name: 'Telegram', scheme: 'tg://', fallbackUrl: (l, t) => `https://t.me/share/url?url=${encodeURIComponent(l)}&text=${encodeURIComponent(t)}` },
  { name: 'Instagram', scheme: 'instagram://', fallbackUrl: () => 'https://www.instagram.com/' },
  { name: 'X (Twitter)', scheme: 'twitter://', fallbackUrl: (l, t) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(l)}` },
  { name: 'Snapchat', scheme: 'snapchat://', fallbackUrl: (l) => `https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(l)}` },
  { name: 'Gmail', scheme: 'gmail://', fallbackUrl: (l, t) => `mailto:?subject=${encodeURIComponent(t)}&body=${encodeURIComponent(l)}` },
];

export async function shareToSocialTarget(target: SocialShareTarget, payload: SharePayload): Promise<boolean> {
  const link = buildWebLink(payload.videoId);
  const text = payload.title;

  if (Platform.OS !== 'web') {
    try {
      const canOpen = await Linking.canOpenURL(target.scheme);
      if (canOpen) {
        const url = target.fallbackUrl(link, text);
        await Linking.openURL(url);
        return true;
      }
    } catch { /* fall through to web fallback */ }
  }

  if (target.fallbackUrl) {
    const url = target.fallbackUrl(link, text);
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
      return true;
    }
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      Alert.alert('Unable to open', `Could not open ${target.name}.`);
    }
  }
  return false;
}
