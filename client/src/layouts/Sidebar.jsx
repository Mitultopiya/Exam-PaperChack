import { NavLink } from 'react-router-dom';
import {
  FiGrid,
  FiUpload,
  FiFileText,
  FiCheckSquare,
  FiBarChart2,
  FiAward,
  FiBookOpen,
} from 'react-icons/fi';

const aiLinks = [
  { to: '/master-key', label: 'Upload Answer Key', icon: <FiUpload /> },
  { to: '/student-pdf', label: 'Upload Student PDF', icon: <FiFileText /> },
  { to: '/ai-results', label: 'Checked Results', icon: <FiBarChart2 /> },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-icon">
            <FiAward />
          </span>
          <span>AI Evaluator</span>
        </div>
        <nav className="sidebar-nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <FiGrid />
            Dashboard
          </NavLink>

          <div className="px-3 pt-3 pb-1 small text-uppercase text-muted fw-semibold">
            AI Subjective Evaluation
          </div>
          {aiLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              {link.icon}
              {link.label}
            </NavLink>
          ))}

          <div className="px-3 pt-3 pb-1 small text-uppercase text-muted fw-semibold">
            Legacy (MCQ)
          </div>
          <NavLink
            to="/evaluate"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <FiCheckSquare />
            MCQ Evaluate
          </NavLink>
          <NavLink
            to="/results"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <FiBookOpen />
            MCQ Results
          </NavLink>
        </nav>
      </aside>
      <div className={`sidebar-backdrop ${open ? 'show' : ''}`} onClick={onClose} />
    </>
  );
}
