import { useEffect, useState, type FormEvent } from 'react';
import type { AppData, User } from '../types/domain';
import {
  createFirebaseAccount,
  requestFirebasePasswordReset,
  signInToFirebase,
  signInWithGoogle,
  signOutFirebaseAccount,
  updateFirebaseProfile,
} from '../services/authService';
import { Modal } from './Modal';

type AccountView = 'overview' | 'signin' | 'signup' | 'profile';

interface AccountDialogProps {
  open: boolean;
  user: User;
  isAnonymous: boolean;
  data: AppData;
  onClose(): void;
}

function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Account request failed.';
  if (message.includes('email-already-in-use')) return 'That email already has an account. Sign in instead.';
  if (message.includes('invalid-credential')) return 'Email or password is incorrect.';
  if (message.includes('weak-password')) return 'Use at least 8 characters for your password.';
  if (message.includes('network-request-failed')) return 'You appear to be offline. Try again after reconnecting.';
  if (message.includes('popup-closed-by-user')) return 'Google sign-in was cancelled.';
  if (message.includes('popup-blocked')) return 'Allow pop-ups for Aayoj, then try Google sign-in again.';
  if (message.includes('unauthorized-domain')) return 'Google sign-in is not authorized for this domain yet.';
  if (message.includes('account-exists-with-different-credential')) return 'That email uses a different sign-in method. Sign in with email first.';
  if (message.includes('operation-not-allowed')) return 'Google sign-in is not enabled for this project.';
  return message.replace(/^Firebase:\s*/i, '');
}

export function AccountDialog({ open, user, isAnonymous, data, onClose }: AccountDialogProps) {
  const [view, setView] = useState<AccountView>('overview');
  const [name, setName] = useState(user.displayName);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setView('overview');
    setName(user.displayName);
    setEmail(user.email);
    setPassword('');
    setAvatarUrl(user.avatarUrl ?? '');
    setMessage('');
    setError('');
  }, [open, user.avatarUrl, user.displayName, user.email]);

  const run = async (operation: () => Promise<unknown>, success: string, reload = true) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await operation();
      setMessage(success);
      if (reload) window.setTimeout(() => window.location.reload(), 500);
    } catch (operationError) {
      setError(friendlyError(operationError));
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (view === 'signin') {
      void run(() => signInToFirebase(email, password), 'Signed in. Loading your workspace…');
    } else if (view === 'signup') {
      void run(() => createFirebaseAccount(name, email, password, data), 'Account secured. Your planner is staying with you…');
    } else if (view === 'profile') {
      void run(() => updateFirebaseProfile(name, avatarUrl), 'Profile updated.');
    }
  };

  return <Modal open={open} title="Your Aayoj account" onClose={onClose} className="account-modal">
    <div className="account-hero">
      <span className="account-avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user.displayName.charAt(0).toUpperCase()}</span>
      <span><small>{isAnonymous ? 'Guest workspace' : 'Aayoj account'}</small><strong>{user.displayName}</strong><p>{user.email || 'Secure this workspace to use it on every device.'}</p></span>
      <b className={isAnonymous ? 'account-state guest' : 'account-state secure'}>{isAnonymous ? 'Guest' : 'Secured'}</b>
    </div>

    {view === 'overview' ? <div className="account-overview">
      <div className="account-benefits"><span>✓ Multi-device sync</span><span>✓ Offline-safe changes</span><span>✓ Private planner data</span></div>
      {isAnonymous ? <>
        <button className="google-auth-button wide-button" type="button" disabled={busy} onClick={() => void run(signInWithGoogle, 'Google account connected. Loading your planner…')}><span className="google-mark" aria-hidden="true">G</span>{busy ? 'Connecting…' : 'Continue with Google'}</button>
        <div className="account-divider"><span>or use email</span></div>
        <button className="primary-button wide-button" type="button" onClick={() => setView('signup')}>Secure this guest workspace</button>
        <button className="secondary-button wide-button" type="button" onClick={() => setView('signin')}>Sign in to an existing account</button>
      </> : <>
        <button className="primary-button wide-button" type="button" onClick={() => setView('profile')}>Edit profile</button>
        <button className="secondary-button wide-button" type="button" onClick={() => void run(signOutFirebaseAccount, 'Signed out. Opening a fresh guest workspace…')}>Sign out</button>
      </>}
    </div> : <form className="modal-form account-form" onSubmit={submit}>
      {view !== 'signin' ? <label className="field full-field"><span>Display name</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={120} required /></label> : null}
      {view === 'profile' ? <label className="field full-field"><span>Avatar image URL</span><input type="url" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://…" maxLength={2048} /></label> : <>
        <label className="field full-field"><span>Email</span><input autoFocus={view === 'signin'} type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
        <label className="field full-field"><span>Password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={view === 'signup' ? 'new-password' : 'current-password'} minLength={8} required /></label>
      </>}
      {view === 'signin' ? <button className="text-button account-reset" type="button" disabled={!email || busy} onClick={() => void run(() => requestFirebasePasswordReset(email), 'Password reset email sent.', false)}>Forgot password?</button> : null}
      {error ? <p className="form-error full-field" role="alert">{error}</p> : null}
      {message ? <p className="success-note full-field">{message}</p> : null}
      <footer className="modal-actions full-field"><button className="secondary-button" type="button" onClick={() => setView('overview')}>Back</button><span className="action-spacer" /><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Please wait…' : view === 'signin' ? 'Sign in' : view === 'signup' ? 'Create secure account' : 'Save profile'}</button></footer>
    </form>}
  </Modal>;
}
