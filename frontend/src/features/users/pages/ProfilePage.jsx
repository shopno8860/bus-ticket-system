import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { updateProfile } from '../services/userApi';
import { showError, showSuccess } from '../../../utils/toastHelper';
import Modal from '../../../components/Modal';
import { useChangePassword } from '../hooks/useChangePassword';
import { useDeleteAccount } from '../hooks/useDeleteAccount';

const ProfileField = ({ label, value }) => (
  <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
    <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-sm md:text-base font-bold text-slate-800">{value || 'Not set yet'}</p>
  </div>
);

const FormField = ({
  label,
  name,
  value,
  onChange,
  error,
  type = 'text',
  disabled = false,
  as = 'input',
  options = [],
  ...rest
}) => {
  const baseClasses =
    'w-full border rounded-xl px-4 py-3 text-sm text-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-[#22c55e]/30 focus:border-[#22c55e] disabled:bg-slate-100 disabled:text-slate-500';
  const errorClasses = error ? 'border-red-300 focus:ring-red-200 focus:border-red-400' : 'border-slate-200';

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className="text-xs font-bold text-slate-500 uppercase tracking-wide">
        {label}
      </label>
      {as === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          {...rest}
          className={`${baseClasses} ${errorClasses} min-h-[104px] resize-none`}
        />
      ) : as === 'select' ? (
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          {...rest}
          className={`${baseClasses} ${errorClasses}`}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
          {...rest}
          className={`${baseClasses} ${errorClasses}`}
        />
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};

const normalizeDateInput = (dateValue) => {
  if (!dateValue) return '';
  if (typeof dateValue === 'string' && dateValue.includes('T')) {
    return dateValue.split('T')[0];
  }
  return dateValue;
};

const buildProfileData = (user, fallback) => ({
  name: user?.fullName || user?.name || fallback.name,
  email: user?.email || fallback.email,
  phone: user?.phoneNumber || user?.phone || fallback.phone,
  gender: user?.gender || fallback.gender,
  address: user?.address || fallback.address,
  nid: user?.nationalId || user?.nid || fallback.nid,
  dob: normalizeDateInput(user?.dateOfBirth || user?.dob || fallback.dob),
  passport: user?.passportNumber || user?.passport || fallback.passport,
  visa: user?.visaInfo || user?.visa || fallback.visa,
});

const getInitials = (name) => {
  const value = String(name || '').trim();
  if (!value) return 'U';
  const parts = value.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return `${first}${second}`.toUpperCase() || 'U';
};

const ProfilePage = () => {
  const { user, token, logout, updateUserProfile, clearAuthState } = useAuth();
  const navigate = useNavigate();

  const fallbackUser = {
    name: 'Rakesh Al Yadin',
    email: 'test@email.com',
    phone: '01700000000',
    gender: 'MALE',
    address: '',
    nid: '',
    dob: '',
    passport: '',
    visa: '',
  };

  const [profileData, setProfileData] = useState(() => buildProfileData(user, fallbackUser));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formData, setFormData] = useState(profileData);
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleUnauthorized = () => {
    showError('Session expired. Please login again.');
    logout();
  };

  const {
    formData: passwordForm,
    errors: passwordErrors,
    isLoading: isChangingPassword,
    handleChange: handlePasswordFieldChange,
    submit: submitPasswordChange,
    reset: resetPasswordForm,
  } = useChangePassword({
    onUnauthorized: handleUnauthorized,
  });

  const {
    confirmationInput,
    setConfirmationInput,
    canConfirm,
    isLoading: isDeletingAccount,
    submit: submitDeleteAccount,
    reset: resetDeleteAccount,
    confirmationText,
  } = useDeleteAccount({
    onUnauthorized: handleUnauthorized,
  });

  useEffect(() => {
    setProfileData(buildProfileData(user, fallbackUser));
  }, [user]);

  const maxDate = useMemo(() => new Date().toISOString().split('T')[0], []);
  const handleLogout = () => {
    logout();
    showSuccess('Logged out');
  };

  const openModal = () => {
    setFormData(profileData);
    setFormErrors({});
    setSubmitError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setFormErrors({});
    setSubmitError('');
  };

  const openPasswordModal = () => {
    resetPasswordForm();
    setIsPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    if (isChangingPassword) return;
    setIsPasswordModalOpen(false);
    resetPasswordForm();
  };

  const openDeleteModal = () => {
    resetDeleteAccount();
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (isDeletingAccount) return;
    setIsDeleteModalOpen(false);
    resetDeleteAccount();
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const nextErrors = {};
    if (!formData.name.trim()) {
      nextErrors.name = 'Name is required.';
    }
    if (!formData.phone.trim()) {
      nextErrors.phone = 'Phone is required.';
    }

    if (formData.dob) {
      const chosenDate = new Date(formData.dob);
      const today = new Date();
      chosenDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      if (chosenDate >= today) {
        nextErrors.dob = 'Date of birth must be a past date.';
      }
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSubmitError('');
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const payload = {
        fullName: formData.name.trim(),
        phoneNumber: formData.phone.trim(),
        gender: formData.gender,
        address: formData.address.trim(),
        dateOfBirth: formData.dob || null,
        nationalId: formData.nid.trim(),
        passportNumber: formData.passport.trim(),
        visaInfo: formData.visa.trim(),
      };

      const response = await updateProfile(payload);
      const updatedProfile = buildProfileData(response || { ...user, ...payload }, fallbackUser);

      setProfileData(updatedProfile);
      if (updateUserProfile) {
        const mergedUser = {
          ...user,
          ...response,
          fullName: response?.fullName || updatedProfile.name,
          name: updatedProfile.name,
          phone: updatedProfile.phone,
          phoneNumber: response?.phoneNumber || updatedProfile.phone,
        };
        updateUserProfile(mergedUser);
      }

      showSuccess('Profile updated successfully');
      setIsModalOpen(false);
    } catch (error) {
      showError('Update failed');
      setSubmitError(error?.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    if (!token) {
      handleUnauthorized();
      return;
    }

    const result = await submitPasswordChange();
    if (result.success) {
      showSuccess('Password updated successfully');
      closePasswordModal();
      logout();
      return;
    }

    if (result.code === 'UNAUTHORIZED') return;
    if (result.code === 'INVALID_CURRENT_PASSWORD') {
      showError('Current password is incorrect');
      return;
    }
    if (result.code !== 'VALIDATION_FAILED') {
      showError(result?.error?.message || 'Failed to update password. Please try again.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!token) {
      handleUnauthorized();
      return;
    }

    const result = await submitDeleteAccount();
    if (result.success) {
      showSuccess('Account deleted successfully');
      clearAuthState();
      closeDeleteModal();
      navigate('/', { replace: true });
      return;
    }

    if (result.code === 'UNAUTHORIZED') return;
    if (result.code !== 'INVALID_CONFIRMATION') {
      showError(result?.error?.message || 'Failed to delete account. Please try again.');
    }
  };

  const menuItems = [
    { id: 'profile', label: 'My Profile', active: true },
    { id: 'password', label: 'Change Password' },
    { id: 'delete', label: 'Account Delete', color: 'text-red-500' },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* LEFT SIDE: Sidebar */}
          <aside className="w-full lg:w-80 flex-shrink-0">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden sticky top-24">
              <div className="p-8 text-center border-b border-slate-50">
                <div className="w-24 h-24 rounded-full bg-[#16a34a]/10 mx-auto border-4 border-white shadow-lg flex items-center justify-center text-2xl font-black text-[#166534]">
                  {getInitials(profileData.name)}
                </div>
                <h3 className="mt-4 font-black text-slate-800 text-xl">{profileData.name}</h3>
                <p className="text-slate-400 text-sm font-medium">{profileData.email}</p>
              </div>
              
              <nav className="p-4">
                <ul className="space-y-2">
                  {menuItems.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={item.id === 'password' ? openPasswordModal : item.id === 'delete' ? openDeleteModal : undefined}
                        className={`w-full flex items-center px-6 py-4 rounded-2xl font-bold transition-all ${
                          item.active
                            ? 'bg-[#16a34a] text-white shadow-lg shadow-[#16a34a]/20'
                            : `text-slate-600 hover:bg-slate-50 ${item.color || ''}`
                        }`}
                      >
                        {item.label}
                      </button>
                    </li>
                  ))}
                  <li>
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center px-6 py-4 rounded-2xl font-bold text-red-500 hover:bg-red-50 transition-all"
                    >
                      Logout
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </aside>

          {/* RIGHT SIDE: Main Content */}
          <main className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">Profile Details</h1>
                <p className="text-slate-400 font-medium mt-1">Manage your personal information and account settings</p>
              </div>
              <button
                onClick={openModal}
                className="btn bg-[#16a34a] hover:bg-[#15803d] text-white px-8 py-3.5 rounded-2xl border-none font-bold shadow-lg shadow-[#16a34a]/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                Update Profile
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              <ProfileField label="NAME" value={profileData.name} />
              <ProfileField label="EMAIL" value={profileData.email} />
              <ProfileField label="PHONE" value={profileData.phone} />
              <ProfileField label="GENDER" value={profileData.gender?.replace('_', ' ')} />
              <ProfileField label="ADDRESS" value={profileData.address} />
              <ProfileField label="NATIONAL IDENTITY (NID)" value={profileData.nid} />
              <ProfileField label="DATE OF BIRTH" value={profileData.dob} />
              <ProfileField label="PASSPORT" value={profileData.passport} />
              <ProfileField label="VISA" value={profileData.visa} />
            </div>

            {/* Extra Info Section */}
            <div className="mt-8 bg-[#16a34a]/5 border border-[#16a34a]/10 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-[#16a34a] flex items-center justify-center text-white text-3xl flex-shrink-0 shadow-lg shadow-[#16a34a]/20">
                🛡️
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-800">Secure Your Account</h4>
                <p className="text-slate-500 text-sm mt-1 leading-relaxed">
                  Make sure your contact information is up to date. This helps us provide better service and secure your bookings.
                </p>
              </div>
            </div>
          </main>

        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        title="Update Profile"
        subtitle="Update your personal details."
        onClose={closeModal}
        disableClose={isSaving}
        maxWidthClass="max-w-2xl"
        footer={
          <div className="flex justify-end gap-4 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-all"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="update-profile-form"
              disabled={isSaving}
              className="btn bg-[#16a34a] hover:bg-[#15803d] border-none px-6 py-2.5 rounded-xl text-white font-semibold transition-all disabled:opacity-70 disabled:cursor-not-allowed min-w-[152px] flex items-center justify-center gap-2 shadow-lg shadow-[#16a34a]/30"
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin"></span>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        }
      >
        <form id="update-profile-form" onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto pr-1">
          <FormField
            label="Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            error={formErrors.name}
          />
          <FormField
            label="Email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            disabled
          />
          <FormField
            label="Phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            error={formErrors.phone}
          />
          <FormField
            label="Gender"
            name="gender"
            value={formData.gender}
            onChange={handleInputChange}
            as="select"
            options={[
              { value: 'MALE', label: 'Male' },
              { value: 'FEMALE', label: 'Female' },
              { value: 'OTHER', label: 'Other' },
            ]}
          />
          <div className="md:col-span-2">
            <FormField
              label="Address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              as="textarea"
            />
          </div>
          <FormField
            label="Date of Birth"
            name="dob"
            type="date"
            value={formData.dob}
            onChange={handleInputChange}
            error={formErrors.dob}
            max={maxDate}
          />
          <FormField
            label="National ID"
            name="nid"
            value={formData.nid}
            onChange={handleInputChange}
          />
          <FormField
            label="Passport"
            name="passport"
            value={formData.passport}
            onChange={handleInputChange}
          />
          <FormField
            label="Visa"
            name="visa"
            value={formData.visa}
            onChange={handleInputChange}
          />
          {submitError && <p className="md:col-span-2 text-sm text-red-600">{submitError}</p>}
        </form>
      </Modal>

      <Modal
        isOpen={isPasswordModalOpen}
        title="Change Password"
        subtitle="For your security, choose a strong and unique password."
        onClose={closePasswordModal}
        disableClose={isChangingPassword}
        maxWidthClass="max-w-xl"
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closePasswordModal}
              disabled={isChangingPassword}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-all disabled:opacity-70"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="change-password-form"
              disabled={isChangingPassword}
              className="min-w-[168px] px-5 py-2.5 rounded-xl bg-[#0f172a] text-white font-semibold hover:bg-[#1e293b] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isChangingPassword ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin"></span>
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </button>
          </div>
        }
      >
        <form id="change-password-form" onSubmit={handleChangePassword} className="space-y-4">
          <FormField
            label="Current Password"
            name="currentPassword"
            type="password"
            value={passwordForm.currentPassword}
            onChange={handlePasswordFieldChange}
            error={passwordErrors.currentPassword}
          />
          <FormField
            label="New Password"
            name="newPassword"
            type="password"
            value={passwordForm.newPassword}
            onChange={handlePasswordFieldChange}
            error={passwordErrors.newPassword}
          />
          <FormField
            label="Confirm New Password"
            name="confirmPassword"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={handlePasswordFieldChange}
            error={passwordErrors.confirmPassword}
          />
        </form>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        title="Delete Account"
        subtitle="This action is permanent."
        onClose={closeDeleteModal}
        disableClose={isDeletingAccount}
        maxWidthClass="max-w-lg"
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeDeleteModal}
              disabled={isDeletingAccount}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-all disabled:opacity-70"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={!canConfirm || isDeletingAccount}
              className="min-w-[168px] px-5 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isDeletingAccount ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin"></span>
                  Deleting...
                </>
              ) : (
                'Delete Account'
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            This action cannot be undone
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="delete-confirmation" className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Type "{confirmationText}" to confirm
            </label>
            <input
              id="delete-confirmation"
              type="text"
              value={confirmationInput}
              onChange={(event) => setConfirmationInput(event.target.value)}
              disabled={isDeletingAccount}
              placeholder={confirmationText}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProfilePage;
