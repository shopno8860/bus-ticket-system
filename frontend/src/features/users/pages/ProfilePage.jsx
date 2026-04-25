import React from 'react';
import { useAuth } from '../../auth/context/AuthContext';

const ProfileField = ({ label, value }) => (
  <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
    <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-sm md:text-base font-bold text-slate-800">{value || 'Not set yet'}</p>
  </div>
);

const ProfilePage = () => {
  const { user, logout } = useAuth();

  // Dummy data as requested
  const dummyUser = {
    name: "Rakesh Al Yadin",
    email: "test@email.com",
    phone: "01700000000",
    gender: "Male",
    address: "",
    nid: "",
    dob: "",
    passport: "",
    visa: ""
  };

  const displayUser = user ? {
    name: user.fullName || user.name || dummyUser.name,
    email: user.email || dummyUser.email,
    phone: user.phoneNumber || user.phone || dummyUser.phone,
    gender: user.gender || dummyUser.gender,
    address: user.address || dummyUser.address,
    nid: user.nid || dummyUser.nid,
    dob: user.dob || dummyUser.dob,
    passport: user.passport || dummyUser.passport,
    visa: user.visa || dummyUser.visa
  } : dummyUser;

  const menuItems = [
    { id: 'profile', label: 'My Profile', icon: '👤', active: true },
    { id: 'password', label: 'Change Password', icon: '🔒' },
    { id: 'delete', label: 'Account Delete', icon: '🗑️', color: 'text-red-500' },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* LEFT SIDE: Sidebar */}
          <aside className="w-full lg:w-80 flex-shrink-0">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden sticky top-24">
              <div className="p-8 text-center border-b border-slate-50">
                <div className="w-24 h-24 rounded-full bg-[#16a34a]/10 mx-auto flex items-center justify-center text-4xl border-4 border-white shadow-lg">
                  👤
                </div>
                <h3 className="mt-4 font-black text-slate-800 text-xl">{displayUser.name}</h3>
                <p className="text-slate-400 text-sm font-medium">{displayUser.email}</p>
              </div>
              
              <nav className="p-4">
                <ul className="space-y-2">
                  {menuItems.map((item) => (
                    <li key={item.id}>
                      <button className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${
                        item.active 
                          ? 'bg-[#16a34a] text-white shadow-lg shadow-[#16a34a]/20' 
                          : `text-slate-600 hover:bg-slate-50 ${item.color || ''}`
                      }`}>
                        <span className="text-xl">{item.icon}</span>
                        {item.label}
                      </button>
                    </li>
                  ))}
                  <li>
                    <button 
                      onClick={logout}
                      className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-red-500 hover:bg-red-50 transition-all"
                    >
                      <span className="text-xl">🚪</span>
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
              <button className="bg-[#16a34a] hover:bg-[#15803d] text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-[#16a34a]/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                Update Profile
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              <ProfileField label="NAME" value={displayUser.name} />
              <ProfileField label="EMAIL" value={displayUser.email} />
              <ProfileField label="PHONE" value={displayUser.phone} />
              <ProfileField label="GENDER" value={displayUser.gender} />
              <ProfileField label="ADDRESS" value={displayUser.address} />
              <ProfileField label="NATIONAL IDENTITY (NID)" value={displayUser.nid} />
              <ProfileField label="DATE OF BIRTH" value={displayUser.dob} />
              <ProfileField label="PASSPORT" value={displayUser.passport} />
              <ProfileField label="VISA" value={displayUser.visa} />
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
    </div>
  );
};

export default ProfilePage;
