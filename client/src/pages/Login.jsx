import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { FiAward, FiMail, FiLock } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { notify, errorMessage } from '../services/notify';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { email: 'admin@example.com', password: 'admin123' } });

  if (isAuthenticated) {
    navigate('/dashboard', { replace: true });
  }

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      await login(data);
      notify.success('Welcome back!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      notify.error(errorMessage(err, 'Login failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="text-center mb-4">
          <div
            className="d-inline-grid bg-primary text-white rounded-3 mb-3"
            style={{ width: 56, height: 56, placeItems: 'center', fontSize: '1.6rem' }}
          >
            <FiAward />
          </div>
          <h4 className="fw-bold mb-1">Smart Answer Evaluation</h4>
          <p className="text-muted small mb-0">Admin Portal — sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="mb-3">
            <label className="form-label small fw-semibold">Email</label>
            <div className="input-group">
              <span className="input-group-text bg-light">
                <FiMail />
              </span>
              <input
                type="email"
                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                placeholder="admin@example.com"
                {...register('email', { required: 'Email is required' })}
              />
            </div>
            {errors.email && <small className="text-danger">{errors.email.message}</small>}
          </div>

          <div className="mb-4">
            <label className="form-label small fw-semibold">Password</label>
            <div className="input-group">
              <span className="input-group-text bg-light">
                <FiLock />
              </span>
              <input
                type="password"
                className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                placeholder="••••••••"
                {...register('password', { required: 'Password is required' })}
              />
            </div>
            {errors.password && <small className="text-danger">{errors.password.message}</small>}
          </div>

          <button type="submit" className="btn btn-primary w-100 py-2" disabled={submitting}>
            {submitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="text-center text-muted small mt-4 mb-0">
          Default: admin@example.com / admin123
        </p>
      </div>
    </div>
  );
}
