import { useEffect, useState } from 'react';
import { FiUploadCloud, FiTrash2, FiFileText, FiSave, FiRefreshCw } from 'react-icons/fi';
import { subjectiveApi } from '../services/endpoints';
import { notify, errorMessage, confirmDialog } from '../services/notify';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';

const OPTIONS = ['A', 'B', 'C', 'D'];

export default function UploadAnswerKey() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingAnswers, setSavingAnswers] = useState(false);
  const [reExtracting, setReExtracting] = useState(false);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mcqSelections, setMcqSelections] = useState({});

  const load = () => {
    setLoading(true);
    subjectiveApi
      .masterKeys()
      .then((res) => setKeys(res.data.data))
      .catch((err) => notify.error(errorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const handleUpload = async () => {
    if (!file) {
      notify.info('Select a PDF file');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);

    setUploading(true);
    try {
      const res = await subjectiveApi.uploadMasterKey(formData);
      const data = res.data.data;
      notify.success(res.data.message);
      if (data.low_confidence) {
        notify.info(
          `OCR Confidence: ${data.ocr_confidence}%. Some answers may need verification.`
        );
      }
      setFile(null);
      setTitle('');
      setPreview(data);
      if (data.needs_answers) {
        const sel = {};
        data.questions.forEach((q) => {
          const letter = q.answer?.match(/^([A-D])/i)?.[1]?.toUpperCase();
          if (letter) sel[q.question_no] = letter;
        });
        setMcqSelections(sel);
      } else {
        setMcqSelections({});
      }
      load();
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const saveMcqAnswers = async () => {
    if (!preview?.id) return;
    const answers = Object.entries(mcqSelections).map(([question_no, correct_answer]) => ({
      question_no: Number(question_no),
      correct_answer,
    }));
    if (answers.length < preview.questions.length) {
      notify.info('Please select the correct option for every question');
      return;
    }
    setSavingAnswers(true);
    try {
      const res = await subjectiveApi.saveMasterAnswers(preview.id, answers);
      notify.success('Answer key saved');
      setPreview(res.data.data);
      setMcqSelections({});
      load();
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setSavingAnswers(false);
    }
  };

  const handleReExtract = async () => {
    if (!preview?.id) return;
    setReExtracting(true);
    try {
      const res = await subjectiveApi.reExtractMasterKey(preview.id);
      const data = res.data.data;
      notify.success(res.data.message);
      setPreview(data);
      if (data.low_confidence) {
        notify.info(
          `OCR Confidence: ${data.ocr_confidence}%. Some answers may need verification.`
        );
      }
      load();
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setReExtracting(false);
    }
  };

  const viewKey = async (id) => {
    try {
      const res = await subjectiveApi.masterKey(id);
      setPreview(res.data.data);
      setMcqSelections({});
    } catch (err) {
      notify.error(errorMessage(err));
    }
  };

  const handleDelete = async (k) => {
    const ok = await confirmDialog({ title: 'Delete master key?', text: k.title });
    if (!ok) return;
    try {
      await subjectiveApi.removeMasterKey(k.id);
      notify.success('Deleted');
      if (preview?.id === k.id) setPreview(null);
      load();
    } catch (err) {
      notify.error(errorMessage(err));
    }
  };

  const pickOption = (qno, opt) => {
    setMcqSelections((prev) => ({ ...prev, [qno]: opt }));
  };

  const needsSetup = preview?.needs_answers || preview?.questions?.some((q) => !q.answer);

  return (
    <>
      <PageHeader
        title="Upload Master Answer Key"
        breadcrumbs={['Home', 'AI Evaluation', 'Master Answer Key']}
      />

      <div className="row g-3">
        <div className="col-12 col-lg-5">
          <div className="content-card p-4">
            <h6 className="fw-bold mb-3">
              <FiUploadCloud className="me-2 text-primary" />
              Upload Text-Based PDF
            </h6>
            <p className="text-muted small">
              Upload any PDF — text-based or scanned. The system auto-detects the type and runs OCR
              when needed (CamScanner, Adobe Scan, camera scans, printed &amp; handwritten sheets).
            </p>
            <ul className="small text-muted">
              <li>Text PDFs — read instantly</li>
              <li>Scanned PDFs — OCR runs automatically</li>
              <li>Subjective, MCQ, and mixed formats supported</li>
            </ul>
            <div className="mb-3">
              <label className="form-label small fw-semibold">Title (optional)</label>
              <input
                className="form-control"
                placeholder="e.g. HTML MCQ Test"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <input
                type="file"
                accept=".pdf"
                className="form-control"
                onChange={(e) => setFile(e.target.files[0])}
              />
              {file && <p className="small text-success mt-2 mb-0">{file.name}</p>}
            </div>
            <button className="btn btn-primary w-100" onClick={handleUpload} disabled={uploading}>
              {uploading ? 'Reading PDF...' : 'Upload & Extract'}
            </button>
          </div>
        </div>

        <div className="col-12 col-lg-7">
          <div className="content-card">
            <div className="p-3 border-bottom fw-semibold">Saved Master Keys</div>
            {loading ? (
              <Spinner />
            ) : keys.length === 0 ? (
              <EmptyState message="No master answer keys yet" />
            ) : (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Questions</th>
                      <th>Date</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((k) => (
                      <tr key={k.id}>
                        <td className="fw-semibold">{k.title}</td>
                        <td>{k.total_questions}</td>
                        <td className="small text-muted">{k.created_at?.slice(0, 10)}</td>
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-outline-primary me-1"
                            onClick={() => viewKey(k.id)}
                          >
                            <FiFileText />
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(k)}
                          >
                            <FiTrash2 />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {preview && (
            <div className="content-card mt-3 p-3">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0">Extracted — {preview.title}</h6>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={handleReExtract}
                    disabled={reExtracting}
                    title="Re-run OCR and question detection"
                  >
                    <FiRefreshCw className="me-1" />
                    {reExtracting ? 'Re-extracting...' : 'Re-extract'}
                  </button>
                  {needsSetup && (
                    <button
                      className="btn btn-success btn-sm"
                      onClick={saveMcqAnswers}
                      disabled={savingAnswers}
                    >
                      <FiSave className="me-1" />
                      {savingAnswers ? 'Saving...' : 'Save Answer Key'}
                    </button>
                  )}
                </div>
              </div>

              {preview.ocr_used && (
                <div
                  className={`alert small mb-3 ${preview.low_confidence ? 'alert-warning' : 'alert-info'}`}
                >
                  {preview.pdf_type === 'scanned' ? 'Scanned PDF detected' : 'PDF processed'} — OCR
                  used ({preview.ocr_confidence}% confidence).
                  {preview.low_confidence &&
                    ' Some answers could not be read clearly. Please verify before final submission.'}
                </div>
              )}

              {preview.questions?.length === 0 && (
                <div className="alert alert-danger small">
                  No questions detected. Click <strong>Re-extract</strong> to run OCR again, or
                  delete and re-upload a clearer PDF scan.
                </div>
              )}

              {needsSetup && preview.questions?.length > 0 && (
                <div className="alert alert-warning small">
                  MCQ questions detected. Select the correct option (A/B/C/D) for each question, then
                  click <strong>Save Answer Key</strong>.
                </div>
              )}

              {preview.questions?.map((q) => (
                <div key={q.question_no} className="border rounded-3 p-3 mb-2">
                  <div className="fw-semibold text-primary mb-1">
                    Q{q.question_no}. {q.question.split('\n')[0]}
                  </div>
                  {q.options ? (
                    <div className="d-flex flex-wrap gap-1 mt-2">
                      {OPTIONS.filter((o) => q.options[o]).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className={`answer-option-btn ${
                            (mcqSelections[q.question_no] || q.answer?.[0]) === opt
                              ? 'selected'
                              : ''
                          }`}
                          onClick={() => needsSetup && pickOption(q.question_no, opt)}
                          disabled={!needsSetup}
                          title={q.options[opt]}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {q.answer ? (
                    <div className="small mt-2 text-success">
                      <strong>Answer:</strong> {q.answer}
                    </div>
                  ) : needsSetup ? (
                    <div className="small mt-2 text-muted">Select correct option above</div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
