// Centered loading spinner.
export default function Spinner({ label = 'Loading...' }) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center py-5 text-muted">
      <div className="spinner-border text-primary mb-2" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      <span>{label}</span>
    </div>
  );
}
