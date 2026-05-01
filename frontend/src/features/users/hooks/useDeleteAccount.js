import { useMemo, useState } from 'react';
import { deleteAccount } from '../services/userApi';

const CONFIRMATION_TEXT = 'DELETE';

export function useDeleteAccount({ onUnauthorized } = {}) {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const canConfirm = useMemo(() => confirmationInput.trim() === CONFIRMATION_TEXT, [confirmationInput]);

  const reset = () => {
    setConfirmationInput('');
    setIsLoading(false);
  };

  const submit = async () => {
    if (!canConfirm) return { success: false, code: 'INVALID_CONFIRMATION' };

    setIsLoading(true);
    try {
      await deleteAccount();
      reset();
      return { success: true };
    } catch (error) {
      if (error?.status === 401 || error?.status === 403) {
        onUnauthorized?.();
        return { success: false, code: 'UNAUTHORIZED', error };
      }
      return { success: false, code: 'REQUEST_FAILED', error };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    confirmationInput,
    setConfirmationInput,
    canConfirm,
    isLoading,
    submit,
    reset,
    confirmationText: CONFIRMATION_TEXT,
  };
}
