import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiEye, FiDownload, FiTrash2 } from 'react-icons/fi';
import { subjectiveApi } from '../services/endpoints';
import { notify, errorMessage, confirmDialog } from '../services/notify';
import PageHeader from '../components/PageHeader';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';

export default function SubjectiveResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    subjectiveApi
      .results()
      .then((res) => setResults(res.data.data))
      .catch((err) => notify.error(errorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const download = async (r) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(subjectiveApi.downloadUrl(r.id), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Checked_${r.student_name || 'Student'}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      notify.error(errorMessage(err));
    }
  };

  const handleDelete = async (r) => {
    const ok = await confirmDialog({ title: 'Delete this result?' });
    if (!ok) return;
    try {
      await subjectiveApi.remove(r.id);
      notify.success('Deleted');
      load();
    } catch (err) {
      notify.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader
        title="AI Evaluation History"
        breadcrumbs={['Home', 'AI Results']}
      />

      <div className="content-card">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Student</th>
                <th>Master Key</th>
                <th>Correct</th>
                <th>Wrong</th>
                <th>%</th>
                <th>Status</th>
                <th>Date</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            {loading ? (
              <TableSkeleton rows={5} cols={8} />
            ) : (
              <tbody>
                {results.map((r) => (
                  <tr key={r.id}>
                    <td className="fw-semibold">{r.student_name || '—'}</td>
                    <td>{r.master_title}</td>
                    <td className="text-success">{r.correct_count}</td>
                    <td className="text-danger">{r.wrong_count}</td>
                    <td>{r.percentage}%</td>
                    <td>
                      <span className={`badge ${r.status === 'pass' ? 'bg-success' : 'bg-danger'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="small text-muted">{r.created_at?.slice(0, 10)}</td>
                    <td className="text-end">
                      <Link to={`/ai-results/${r.id}`} className="btn btn-sm btn-outline-primary me-1">
                        <FiEye />
                      </Link>
                      <button className="btn btn-sm btn-outline-success me-1" onClick={() => download(r)}>
                        <FiDownload />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(r)}>
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
          {!loading && results.length === 0 && (
            <EmptyState message="No AI evaluations yet. Upload a student PDF to get started." />
          )}
        </div>
      </div>
    </>
  );
}
