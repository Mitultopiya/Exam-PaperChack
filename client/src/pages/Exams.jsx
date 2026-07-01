import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import { examApi } from '../services/endpoints';
import { notify, errorMessage, confirmDialog } from '../services/notify';
import PageHeader from '../components/PageHeader';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';
import Modal from '../components/Modal';

const QUESTION_PRESETS = [20, 50, 100, 200];

export default function Exams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const load = async () => {
    setLoading(true);
    try {
      const res = await examApi.list({ search });
      setExams(res.data.data);
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const { page, setPage, totalPages, pageItems } = usePagination(exams, 8);

  const openCreate = () => {
    setEditing(null);
    reset({
      title: '',
      subject: '',
      total_questions: 20,
      total_marks: 20,
      pass_marks: 8,
      negative_mark: 0,
      status: 'active',
    });
    setShowModal(true);
  };

  const openEdit = (exam) => {
    setEditing(exam);
    reset(exam);
    setShowModal(true);
  };

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      total_questions: Number(data.total_questions),
      total_marks: Number(data.total_marks),
      pass_marks: Number(data.pass_marks),
      negative_mark: Number(data.negative_mark),
    };
    try {
      if (editing) {
        await examApi.update(editing.id, payload);
        notify.success('Exam updated');
      } else {
        await examApi.create(payload);
        notify.success('Exam created');
      }
      setShowModal(false);
      load();
    } catch (err) {
      notify.error(errorMessage(err));
    }
  };

  const toggleStatus = async (exam) => {
    try {
      await examApi.toggleStatus(exam.id);
      load();
    } catch (err) {
      notify.error(errorMessage(err));
    }
  };

  const handleDelete = async (exam) => {
    const ok = await confirmDialog({
      title: 'Delete exam?',
      text: `"${exam.title}" and its answer key & results will be removed.`,
    });
    if (!ok) return;
    try {
      await examApi.remove(exam.id);
      notify.success('Exam deleted');
      load();
    } catch (err) {
      notify.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader
        title="Manage Exams"
        breadcrumbs={['Home', 'Exams']}
        actions={
          <button className="btn btn-primary" onClick={openCreate}>
            <FiPlus className="me-1" /> New Exam
          </button>
        }
      />

      <div className="content-card">
        <div className="p-3 border-bottom">
          <div className="input-group" style={{ maxWidth: 320 }}>
            <span className="input-group-text bg-light">
              <FiSearch />
            </span>
            <input
              className="form-control"
              placeholder="Search by title or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Title</th>
                <th>Subject</th>
                <th>Questions</th>
                <th>Marks</th>
                <th>Pass</th>
                <th>Negative</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            {loading ? (
              <TableSkeleton rows={6} cols={8} />
            ) : (
              <tbody>
                {pageItems.map((exam) => (
                  <tr key={exam.id}>
                    <td className="fw-semibold">{exam.title}</td>
                    <td>{exam.subject}</td>
                    <td>{exam.total_questions}</td>
                    <td>{exam.total_marks}</td>
                    <td>{exam.pass_marks}</td>
                    <td>{exam.negative_mark}</td>
                    <td>
                      <button
                        className={`btn btn-sm ${
                          exam.status === 'active' ? 'btn-success' : 'btn-outline-secondary'
                        }`}
                        onClick={() => toggleStatus(exam)}
                        title="Toggle status"
                      >
                        {exam.status === 'active' ? <FiToggleRight /> : <FiToggleLeft />}{' '}
                        {exam.status}
                      </button>
                    </td>
                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-outline-primary me-1"
                        onClick={() => openEdit(exam)}
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(exam)}
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
          {!loading && exams.length === 0 && <EmptyState message="No exams found" />}
        </div>

        {!loading && exams.length > 0 && (
          <div className="p-3 border-top">
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        )}
      </div>

      <Modal
        show={showModal}
        title={editing ? 'Edit Exam' : 'Create Exam'}
        onClose={() => setShowModal(false)}
        footer={
          <>
            <button className="btn btn-light" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" form="exam-form" type="submit">
              {editing ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <form id="exam-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label small fw-semibold">Exam Title</label>
              <input
                className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                {...register('title', { required: true })}
              />
            </div>
            <div className="col-12">
              <label className="form-label small fw-semibold">Subject</label>
              <input
                className={`form-control ${errors.subject ? 'is-invalid' : ''}`}
                {...register('subject', { required: true })}
              />
            </div>
            <div className="col-6">
              <label className="form-label small fw-semibold">Total Questions</label>
              <select className="form-select" {...register('total_questions')}>
                {QUESTION_PRESETS.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-6">
              <label className="form-label small fw-semibold">Total Marks</label>
              <input
                type="number"
                className={`form-control ${errors.total_marks ? 'is-invalid' : ''}`}
                {...register('total_marks', { required: true, min: 1 })}
              />
            </div>
            <div className="col-6">
              <label className="form-label small fw-semibold">Passing Marks</label>
              <input
                type="number"
                className={`form-control ${errors.pass_marks ? 'is-invalid' : ''}`}
                {...register('pass_marks', { required: true, min: 0 })}
              />
            </div>
            <div className="col-6">
              <label className="form-label small fw-semibold">Negative Marking</label>
              <input
                type="number"
                step="0.25"
                className="form-control"
                {...register('negative_mark', { min: 0 })}
              />
            </div>
            <div className="col-12">
              <label className="form-label small fw-semibold">Status</label>
              <select className="form-select" {...register('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}
