import { useEffect, useState } from 'react';
import { changeAdminUserRole, getAdminUsers } from '../services/adminApi';

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getAdminUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const updateRole = async (id, role) => {
    try {
      await changeAdminUserRole(id, role);
      await loadUsers();
    } catch (err) {
      alert(err.message || 'Failed to update role');
    }
  };

  if (loading) return <div>Loading users...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-3">
      {users.map((user) => (
        <div
          key={user.id}
          className="flex items-center justify-between rounded border bg-white p-3"
        >
          <div>
            <div className="font-medium">{user.fullName}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
          <select
            className="select select-bordered select-sm"
            value={user.role}
            onChange={(e) => updateRole(user.id, e.target.value)}
          >
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
      ))}
    </div>
  );
}

export default UsersPage;
