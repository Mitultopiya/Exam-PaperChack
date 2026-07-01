import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUploadCloud, FiCheckSquare } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { subjectiveApi } from '../services/endpoints';
import { notify, errorMessage } from '../services/notify';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';

export default function UploadStudentPDF() {
  const navigate = useNavigate();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [masterKeyId, setMasterKeyId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    subjectiveApi
      .masterKeys()
      .then((res) => setKeys(res.data.data))
      .catch((err) => notify.error(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const handleEvaluate = async () => {
    if (!masterKeyId) {
      notify.info('Select a master answer key');
      return;
    }
    if (!file) {
      notify.info('Upload the student answer sheet PDF');
      return;
    }

    const formData = new FormData();
    formData.append('master_key_id', masterKeyId);
    formData.append('file', file);
    if (studentName) formData.append('student_name', studentName);

    setSubmitting(true);
    try {
      const res = await subjectiveApi.evaluate(formData);
      if (res.data.data?.meta?.low_confidence) {
        Swal.fire({
          icon: 'warning',
          title: 'OCR processed — please verify',
          html: `Some answers could not be read clearly.<br><strong>OCR Confidence: ${res.data.data.meta.ocr_confidence}%</strong><br>Please verify the marked answers before final submission.`,
          confirmButtonColor: '#2563eb',
        });
      }
      notify.success(res.data.message || 'Checked PDF ready!');
      navigate(`/ai-results/${res.data.data.id}`);
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Evaluation failed',
        text: errorMessage(err),
        confirmButtonColor: '#2563eb',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner label="Loading..." />;

  return (
    <>
      <PageHeader
        title="Upload Student Answer Sheet"
        breadcrumbs={['Home', 'AI Evaluation', 'Student PDF']}
      />

      <div className="content-card p-4">
        <h6 className="fw-bold mb-3">
          <FiUploadCloud className="me-2 text-primary" />
          Step 2 — Student Answer Sheet PDF
        </h6>
            <p className="text-muted small">
              Upload any PDF — text or scanned. OCR runs automatically when needed.
            </p>

        <div className="row g-3 mb-4">
          <div className="col-12 col-md-6">
            <label className="form-label small fw-semibold">Master Answer Key</label>
            <select
              className="form-select"
              value={masterKeyId}
              onChange={(e) => setMasterKeyId(e.target.value)}
            >
              <option value="">-- Select master key --</option>
              {keys.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.title} ({k.total_questions} Q)
                </option>
              ))}
            </select>
            {keys.length === 0 && (
              <small className="text-danger">Upload a master answer key first.</small>
            )}
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label small fw-semibold">Student Name (optional)</label>
            <input
              className="form-control"
              placeholder="Student name"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
            />
          </div>
        </div>

        <div className="border border-2 border-dashed rounded-3 p-4 text-center bg-light mb-4">
          <input
            type="file"
            accept=".pdf"
            className="form-control"
            style={{ maxWidth: 400, margin: '0 auto' }}
            onChange={(e) => setFile(e.target.files[0])}
          />
          {file && <p className="small text-success mt-2 mb-0">{file.name}</p>}
        </div>

        <div className="d-flex justify-content-end">
          <button
            className="btn btn-primary px-4"
            onClick={handleEvaluate}
            disabled={submitting || !keys.length}
          >
            {submitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                AI Evaluating &amp; Marking PDF...
              </>
            ) : (
              <>
                <FiCheckSquare className="me-1" /> Evaluate &amp; Mark PDF
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
