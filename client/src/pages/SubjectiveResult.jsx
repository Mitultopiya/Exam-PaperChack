import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FiDownload,
  FiCheckCircle,
  FiXCircle,
  FiArrowLeft,
} from 'react-icons/fi';
import { subjectiveApi } from '../services/endpoints';
import { notify, errorMessage } from '../services/notify';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import PDFViewer from '../components/PDFViewer';

export default function SubjectiveResult() {
  const { id } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    subjectiveApi
      .result(id)
      .then((res) => setResult(res.data.data))
      .catch((err) => notify.error(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  const downloadMarked = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(subjectiveApi.downloadUrl(id), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Checked_${result.student_name || 'Student'}.pdf`;
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
  const meta = result.meta || {};

  return (
    <>
      <PageHeader
        title="Checked Answer Sheet"
        breadcrumbs={['Home', 'AI Results', 'Detail']}
        actions={
          <>
            <Link to="/ai-results" className="btn btn-light">
              <FiArrowLeft className="me-1" /> Back
            </Link>
            <button className="btn btn-success" onClick={downloadMarked} disabled={downloading}>
              <FiDownload className="me-1" />
              {downloading ? 'Preparing...' : 'Download Checked Answer Sheet'}
            </button>
          </>
        }
      />

      {meta.ocr_used && (
        <div className={`alert ${meta.low_confidence ? 'alert-warning' : 'alert-info'} mb-3`}>
          {meta.pdf_type === 'scanned' ? 'Scanned PDF processed via OCR.' : 'PDF processed.'}{' '}
          <strong>OCR Confidence: {meta.ocr_confidence}%</strong>
          {meta.low_confidence &&
            ' — Some answers could not be read clearly. Please verify the marked answers before final submission.'}
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="stat-card text-center">
            <div className="stat-value">{result.total_questions}</div>
            <div className="stat-label">Total Questions</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="stat-card text-center">
            <div className="stat-value text-success">{result.correct_count}</div>
            <div className="stat-label">Correct</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="stat-card text-center">
            <div className="stat-value text-danger">{result.wrong_count}</div>
            <div className="stat-label">Wrong</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="stat-card text-center">
            <div className="stat-value text-primary">{result.percentage}%</div>
            <div className="stat-label">Percentage</div>
          </div>
        </div>
      </div>

      <div className="mb-3">
        <span
          className={`badge fs-6 px-3 py-2 ${result.status === 'pass' ? 'bg-success' : 'bg-danger'}`}
        >
          {result.status === 'pass' ? 'PASS' : 'FAIL'}
        </span>
        <span className="text-muted ms-3 small">
          {result.student_name || 'Student'} — {result.master_title}
        </span>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-7">
          <PDFViewer
            url={subjectiveApi.downloadUrl(id)}
            title="Marked Original Student PDF (Preview)"
          />
          <p className="small text-muted mt-2">
            This is your original student PDF with green ticks, red circles, and a summary page added.
          </p>
        </div>
        <div className="col-12 col-lg-5">
          <div className="content-card">
            <div className="p-3 border-bottom fw-bold">AI Matching Results</div>
            <div className="p-3">
              {details.map((d) => (
                <div key={d.question_no} className="border rounded-3 p-3 mb-2">
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="fw-semibold">Q{d.question_no}</div>
                    <span className={`badge ${d.is_correct ? 'bg-success' : 'bg-danger'}`}>
                      {d.score}%
                    </span>
                  </div>
                  <div className="small text-muted mt-1">{d.question}</div>
                  <div className="small mt-2">
                    <strong>Student:</strong> {d.student_answer}
                  </div>
                  <div className="small mt-1">
                    {d.is_correct ? (
                      <span className="result-correct">
                        <FiCheckCircle className="me-1" /> Correct
                      </span>
                    ) : (
                      <span className="result-wrong">
                        <FiXCircle className="me-1" /> Wrong
                      </span>
                    )}
                  </div>
                  {d.reason && (
                    <div className="small text-muted mt-1">{d.reason}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
