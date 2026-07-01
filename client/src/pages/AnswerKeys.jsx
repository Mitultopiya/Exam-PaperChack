import { useEffect, useState } from 'react';
import { FiSave, FiTrash2 } from 'react-icons/fi';
import { examApi, answerKeyApi } from '../services/endpoints';
import { notify, errorMessage, confirmDialog } from '../services/notify';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';

const OPTIONS = ['A', 'B', 'C', 'D'];

export default function AnswerKeys() {
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({}); // { question_no: 'A' }
  const [loadingKey, setLoadingKey] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    examApi
      .list()
      .then((res) => setExams(res.data.data))
      .catch((err) => notify.error(errorMessage(err)));
  }, []);

  useEffect(() => {
    if (!selectedExam) {
      setExam(null);
      setAnswers({});
      return;
    }
    setLoadingKey(true);
    Promise.all([examApi.get(selectedExam), answerKeyApi.list(selectedExam)])
      .then(([examRes, keyRes]) => {
        setExam(examRes.data.data);
        const map = {};
        keyRes.data.data.forEach((k) => {
          map[k.question_no] = k.correct_answer;
        });
        setAnswers(map);
      })
      .catch((err) => notify.error(errorMessage(err)))
      .finally(() => setLoadingKey(false));
  }, [selectedExam]);

  const setAnswer = (qno, opt) => {
    setAnswers((prev) => ({ ...prev, [qno]: prev[qno] === opt ? '' : opt }));
  };

  const filledCount = Object.values(answers).filter(Boolean).length;

  const handleSave = async () => {
    const payload = Object.entries(answers)
      .filter(([, v]) => v)
      .map(([question_no, correct_answer]) => ({ question_no: Number(question_no), correct_answer }));

    if (payload.length === 0) {
      notify.info('Select at least one answer');
      return;
    }
    setSaving(true);
    try {
      await answerKeyApi.save(selectedExam, payload);
      notify.success('Answer key saved');
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    const ok = await confirmDialog({
      title: 'Clear answer key?',
      text: 'All saved answers for this exam will be removed.',
      confirmText: 'Clear',
    });
    if (!ok) return;
    try {
      await answerKeyApi.clear(selectedExam);
      setAnswers({});
      notify.success('Answer key cleared');
    } catch (err) {
      notify.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader title="Answer Key Management" breadcrumbs={['Home', 'Answer Keys']} />

      <div className="content-card p-3 mb-3">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-6">
            <label className="form-label small fw-semibold">Select Exam</label>
            <select
              className="form-select"
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
            >
              <option value="">-- Choose an exam --</option>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} ({e.subject}) — {e.total_questions} Q
                </option>
              ))}
            </select>
          </div>
          {exam && (
            <div className="col-12 col-md-6 d-flex gap-2 justify-content-md-end">
              <span className="badge bg-light text-dark align-self-center">
                {filledCount}/{exam.total_questions} answered
              </span>
              <button className="btn btn-outline-danger" onClick={handleClear}>
                <FiTrash2 className="me-1" /> Clear
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                <FiSave className="me-1" /> {saving ? 'Saving...' : 'Save Key'}
              </button>
            </div>
          )}
        </div>
      </div>

      {loadingKey ? (
        <Spinner label="Loading answer key..." />
      ) : !exam ? (
        <EmptyState message="Select an exam to build its answer key" />
      ) : (
        <div className="content-card p-3">
          <div className="row g-2">
            {Array.from({ length: exam.total_questions }).map((_, i) => {
              const qno = i + 1;
              return (
                <div className="col-12 col-sm-6 col-lg-4 col-xl-3" key={qno}>
                  <div className="d-flex align-items-center border rounded-3 p-2">
                    <span
                      className="fw-semibold text-muted me-2 text-end"
                      style={{ width: 36 }}
                    >
                      Q{qno}
                    </span>
                    <div className="d-flex flex-wrap">
                      {OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className={`answer-option-btn ${
                            answers[qno] === opt ? 'selected' : ''
                          }`}
                          onClick={() => setAnswer(qno, opt)}
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
        </div>
      )}
    </>
  );
}
