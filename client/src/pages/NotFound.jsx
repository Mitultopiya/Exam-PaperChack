import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center vh-100 text-center">
      <h1 className="display-1 fw-bold text-primary">404</h1>
      <p className="text-muted mb-4">The page you are looking for does not exist.</p>
      <Link to="/dashboard" className="btn btn-primary">
        Back to Dashboard
      </Link>
    </div>
  );
}
