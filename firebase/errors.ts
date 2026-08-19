import type { FirebaseError } from 'firebase/app';

const FRIENDLY: Record<string, string> = {
  'auth/invalid-email': 'That email address looks invalid.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'No account found with that email.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/email-already-in-use': 'An account already exists with that email.',
  'auth/operation-not-allowed': 'Email sign-in is not enabled for this project.',
  'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/popup-closed-by-user': 'The sign-in window was closed before completing.',
  'auth/cancelled-popup-request': 'Sign-in was cancelled.',
  'auth/unauthorized-domain': 'This domain is not authorized for sign-in.',
  'auth/no-current-user': 'No signed-in user found.',
  'auth/requires-recent-login': 'Please sign in again to complete this action.',
  'auth/missing-email': 'Enter an email address.',
  'permission-denied': 'You do not have permission to do that.',
  'unavailable': 'The service is temporarily unavailable. Try again shortly.',
};

export function mapFirebaseError(error: unknown): string {
  const fbError = error as Partial<FirebaseError>;
  const code = fbError?.code ?? '';
  if (code && FRIENDLY[code]) return FRIENDLY[code];
  if (error instanceof Error && error.message) {
    return error.message.replace('Firebase: ', '').replace(/\s*\(auth\/.*\)\.?$/, '');
  }
  return 'Something went wrong. Please try again.';
}

export function isFirebaseConfigError(error: unknown): boolean {
  return error instanceof Error && /not configured/i.test(error.message);
}
