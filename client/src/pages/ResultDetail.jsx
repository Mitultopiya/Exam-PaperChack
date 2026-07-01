import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiDownload, FiCheckCircle, FiXCircle, FiMinusCircle, FiArrowLeft } from 'react-icons/fi';
import { evaluationApi } from '../services/endpoints';
import { notify, errorMessage } from '../services/notify';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';

const SummaryCard = ({ label, value, color }) => (
  <div className="col">
    <div className="stat-card text-center">
      <div className="stat-value" style={{ color }}>
        {value}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  </div>
);

const ResultBadge = ({ result }) => {
  if (result === 'correct')
    return (
      <span className="result-correct">
        <FiCheckCircle className="me-1" /> Correct
      </span>
    );
  if (result === 'wrong')
    return (
      <span className="result-wrong">
        <FiXCircle className="me-1" /> Incorrect
      </span>
    );
  return (
    <span className="result-skipped">
      <FiMinusCircle className="me-1" /> Not Attempted
    </span>
  );
};

export default function ResultDetail() {
  const { id } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    evaluationApi
      .result(id)
      .then((res) => setResult(res.data.data))
      .catch((err) => notify.error(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(evaluationApi.pdfUrl(id), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to generate PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Result_${result.enrollment_no}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <Spinner label="Loading result..." />;
  if (!result) return <EmptyState message="Result not found" />;

  const details = result.details_json || [];

  return (
    <>
      <PageHeader
        title="Evaluation Result"
        breadcrumbs={['Home', 'Results', 'Detail']}
        actions={
          <>
            <Link to="/results" className="btn btn-light">
              <FiArrowLeft className="me-1" /> Back
            </Link>
            <button className="btn btn-primary" onClick={downloadPdf} disabled={downloading}>
              <FiDownload className="me-1" /> {downloading ? 'Preparing...' : 'Download PDF'}
            </button>
          </>
        }
      />

      <div className="row g-3 mb-3">
        <div className="col-12 col-lg-6">
          <div className="content-card p-3 h-100">
            <h6 className="fw-bold mb-3">Student Information</h6>
            <div className="row small">
              <div className="col-6 mb-2">
                <span className="text-muted">Name:</span> <strong>{result.student_name}</strong>
              </div>
              <div className="col-6 mb-2">
                <span className="text-muted">Enrollment:</span> {result.enrollment_no}
              </div>
              <div className="col-6 mb-2">
                <span className="text-muted">Email:</span> {result.student_email || '-'}
              </div>
              <div className="col-6 mb-2">
                <span className="text-muted">Course/Batch:</span> {result.course || '-'} /{' '}
                {result.batch || '-'}
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <div className="content-card p-3 h-100">
            <h6 className="fw-bold mb-3">Exam Information</h6>
            <div className="row small">
              <div className="col-6 mb-2">
                <span className="text-muted">Exam:</span> <strong>{result.exam_title}</strong>
              </div>
              <div className="col-6 mb-2">
                <span className="text-muted">Subject:</span> {result.subject}
              </div>
              <div className="col-6 mb-2">
                <span className="text-muted">Total Questions:</span> {result.total_questions}
              </div>
              <div className="col-6 mb-2">
                <span className="text-muted">Total Marks:</span> {result.total_marks}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row row-cols-2 row-cols-md-4 row-cols-xl-7 g-3 mb-3">
        <SummaryCard label="Total Q" value={result.total_questions} color="#1e293b" />
        <SummaryCard label="Correct" value={result.correct_answers} color="#22c55e" />
        <SummaryCard label="Wrong" value={result.wrong_answers} color="#ef4444" />
        <SummaryCard label="Skipped" value={result.skipped_answers} color="#64748b" />
        <SummaryCard label="Marks" value={result.marks} color="#2563eb" />
        <SummaryCard label="Percentage" value={`${result.percentage}%`} color="#f59e0b" />
        <SummaryCard label="Grade" value={result.grade} color="#7c3aed" />
      </div>

      <div className="mb-3">
        <span
          className={`badge fs-6 px-3 py-2 ${result.status === 'pass' ? 'bg-success' : 'bg-danger'}`}
        >
          {result.status === 'pass' ? 'PASS' : 'FAIL'}
        </span>
      </div>

      <div className="content-card">
        <div className="p-3 border-bottom fw-bold">Question-wise Result</div>
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Question No</th>
                <th>Correct Answer</th>
                <th>Student Answer</th>
                <th>Result</th>
                <th className="text-end">Marks Awarded</th>
              </tr>
            </thead>
            <tbody>
              {details.map((d) => (
                <tr key={d.question_no}>
                  <td className="fw-semibold">Q{d.question_no}</td>
                  <td>
                    <span className="badge bg-light text-dark">{d.correct_answer}</span>
                  </td>
                  <td>
                    <span className="badge bg-light text-dark">{d.student_answer}</span>
                  </td>
                  <td>
                    <ResultBadge result={d.result} />
                  </td>
                  <td className="text-end">{d.marks_awarded}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
