import { useLocalSearchParams } from 'expo-router';
import { ReelCommentsScreen } from '@/components/ReelCommentSheet';

export default function ReelCommentsRoute() {
  const { reelId, creatorId } = useLocalSearchParams<{ reelId?: string; creatorId?: string }>();
  if (!reelId) return null;
  return <ReelCommentsScreen reelId={reelId} creatorId={creatorId ?? ''} />;
}