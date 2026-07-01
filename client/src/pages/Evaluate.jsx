import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUploadCloud, FiEdit3, FiCheckSquare } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { examApi, studentApi, evaluationApi } from '../services/endpoints';
import { notify, errorMessage } from '../services/notify';
import PageHeader from '../components/PageHeader';

const OPTIONS = ['A', 'B', 'C', 'D'];

export default function Evaluate() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [examId, setExamId] = useState('');
  const [exam, setExam] = useState(null);
  const [mode, setMode] = useState('file'); // 'file' | 'manual'
  const [file, setFile] = useState(null);
  const [manual, setManual] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([examApi.list(), studentApi.list()])
      .then(([e, s]) => {
        setExams(e.data.data);
        setStudents(s.data.data);
      })
      .catch((err) => notify.error(errorMessage(err)));
  }, []);

  useEffect(() => {
    if (!examId) {
      setExam(null);
      return;
    }
    examApi.get(examId).then((res) => setExam(res.data.data)).catch(() => {});
    setManual({});
  }, [examId]);

  const setManualAnswer = (qno, opt) =>
    setManual((prev) => ({ ...prev, [qno]: prev[qno] === opt ? '' : opt }));

  const handleSubmit = async () => {
    if (!studentId || !examId) {
      notify.info('Select both a student and an exam');
      return;
    }
    const formData = new FormData();
    formData.append('student_id', studentId);
    formData.append('exam_id', examId);

    if (mode === 'file') {
      if (!file) {
        notify.info('Please choose an answer file');
        return;
      }
      formData.append('file', file);
    } else {
      const answers = Object.entries(manual)
        .filter(([, v]) => v)
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
      if (Object.keys(answers).length === 0) {
        notify.info('Enter at least one answer');
        return;
      }
      formData.append('answers', JSON.stringify(answers));
    }

    setSubmitting(true);
    try {
      const res = await evaluationApi.evaluate(formData);
      notify.success('Evaluation completed');
      navigate(`/results/${res.data.data.id}`);
    } catch (err) {
      // Show the full message in a readable dialog (messages can be long).
      Swal.fire({
        icon: 'error',
        title: 'Could not evaluate',
        text: errorMessage(err),
        confirmButtonColor: '#2563eb',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title="Evaluate Paper" breadcrumbs={['Home', 'Evaluate']} />

      <div className="content-card p-4">
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-6">
            <label className="form-label small fw-semibold">Student</label>
            <select
              className="form-select"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            >
              <option value="">-- Select student --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.enrollment_no})
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label small fw-semibold">Exam</label>
            <select
              className="form-select"
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
            >
              <option value="">-- Select exam --</option>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} ({e.subject})
                </option>
              ))}
            </select>
          </div>
        </div>

        <ul className="nav nav-pills mb-3 gap-2">
          <li className="nav-item">
            <button
              className={`nav-link ${mode === 'file' ? 'active' : ''}`}
              onClick={() => setMode('file')}
            >
              <FiUploadCloud className="me-1" /> Upload File
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${mode === 'manual' ? 'active' : ''}`}
              onClick={() => setMode('manual')}
            >
              <FiEdit3 className="me-1" /> Manual Entry
            </button>
          </li>
        </ul>

        {mode === 'file' ? (
          <div>
            <div className="border border-2 border-dashed rounded-3 p-5 text-center bg-light">
              <FiUploadCloud size={40} className="text-primary mb-2" />
              <p className="mb-2 text-muted">
                Upload a structured answer file (JSON, CSV, TXT, or PDF). No OCR is used.
              </p>
              <input
                type="file"
                accept=".json,.csv,.txt,.pdf"
                className="form-control"
                style={{ maxWidth: 360, margin: '0 auto' }}
                onChange={(e) => setFile(e.target.files[0])}
              />
              {file && <p className="mt-2 small text-success">Selected: {file.name}</p>}
            </div>
            <div className="alert alert-light border mt-3 small mb-0">
              <strong>Supported formats:</strong>
              <ul className="mb-0 mt-1">
                <li>
                  JSON: <code>{`{ "1": "A", "2": "C" }`}</code> or{' '}
                  <code>{`[{"question_no":1,"answer":"A"}]`}</code>
                </li>
                <li>
                  CSV: <code>question_no,answer</code> rows, e.g. <code>1,A</code>
                </li>
                <li>
                  TXT: lines like <code>1:A</code>, <code>2 = C</code>
                </li>
              </ul>
            </div>
          </div>
        ) : !exam ? (
          <div className="text-muted">Select an exam to enter answers.</div>
        ) : (
          <div className="row g-2">
            {Array.from({ length: exam.total_questions }).map((_, i) => {
              const qno = i + 1;
              return (
                <div className="col-12 col-sm-6 col-lg-4 col-xl-3" key={qno}>
                  <div className="d-flex align-items-center border rounded-3 p-2">
                    <span className="fw-semibold text-muted me-2 text-end" style={{ width: 36 }}>
                      Q{qno}
                    </span>
                    <div className="d-flex flex-wrap">
                      {OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className={`answer-option-btn ${
                            manual[qno] === opt ? 'selected' : ''
                          }`}
                          onClick={() => setManualAnswer(qno, opt)}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 d-flex justify-content-end">
          <button className="btn btn-primary px-4" onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" /> Evaluating...
              </>
            ) : (
              <>
                <FiCheckSquare className="me-1" /> Evaluate
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
