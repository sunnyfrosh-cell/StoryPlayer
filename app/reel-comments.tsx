import { useLocalSearchParams } from 'expo-router';
import { ReelCommentsScreen } from '@/components/ReelCommentSheet';

export default function ReelCommentsRoute() {
  const { reelId, creatorId } = useLocalSearchParams<{ reelId?: string; creatorId?: string }>();
  const resolvedReelId = typeof reelId === 'string' ? reelId : reelId?.[0];
  const resolvedCreatorId = typeof creatorId === 'string' ? creatorId : creatorId?.[0];
  if (!resolvedReelId) return null;
  return <ReelCommentsScreen reelId={resolvedReelId} creatorId={resolvedCreatorId ?? ''} />;
}