// client/src/components/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiService, { User } from '../api_service';
import CSVUpload from './CSVUpload';
import ThemeToggle from './ThemeToggle';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upload' | 'profile'>('upload');
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Profile edit state
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await ApiService.getProfile();
      setUser(response.user);
      setNewUsername(response.user.username);
      setNewEmail(response.user.email);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await ApiService.logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
      navigate('/login');
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    try {
      const response = await ApiService.updateProfile({
        username: newUsername !== user?.username ? newUsername : undefined,
        email: newEmail !== user?.email ? newEmail : undefined,
      });

      setUser(response.user);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setShowProfileEdit(false);
      
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: ApiService.handleError(err) });
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmNewPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    try {
      await ApiService.changePassword(currentPassword, newPassword);
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setShowPasswordChange(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: ApiService.handleError(err) });
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loader">
          <div className="spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeWidth="2"/>
              <polyline points="14 2 14 8 20 8" strokeWidth="2"/>
              <line x1="12" y1="18" x2="12" y2="12" strokeWidth="2"/>
              <line x1="9" y1="15" x2="15" y2="15" strokeWidth="2"/>
            </svg>
            {sidebarOpen && <h2>Data Cleanser</h2>}
          </div>
        </div>

        {sidebarOpen && (
          <div className="user-section">
            <div className="user-avatar-large">
              {user?.username.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <strong>{user?.username}</strong>
              <small>{user?.email}</small>
            </div>
          </div>
        )}

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
            title="Upload CSV"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeWidth="2"/>
            </svg>
            {sidebarOpen && <span>Upload CSV</span>}
          </button>

          <button
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
            title="Profile"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" strokeWidth="2"/>
            </svg>
            {sidebarOpen && <span>Profile</span>}
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-button" onClick={handleLogout} title="Logout">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeWidth="2"/>
            </svg>
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-left">
            <h1>
              {activeTab === 'upload' ? '📊 CSV Processing' : '👤 Profile Settings'}
            </h1>
            <p className="header-subtitle">
              {activeTab === 'upload' 
                ? 'Upload, analyze, and preprocess your CSV files' 
                : 'Manage your account settings and preferences'
              }
            </p>
            <ThemeToggle />
          </div>
          
        </header>

        {message && (
          <div className={`notification ${message.type}`}>
            <div className="notification-content">
              {message.type === 'success' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeWidth="2"/>
                  <polyline points="22 4 12 14.01 9 11.01" strokeWidth="2"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                  <line x1="15" y1="9" x2="9" y2="15" strokeWidth="2"/>
                  <line x1="9" y1="9" x2="15" y2="15" strokeWidth="2"/>
                </svg>
              )}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="notification-close">×</button>
          </div>
        )}

        <div className="dashboard-content">
          {activeTab === 'upload' && (
            <CSVUpload />
          )}

          {activeTab === 'profile' && (
            <div className="profile-container">
              <div className="profile-card">
                <div className="profile-card-header">
                  <h2>Account Information</h2>
                </div>
                
                <div className="profile-info-grid">
                  <div className="info-item">
                    <label>Username</label>
                    <div className="info-value">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" strokeWidth="2"/>
                      </svg>
                      {user?.username}
                    </div>
                  </div>
                  
                  <div className="info-item">
                    <label>Email Address</label>
                    <div className="info-value">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" strokeWidth="2"/>
                        <polyline points="22,6 12,13 2,6" strokeWidth="2"/>
                      </svg>
                      {user?.email}
                    </div>
                  </div>
                  
                  <div className="info-item">
                    <label>Member Since</label>
                    <div className="info-value">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2"/>
                        <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2"/>
                        <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2"/>
                        <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2"/>
                      </svg>
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="profile-actions">
                  <button
                    className="btn-action btn-edit"
                    onClick={() => {
                      setShowProfileEdit(!showProfileEdit);
                      setShowPasswordChange(false);
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeWidth="2"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeWidth="2"/>
                    </svg>
                    {showProfileEdit ? 'Cancel Edit' : 'Edit Profile'}
                  </button>
                  <button
                    className="btn-action btn-password"
                    onClick={() => {
                      setShowPasswordChange(!showPasswordChange);
                      setShowProfileEdit(false);
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeWidth="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeWidth="2"/>
                    </svg>
                    {showPasswordChange ? 'Cancel' : 'Change Password'}
                  </button>
                </div>
              </div>

              {showProfileEdit && (
                <div className="profile-card">
                  <div className="profile-card-header">
                    <h2>Edit Profile</h2>
                  </div>
                  <form onSubmit={handleProfileUpdate} className="profile-form">
                    <div className="form-field">
                      <label htmlFor="username">Username</label>
                      <input
                        type="text"
                        id="username"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="Enter username"
                        required
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="email">Email Address</label>
                      <input
                        type="email"
                        id="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="Enter email"
                        required
                      />
                    </div>

                    <button type="submit" className="btn-submit">
                      Save Changes
                    </button>
                  </form>
                </div>
              )}

              {showPasswordChange && (
                <div className="profile-card">
                  <div className="profile-card-header">
                    <h2>Change Password</h2>
                  </div>
                  <form onSubmit={handlePasswordChange} className="profile-form">
                    <div className="form-field">
                      <label htmlFor="current-password">Current Password</label>
                      <input
                        type="password"
                        id="current-password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        required
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="new-password">New Password</label>
                      <input
                        type="password"
                        id="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        required
                      />
                      <small className="field-hint">
                        At least 8 characters with uppercase, lowercase, and numbers
                      </small>
                    </div>

                    <div className="form-field">
                      <label htmlFor="confirm-new-password">Confirm New Password</label>
                      <input
                        type="password"
                        id="confirm-new-password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Confirm new password"
                        required
                      />
                    </div>

                    <button type="submit" className="btn-submit">
                      Update Password
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;