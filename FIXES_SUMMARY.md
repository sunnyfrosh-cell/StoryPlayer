# Expo Reels App - Bug Fixes Summary

## Overview
This document outlines all fixes applied to resolve 6 critical categories of issues in the Expo React Native + Firebase reels application.

---

## Issue #1: Firestore Transaction Errors ✅ COMPLETED

### Problem
Firestore transactions had interleaved reads and writes, violating Firestore's requirement that all `tx.get()` calls must complete before any `tx.set()`, `tx.update()`, or `tx.delete()` calls execute.

**Error Pattern**: Conditional branches mixed reads and writes
```typescript
// WRONG - This causes transaction failures
await runTransaction(db, async (tx) => {
  if (condition) {
    tx.delete(oldRef);  // WRITE
  }
  const snap = await tx.get(anotherRef);  // READ AFTER WRITE - INVALID!
  if (snap.exists()) {
    tx.set(newRef, data);
  }
});
```

### Solution
Restructured all 7 transaction methods to use a two-phase pattern: **READ PHASE first, WRITE PHASE second**.

**Pattern Applied**:
```typescript
// CORRECT - Reads before writes
await runTransaction(db, async (tx) => {
  // PHASE 1: All reads happen first
  const snap1 = await tx.get(ref1);
  const snap2 = await tx.get(ref2);
  
  // PHASE 2: All writes happen after reads complete
  if (snap1.exists()) tx.delete(snap1.ref);
  tx.set(ref2, data);
  if (snap2.exists()) tx.update(ref2, updates);
});
```

### Modified Methods in `firebase/firestore.ts`

#### 1. **commentRepository.toggleLike()** (Line ~885)
- Moved `cSnap` read BEFORE delete/set operations
- Now fetches comment first, then decides to like/unlike

#### 2. **likeRepository.toggle()** (Line ~934-981)
- Moved `vSnap` (video) and `creatorSnap` (creator stats) reads BEFORE all updates
- Ensures atomicity when toggling video likes and creator like count

#### 3. **reelRepository.toggleLike()** (Line ~1672-1693)
- Moved `rSnap` (reel) read BEFORE like/unlike operations
- Prevents partial updates if read fails

#### 4. **reelRepository.toggleSave()** (Line ~1698-1719)
- Moved `rSnap` read BEFORE save/unsave operations
- Consistent with like toggle pattern

#### 5. **reelRepository.addReelComment()** (Line ~1748-1797)
- **CRITICAL FIX**: Now reads both `reelSnap` and `parentSnap` BEFORE creating comment
- Handles reply threading atomically
- Increments parent reply count and reel comment count in single transaction

#### 6. **reelRepository.deleteReelComment()** (Line ~1810-1837)
- Moved `rSnap` and `parentSnap` reads BEFORE deletion operations
- Atomically decrements comment counts while deleting

#### 7. **reelRepository.toggleReelFollow()** (Line ~1889-1923)
- Moved `fSnap` (follow doc) and `fgSnap` (following doc) reads BEFORE follow/unfollow updates
- Maintains bidirectional follow relationship consistency

### Impact
- ✅ Eliminates "Transaction read after write" errors
- ✅ Ensures atomic operations for all comment/like/follow interactions
- ✅ Prevents partial state updates due to race conditions

---

## Issue #2: React Rendering Error ✅ COMPLETED

### Problem
**Error**: `Cannot update a component while rendering a different component`

**Root Cause**: The subscription callback in `ReelCommentSheet.tsx` called `onCommentCountChange()` (parent callback) while updating local state, causing the parent component `reels.tsx` to re-render during the child's render cycle.

```typescript
// PROBLEMATIC CODE
unsubscribeRef.current = reelRepository.subscribeToReelComments(reelId, (newComments) => {
  setComments(topLevel);
  setRepliesMap(replyMap);
  setLoading(false);
  setLocalCount(total);
  onCommentCountChange(total);  // ← WRONG: Calls parent setState during render
});
```

### Solution
**Effect Separation Pattern**: Deferred parent callback to a separate `useEffect`

```typescript
// FIXED CODE - Two Effect Approach

// Effect 1: Subscribe and update LOCAL state only
useEffect(() => {
  if (!visible || !reelId) return;
  setLoading(true);
  unsubscribeRef.current = reelRepository.subscribeToReelComments(reelId, (newComments) => {
    // Update ONLY internal state - no parent callbacks
    const topLevel = newComments.filter((c) => !c.parentId);
    const replyMap = buildReplyMap(newComments);
    setComments(topLevel);
    setRepliesMap(replyMap);
    setLoading(false);
    setLocalCount(newComments.length);
    // NO onCommentCountChange here!
  });
  return () => {
    if (unsubscribeRef.current) unsubscribeRef.current();
  };
}, [visible, reelId]);  // NO onCommentCountChange in deps

// Effect 2: Notify PARENT separately when count changes
useEffect(() => {
  if (localCount !== prevCountRef.current) {
    prevCountRef.current = localCount;
    onCommentCountChange(localCount);  // Separate render cycle!
  }
}, [localCount, onCommentCountChange]);
```

### Key Changes

#### 1. Added `prevCountRef` tracking
```typescript
const prevCountRef = useRef<number>(commentCount);

// Track when comment count actually changes
useEffect(() => {
  if (localCount !== prevCountRef.current) {
    prevCountRef.current = localCount;
    onCommentCountChange(localCount);
  }
}, [localCount, onCommentCountChange]);
```

#### 2. Removed parent callback from subscription dependency
- Subscription effect NO LONGER depends on `onCommentCountChange`
- Parent function changes don't trigger re-subscription
- Prevents render cycle violations

#### 3. Separated state updates from parent notifications
- Local state updates (comments, repliesMap, localCount) happen in subscription effect
- Parent notification deferred to separate effect triggered by `localCount` change
- Guarantees clean React render cycles

### File Modified
- **Path**: `components/ReelCommentSheet.tsx`
- **Size**: ~600 lines
- **Status**: ✅ Replaced with corrected version

### Impact
- ✅ Eliminates "Cannot update a component while rendering" error
- ✅ Maintains real-time comment updates
- ✅ Properly synchronizes parent comment count display
- ✅ Follows React best practices for effect isolation

---

## Issue #3: Reels Autoplay (Not Yet Implemented) ⏳

### Requirement
Only the visible reel should play. Off-screen reels must pause automatically.

### Implementation Plan
**File**: `components/ReelVideoPlayer.tsx` and `app/(main)/reels.tsx`

1. **Add `isActive` prop to ReelVideoPlayer**
   ```typescript
   interface ReelVideoPlayerProps {
     reelId: string;
     videoUrl: string;
     isActive: boolean;  // NEW: true when this reel is visible
     // ...other props
   }
   ```

2. **Add effect to pause when off-screen**
   ```typescript
   useEffect(() => {
     if (!isActive && playerRef.current) {
       playerRef.current.pause();
     } else if (isActive && playerRef.current) {
       playerRef.current.play();
     }
   }, [isActive]);
   ```

3. **Pass `isActive` from parent**
   - `reels.tsx` already tracks `activeIndex` from `onViewableItemsChanged`
   - Pass to `ReelItem`: `<ReelItem isActive={activeIndex === index} />`
   - Pass to `ReelVideoPlayer`: `<ReelVideoPlayer isActive={props.isActive} />`

### Expected Result
- Only 1 reel video plays at a time (the one in viewport)
- Video automatically pauses when scrolled out of view
- Video resumes when scrolled back into view

---

## Issue #4: Reel Controls (Not Yet Implemented) ⏳

### Requirement
Add interactive controls to the video player:
- Play/pause toggle button
- 10-second forward skip button
- 10-second backward skip button
- Progress bar / seek slider
- Current time and duration display

### Implementation Plan
**File**: `components/ReelVideoPlayer.tsx` (extends existing 200+ lines)

1. **Add Playback Controls UI**
   ```typescript
   const [currentTime, setCurrentTime] = useState(0);
   const [duration, setDuration] = useState(0);
   const [isPlaying, setIsPlaying] = useState(false);

   return (
     <View style={styles.playerContainer}>
       <Video ... />
       {/* Controls Overlay */}
       <Animated.View style={styles.controlsOverlay}>
         {/* Left: 10s backward */}
         <Pressable onPress={handleBackward10s}>
           <SkipBack size={24} color="white" />
         </Pressable>
         
         {/* Center: Play/Pause */}
         <Pressable onPress={handleTogglePlay}>
           {isPlaying ? 
             <Pause size={28} color="white" /> : 
             <Play size={28} color="white" />
           }
         </Pressable>
         
         {/* Right: 10s forward */}
         <Pressable onPress={handleForward10s}>
           <SkipForward size={24} color="white" />
         </Pressable>
       </Animated.View>
       
       {/* Progress Bar */}
       <View style={styles.progressContainer}>
         <Slider
           style={styles.slider}
           minimumValue={0}
           maximumValue={duration}
           value={currentTime}
           onValueChange={handleSeek}
         />
       </View>
       
       {/* Time Display */}
       <View style={styles.timeDisplay}>
         <Text>{formatTime(currentTime)}</Text>
         <Text>{formatTime(duration)}</Text>
       </View>
     </View>
   );
   ```

2. **Implement Skip Functions**
   ```typescript
   const handleBackward10s = useCallback(async () => {
     const player = playerRef.current;
     if (player) {
       const newTime = Math.max(0, (currentTime || 0) - 10);
       await player.seekTo(newTime);
       setCurrentTime(newTime);
     }
   }, [currentTime]);

   const handleForward10s = useCallback(async () => {
     const player = playerRef.current;
     if (player) {
       const newTime = Math.min(duration || 0, (currentTime || 0) + 10);
       await player.seekTo(newTime);
       setCurrentTime(newTime);
     }
   }, [currentTime, duration]);
   ```

3. **Track Playback Position**
   ```typescript
   useEffect(() => {
     const interval = setInterval(async () => {
       const status = await playerRef.current?.getStatus?.();
       if (status) {
         setCurrentTime(status.positionMillis / 1000);
         setDuration(status.durationMillis / 1000);
         setIsPlaying(status.isPlaying);
       }
     }, 500);
     return () => clearInterval(interval);
   }, []);
   ```

### Expected Result
- Full-featured video player matching modern apps (YouTube, TikTok)
- Smooth seeking with progress bar
- Clear time information
- Quick 10s skip for efficient scrubbing

---

## Issue #5: Comments Functionality (Partially Complete) 🔄

### Current Status
The fixed `ReelCommentSheet.tsx` includes:
- ✅ Real-time comment subscription
- ✅ Optimistic add comment (with rollback on error)
- ✅ Optimistic add reply (threaded)
- ✅ Optimistic delete comment
- ✅ Real-time count synchronization
- ✅ Comment likes (UI tracked locally)
- ✅ Proper error handling with user feedback

### Implementation Details

#### Optimistic Comment Addition
```typescript
const handleSubmitComment = useCallback(async () => {
  const tempId = `temp-${Date.now()}`;
  const optimisticComment: Comment = { /* temp comment data */ };
  
  // Show immediately
  setComments((prev) => [optimisticComment, ...prev]);
  setLocalCount((prev) => prev + 1);
  
  try {
    await reelRepository.addReelComment({
      reelId,
      authorId: user.id,
      body: text,
      // ...
    });
  } catch {
    // Rollback on failure
    setComments((prev) => prev.filter((c) => c.id !== tempId));
    setLocalCount((prev) => Math.max(0, prev - 1));
    toast.error('Failed to post comment');
  }
}, [/*deps*/]);
```

#### Real-Time Reply Threading
```typescript
// Replies grouped by parent comment
const repliesMap: Record<string, Comment[]> = {};
newComments.forEach((c) => {
  if (c.parentId) {
    if (!replyMap[c.parentId]) replyMap[c.parentId] = [];
    replyMap[c.parentId].push(c);
  }
});
```

#### Comment Deletion with Rollback
```typescript
const handleDeleteComment = useCallback(async (comment: Comment) => {
  // Remove immediately
  setComments((prev) => prev.filter((c) => c.id !== comment.id));
  
  try {
    await reelRepository.deleteReelComment(comment.id, reelId);
  } catch {
    // Refetch from server on error
    reelRepository.subscribeToReelComments(reelId, (newComments) => {
      // Update comments from fresh data
    });
  }
}, [/*deps*/]);
```

### Expected Behavior
- Comments load in real-time from Firestore
- Users can add/delete comments with instant UI feedback
- Comments from other users appear automatically
- Comment count synchronized with parent reel card
- Threaded replies with expansion/collapse

---

## Issue #6: Performance Optimization (Not Yet Implemented) ⏳

### Requirement
Memoize heavy components and optimize callbacks to prevent unnecessary re-renders.

### Implementation Plan

#### 1. **Wrap ReelItem with React.memo**
```typescript
// Before
export function ReelItem({ isActive, onLike, ... }: ReelItemProps) {
  // component code
}

// After
export const ReelItem = React.memo(function ReelItem({ 
  isActive, 
  onLike, 
  ...props 
}: ReelItemProps) {
  // component code
}, (prevProps, nextProps) => {
  // Custom comparison to prevent re-renders when props haven't changed
  return prevProps.reelId === nextProps.reelId &&
         prevProps.isActive === nextProps.isActive &&
         prevProps.likeCount === nextProps.likeCount &&
         prevProps.commentCount === nextProps.commentCount &&
         prevProps.saveCount === nextProps.saveCount;
});
```

#### 2. **Wrap ReelVideoPlayer with React.memo**
```typescript
export const ReelVideoPlayer = React.memo(function ReelVideoPlayer({
  videoUrl,
  isActive,
  onWatchProgress,
}: ReelVideoPlayerProps) {
  // component code
}, (prevProps, nextProps) => {
  return prevProps.videoUrl === nextProps.videoUrl &&
         prevProps.isActive === nextProps.isActive;
});
```

#### 3. **Wrap ReelCommentSheet with React.memo**
```typescript
export const ReelCommentSheet = React.memo(function ReelCommentSheet({
  visible,
  reelId,
  commentCount,
  onCommentCountChange,
}: ReelCommentSheetProps) {
  // component code
}, (prevProps, nextProps) => {
  return prevProps.visible === nextProps.visible &&
         prevProps.reelId === nextProps.reelId &&
         prevProps.commentCount === nextProps.commentCount;
});
```

#### 4. **Ensure Callbacks are Memoized in Parent (reels.tsx)**
Already present:
```typescript
const handleLike = useCallback(async (reelId: string) => {
  // handle like
}, [reelId, user, /* deps */]);

const handleComment = useCallback((reelId: string) => {
  // show comment sheet
}, []);
```

#### 5. **Optimize Computed Values with useMemo**
```typescript
// Already applied in ReelCommentSheet
const sortedComments = useMemo(() => {
  return [...comments].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.createdAt - a.createdAt;
  });
}, [comments]);
```

### Expected Result
- Reduced re-renders when comments are added/deleted
- Video player doesn't re-render on like/follow actions
- Smooth scrolling performance
- Lower memory usage and battery consumption

---

## Files Modified

### ✅ Completed Changes

| File | Changes | Status |
|------|---------|--------|
| `firebase/firestore.ts` | 7 transaction methods refactored for read-before-write | ✅ Deployed |
| `components/ReelCommentSheet.tsx` | Effect separation to prevent render cycle errors | ✅ Deployed |

### ⏳ Pending Changes

| File | Changes | Status |
|------|---------|--------|
| `components/ReelVideoPlayer.tsx` | Add isActive prop, autoplay pause, controls UI | ⏳ Next |
| `components/ReelItem.tsx` | Wrap with React.memo | ⏳ Pending |
| `app/(main)/reels.tsx` | Pass isActive prop (already has activeIndex) | ⏳ Pending |

---

## Validation Checklist

- [x] Firestore transactions now follow read-before-write pattern
- [x] React "Cannot update" error eliminated via effect separation
- [ ] Autoplay pause implemented when reel scrolls out of view
- [ ] Video controls (play/pause, skip, progress bar, time) functional
- [ ] Comments real-time sync working end-to-end
- [ ] React.memo wrappers applied to prevent re-renders
- [ ] Performance metrics improved (less re-renders)

---

## How to Test

### Test #1: Firestore Transactions
1. Open app
2. Like/save a reel (toggles should work)
3. Add a comment to a reel (should sync count)
4. Delete a comment (should decrement count)
5. Check Firebase Firestore console - verify atomicity

### Test #2: React Rendering Error
1. Open app
2. Scroll to a reel
3. Tap comment icon to open comment sheet
4. Add a comment
5. Verify: No console errors, comment appears, parent count updates

### Test #3: Autoplay (After Implementation)
1. Scroll through reels quickly
2. Only visible reel should have playing video
3. Audio should mute when scrolling away
4. Video should resume when scrolling back

### Test #4: Video Controls (After Implementation)
1. Tap video to show controls
2. Test play/pause button
3. Test forward/backward 10s buttons
4. Drag progress bar to seek
5. Verify time display updates

### Test #5: Performance
1. Open performance profiler
2. Scroll through 20+ reels
3. Like/save multiple reels
4. Monitor: Frame rate stays 60fps, no memory leaks

---

## Next Steps

1. **Immediate**: Deploy ReelCommentSheet fix (✅ Done)
2. **Next Priority**: Implement Issue #3 (Autoplay pause)
3. **Then**: Implement Issue #4 (Video controls)
4. **Finally**: Apply Issue #6 (Performance optimization)

All changes follow React/React Native best practices and Firestore transaction requirements.
