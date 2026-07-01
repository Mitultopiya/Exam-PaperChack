import { FiMenu, FiLogOut, FiUser } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { confirmDialog } from '../services/notify';

export default function Topbar({ onToggleSidebar }) {
  const { admin, logout } = useAuth();

  const handleLogout = async () => {
    const ok = await confirmDialog({
      title: 'Log out?',
      text: 'You will need to sign in again.',
      confirmText: 'Log out',
    });
    if (ok) logout();
  };

  return (
    <header className="topbar">
      <button className="btn btn-light d-lg-none" onClick={onToggleSidebar}>
        <FiMenu />
      </button>
      <div className="fw-semibold d-none d-lg-block">Smart Answer Sheet Evaluation Portal</div>
      <div className="dropdown ms-auto">
        <button
          className="btn btn-light d-flex align-items-center gap-2 dropdown-toggle"
          data-bs-toggle="dropdown"
        >
          <span
            className="rounded-circle bg-primary text-white d-grid"
            style={{ width: 32, height: 32, placeItems: 'center' }}
          >
            <FiUser />
          </span>
          <span className="d-none d-sm-inline">{admin?.name || 'Admin'}</span>
        </button>
        <ul className="dropdown-menu dropdown-menu-end shadow-sm">
          <li>
            <span className="dropdown-item-text small text-muted">{admin?.email}</span>
          </li>
          <li>
            <hr className="dropdown-divider" />
          </li>
          <li>
            <button className="dropdown-item text-danger" onClick={handleLogout}>
              <FiLogOut className="me-2" />
              Logout
            </button>
          </li>
        </ul>
      </div>
    </header>
  );
}
