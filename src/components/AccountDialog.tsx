import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import type { AppData, User } from '../types/domain';
import {
  createFirebaseAccount,
  requestFirebasePasswordReset,
  signInToFirebase,
  signInWithGoogle,
  signOutFirebaseAccount,
  updateFirebaseProfile,
  uploadFirebaseAvatar,
} from '../services/authService';
import { Modal } from './Modal';

type AccountView = 'overview' | 'signin' | 'signup';

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

function readImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const source = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(source);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(source);
      reject(new Error('This image could not be opened. Try a JPG, PNG, or WebP photo.'));
    };
    image.src = source;
  });
}

async function prepareAvatar(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image from your gallery.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Choose an image smaller than 10 MB.');

  const image = await readImage(file);
  const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
  if (!cropSize) throw new Error('This image has no readable dimensions.');
  const outputSize = Math.min(512, cropSize);
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser could not prepare this photo.');

  const sourceX = (image.naturalWidth - cropSize) / 2;
  const sourceY = (image.naturalHeight - cropSize) / 2;
  context.drawImage(image, sourceX, sourceY, cropSize, cropSize, 0, 0, outputSize, outputSize);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Your browser could not prepare this photo.')),
      'image/webp',
      0.86,
    );
  });
}

export function AccountDialog({ open, user, isAnonymous, data, onClose }: AccountDialogProps) {
  const [view, setView] = useState<AccountView>('overview');
  const [name, setName] = useState(user.displayName);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(user.avatarUrl ?? '');
  const [avatarUpload, setAvatarUpload] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setView('overview');
    setName(user.displayName);
    setEmail(user.email);
    setPassword('');
    setAvatarPreview(user.avatarUrl ?? '');
    setAvatarUpload(null);
    setMessage('');
    setError('');
  }, [open, user.avatarUrl, user.displayName, user.email]);

  useEffect(() => () => {
    if (avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

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
    } else if (!isAnonymous) {
      void run(async () => {
        const avatarUrl = avatarUpload ? await uploadFirebaseAvatar(avatarUpload) : user.avatarUrl ?? '';
        await updateFirebaseProfile(name, avatarUrl);
      }, 'Profile updated.');
    }
  };

  const chooseAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setBusy(true);
    setError('');
    setMessage('');
    try {
      const avatar = await prepareAvatar(file);
      setAvatarUpload(avatar);
      setAvatarPreview(URL.createObjectURL(avatar));
    } catch (avatarError) {
      setError(friendlyError(avatarError));
    } finally {
      setBusy(false);
    }
  };

  return <Modal open={open} title={isAnonymous ? 'Your account' : 'Profile'} onClose={onClose} className="account-modal">
    {view === 'overview' && !isAnonymous ? <form className="account-profile-form" onSubmit={submit}>
      <div className="account-profile-summary">
        <label className="avatar-picker">
          <input type="file" accept="image/*" aria-label="Choose profile photo from gallery" disabled={busy} onChange={(event) => void chooseAvatar(event)} />
          <span className="account-avatar account-avatar-edit">
            {avatarPreview ? <img src={avatarPreview} alt={`${name || user.displayName} profile preview`} /> : user.displayName.charAt(0).toUpperCase()}
            <i aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M4 8.5h3l1.4-2h7.2l1.4 2h3v10H4z" /><circle cx="12" cy="13.5" r="3.2" /></svg>
            </i>
          </span>
          <small>Tap to change photo</small>
        </label>
        <span className="account-profile-identity"><strong>{user.displayName}</strong><p>{user.email}</p><b><i /> Synced account</b></span>
      </div>
      <label className="field"><span>Display name</span><input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={120} required /></label>
      <small className="avatar-help">Gallery photos are cropped square and optimized automatically. Maximum 10 MB.</small>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {message ? <p className="success-note">{message}</p> : null}
      <button className="primary-button wide-button account-save" type="submit" disabled={busy || (!avatarUpload && name.trim() === user.displayName)}>{busy ? 'Saving…' : 'Save changes'}</button>
      <button className="text-button account-signout" type="button" disabled={busy} onClick={() => void run(signOutFirebaseAccount, 'Signed out. Opening a fresh guest workspace…')}>Sign out</button>
    </form> : view === 'overview' ? <div className="account-overview">
      <div className="guest-account-card">
        <span className="account-avatar">{user.displayName.charAt(0).toUpperCase()}</span>
        <span><strong>Guest workspace</strong><p>Connect an account to keep your plans synced.</p></span>
      </div>
      <button className="google-auth-button wide-button" type="button" disabled={busy} onClick={() => void run(signInWithGoogle, 'Google account connected. Loading your planner…')}><span className="google-mark" aria-hidden="true">G</span>{busy ? 'Connecting…' : 'Continue with Google'}</button>
      <div className="account-divider"><span>or use email</span></div>
      <button className="primary-button wide-button" type="button" onClick={() => setView('signup')}>Secure this guest workspace</button>
      <button className="secondary-button wide-button" type="button" onClick={() => setView('signin')}>Sign in to an existing account</button>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {message ? <p className="success-note">{message}</p> : null}
    </div> : <form className="modal-form account-form" onSubmit={submit}>
      {view !== 'signin' ? <label className="field full-field"><span>Display name</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={120} required /></label> : null}
      <>
        <label className="field full-field"><span>Email</span><input autoFocus={view === 'signin'} type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
        <label className="field full-field"><span>Password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={view === 'signup' ? 'new-password' : 'current-password'} minLength={8} required /></label>
      </>
      {view === 'signin' ? <button className="text-button account-reset" type="button" disabled={!email || busy} onClick={() => void run(() => requestFirebasePasswordReset(email), 'Password reset email sent.', false)}>Forgot password?</button> : null}
      {error ? <p className="form-error full-field" role="alert">{error}</p> : null}
      {message ? <p className="success-note full-field">{message}</p> : null}
      <footer className="modal-actions full-field"><button className="secondary-button" type="button" onClick={() => setView('overview')}>Back</button><span className="action-spacer" /><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Please wait…' : view === 'signin' ? 'Sign in' : 'Create secure account'}</button></footer>
    </form>}
  </Modal>;
}
