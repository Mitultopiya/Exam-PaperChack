import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiEye, FiDownload, FiTrash2, FiFilter, FiX } from 'react-icons/fi';
import { evaluationApi, examApi } from '../services/endpoints';
import { notify, errorMessage, confirmDialog } from '../services/notify';
import PageHeader from '../components/PageHeader';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';

const emptyFilters = {
  search: '',
  exam_id: '',
  subject: '',
  result: '',
  dateFrom: '',
  dateTo: '',
  minPercentage: '',
};

export default function Results() {
  const [results, setResults] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(emptyFilters);

  const load = async () => {
    setLoading(true);
    try {
      const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await evaluationApi.results(clean);
      setResults(res.data.data);
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    examApi.list().then((res) => setExams(res.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const { page, setPage, totalPages, pageItems } = usePagination(results, 10);

  const subjects = [...new Set(exams.map((e) => e.subject))];

  const setField = (k, v) => setFilters((prev) => ({ ...prev, [k]: v }));

  const handleDelete = async (r) => {
    const ok = await confirmDialog({ title: 'Delete result?', text: 'This cannot be undone.' });
    if (!ok) return;
    try {
      await evaluationApi.remove(r.id);
      notify.success('Result deleted');
      load();
    } catch (err) {
      notify.error(errorMessage(err));
    }
  };

  const downloadPdf = (r) => {
    const token = localStorage.getItem('token');
    // Open the PDF endpoint with auth via a fetch + blob download.
    fetch(evaluationApi.pdfUrl(r.id), { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to generate PDF');
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Result_${r.enrollment_no}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => notify.error(errorMessage(err)));
  };

  return (
    <>
      <PageHeader title="Results & Reports" breadcrumbs={['Home', 'Results']} />

      <div className="content-card p-3 mb-3">
        <div className="d-flex align-items-center mb-3 text-muted">
          <FiFilter className="me-2" />
          <span className="fw-semibold">Filters</span>
          <button
            className="btn btn-sm btn-link ms-auto text-decoration-none"
            onClick={() => setFilters(emptyFilters)}
          >
            <FiX /> Reset
          </button>
        </div>
        <div className="row g-2">
          <div className="col-12 col-md-3">
            <input
              className="form-control"
              placeholder="Student name / enrollment"
              value={filters.search}
              onChange={(e) => setField('search', e.target.value)}
            />
          </div>
          <div className="col-6 col-md-2">
            <select
              className="form-select"
              value={filters.exam_id}
              onChange={(e) => setField('exam_id', e.target.value)}
            >
              <option value="">All Exams</option>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-2">
            <select
              className="form-select"
              value={filters.subject}
              onChange={(e) => setField('subject', e.target.value)}
            >
              <option value="">All Subjects</option>
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-2">
            <select
              className="form-select"
              value={filters.result}
              onChange={(e) => setField('result', e.target.value)}
            >
              <option value="">All Results</option>
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
            </select>
          </div>
          <div className="col-6 col-md-3">
            <input
              type="number"
              className="form-control"
              placeholder="Min %"
              value={filters.minPercentage}
              onChange={(e) => setField('minPercentage', e.target.value)}
            />
          </div>
          <div className="col-6 col-md-3">
            <input
              type="date"
              className="form-control"
              value={filters.dateFrom}
              onChange={(e) => setField('dateFrom', e.target.value)}
            />
          </div>
          <div className="col-6 col-md-3">
            <input
              type="date"
              className="form-control"
              value={filters.dateTo}
              onChange={(e) => setField('dateTo', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="content-card">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Student</th>
                <th>Exam</th>
                <th>Subject</th>
                <th>Marks</th>
                <th>%</th>
                <th>Grade</th>
                <th>Result</th>
                <th>Date</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            {loading ? (
              <TableSkeleton rows={6} cols={9} />
            ) : (
              <tbody>
                {pageItems.map((r) => (
                  <tr key={r.id}>
                    <td className="fw-semibold">
                      {r.student_name}
                      <div className="text-muted small">{r.enrollment_no}</div>
                    </td>
                    <td>{r.exam_title}</td>
                    <td>{r.subject}</td>
                    <td>{r.marks}</td>
                    <td>{r.percentage}%</td>
                    <td>
                      <span className="badge bg-light text-dark">{r.grade}</span>
                    </td>
                    <td>
                      <span className={`badge ${r.status === 'pass' ? 'bg-success' : 'bg-danger'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="small text-muted">{r.created_at?.slice(0, 10)}</td>
                    <td className="text-end">
                      <Link to={`/results/${r.id}`} className="btn btn-sm btn-outline-primary me-1">
                        <FiEye />
                      </Link>
                      <button
                        className="btn btn-sm btn-outline-success me-1"
                        onClick={() => downloadPdf(r)}
                      >
                        <FiDownload />
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(r)}
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
          {!loading && results.length === 0 && <EmptyState message="No results found" />}
        </div>
        {!loading && results.length > 0 && (
          <div className="p-3 border-top">
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        )}
      </div>
    </>
  );
}
