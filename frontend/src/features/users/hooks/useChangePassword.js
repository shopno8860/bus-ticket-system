import { useState } from 'react';
import { changePassword } from '../services/userApi';

const initialState = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

/**
 * Local form state + validation + `changePassword` API call for profile settings.
 * @param {{ onUnauthorized?: () => void }} [options]
 */
export function useChangePassword({ onUnauthorized } = {}) {
  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const reset = () => {
    setFormData(initialState);
    setErrors({});
    setIsLoading(false);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const nextErrors = {};
    if (!formData.currentPassword) nextErrors.currentPassword = 'Current password is required.';
    if (!formData.newPassword) nextErrors.newPassword = 'New password is required.';
    if (!formData.confirmPassword) nextErrors.confirmPassword = 'Please confirm your new password.';
    if (formData.newPassword && formData.confirmPassword && formData.newPassword !== formData.confirmPassword) {
      nextErrors.confirmPassword = 'New password and confirm password must match.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async () => {
    if (!validate()) return { success: false, code: 'VALIDATION_FAILED' };

    setIsLoading(true);
    try {
      await changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      reset();
      return { success: true };
    } catch (error) {
      if (error?.status === 401 || error?.status === 403) {
        onUnauthorized?.();
        return { success: false, code: 'UNAUTHORIZED', error };
      }
      if (error?.status === 400) {
        return { success: false, code: 'INVALID_CURRENT_PASSWORD', error };
      }
      return { success: false, code: 'REQUEST_FAILED', error };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    formData,
    errors,
    isLoading,
    handleChange,
    submit,
    reset,
  };
}
