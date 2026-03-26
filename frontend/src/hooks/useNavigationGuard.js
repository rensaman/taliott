import { useEffect, useState, useRef } from 'react';

/**
 * Shows an unsaved-changes warning when the user tries to navigate away.
 *
 * - Blocks tab close / refresh via the native `beforeunload` dialog.
 * - Intercepts the browser back/forward buttons and shows a custom dialog.
 *
 * @param {boolean} isDirty - true while there are unsaved changes.
 * @returns {{ showDialog: boolean, confirmLeave: () => void, cancelLeave: () => void }}
 */
export function useNavigationGuard(isDirty) {
  const [showDialog, setShowDialog] = useState(false);
  const confirmRef = useRef(null);

  // Native browser dialog on tab close / page refresh
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Custom dialog on browser back / forward
  useEffect(() => {
    if (!isDirty) return;

    // Push a guard entry so the next back-press doesn't immediately navigate away.
    window.history.pushState(null, '');

    function handlePopState() {
      // Re-push to stay on the current page while the dialog is open.
      window.history.pushState(null, '');
      setShowDialog(true);
    }

    window.addEventListener('popstate', handlePopState);

    // confirmLeave: remove listener first so go(-2) doesn't re-trigger it.
    confirmRef.current = () => {
      window.removeEventListener('popstate', handlePopState);
      setShowDialog(false);
      window.history.go(-2);
    };

    return () => window.removeEventListener('popstate', handlePopState);
  }, [isDirty]);

  return {
    showDialog,
    confirmLeave: () => confirmRef.current?.(),
    cancelLeave: () => setShowDialog(false),
  };
}
