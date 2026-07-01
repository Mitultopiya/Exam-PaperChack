import { useEffect, useState } from 'react';

/**
 * Fetches an authenticated PDF and displays it in an iframe via blob URL.
 */
export default function PDFViewer({ url, title = 'PDF Preview' }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!url) {
      setBlobUrl(null);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError('');

    const token = localStorage.getItem('token');
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error('Could not load PDF');
        return res.blob();
      })
      .then((blob) => {
        if (!active) return;
        const objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load PDF');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [url]);

  if (!url) {
    return (
      <div
        className="border rounded-3 bg-light d-flex align-items-center justify-content-center text-muted"
        style={{ height: 480 }}
      >
        No PDF to preview
      </div>
    );
  }

  return (
    <div className="content-card overflow-hidden">
      <div className="p-3 border-bottom fw-semibold">{title}</div>
      <div className="position-relative" style={{ height: 520 }}>
        {loading && (
          <div className="position-absolute top-50 start-50 translate-middle">
            <div className="spinner-border text-primary" />
          </div>
        )}
        {error && (
          <div className="position-absolute top-50 start-50 translate-middle text-danger small">
            {error}
          </div>
        )}
        {blobUrl && !loading && (
          <iframe
            src={blobUrl}
            title={title}
            style={{ width: '100%', height: '100%', border: 0 }}
          />
        )}
      </div>
    </div>
  );
}
