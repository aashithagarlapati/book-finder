import { useEffect, useMemo, useState } from 'react';
import { admin } from '../api/client';
import './AccountsAdminPage.css';

const ADMIN_KEY_STORAGE = 'adminPanelKey';

const formatDate = (date) => {
  if (!date) return 'Unknown';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Unknown';
  return parsed.toLocaleString();
};

function AccountsAdminPage() {
  const [adminKey, setAdminKey] = useState(localStorage.getItem(ADMIN_KEY_STORAGE) || '');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmUid, setConfirmUid] = useState('');

  const hasKey = useMemo(() => adminKey.trim().length > 0, [adminKey]);

  const loadUsers = async () => {
    if (!hasKey) {
      setError('Enter admin key to access account management.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await admin.listAccounts(adminKey.trim());
      setUsers(response.data.users || []);
      localStorage.setItem(ADMIN_KEY_STORAGE, adminKey.trim());
    } catch (err) {
      setUsers([]);
      setError(err?.response?.data?.error || 'Unable to load accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasKey) {
      loadUsers();
    }
  }, []);

  const handleDelete = async (uid) => {
    if (!hasKey) {
      setError('Enter admin key before deleting an account.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await admin.deleteAccount(uid, adminKey.trim());
      setUsers((prev) => prev.filter((user) => user.uid !== uid));
      setConfirmUid('');
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to delete account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="accounts-admin-page">
      <div className="container">
        <div className="admin-header">
          <h1>Account Management</h1>
          <p>Direct-link admin view to inspect signed up accounts and remove users.</p>
        </div>

        <div className="admin-key-card">
          <label htmlFor="adminKey">Admin key</label>
          <div className="admin-key-row">
            <input
              id="adminKey"
              type="password"
              placeholder="Enter admin key"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
            />
            <button className="btn btn-primary" onClick={loadUsers} disabled={loading || !hasKey}>
              {loading ? 'Loading...' : 'Load Accounts'}
            </button>
          </div>
          <p className="admin-key-help">This page is intentionally not linked in navigation and is only available by direct URL.</p>
        </div>

        {error && <div className="msg-error">{error}</div>}

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-row">No accounts to show.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.uid}>
                    <td>{user.displayName || 'Unnamed user'}</td>
                    <td>{user.email || 'No email'}</td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      {confirmUid === user.uid ? (
                        <div className="confirm-actions">
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(user.uid)}
                            disabled={loading}
                          >
                            Confirm
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setConfirmUid('')}
                            disabled={loading}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setConfirmUid(user.uid)}
                          disabled={loading}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AccountsAdminPage;
