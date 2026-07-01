import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';
import { studentApi } from '../services/endpoints';
import { notify, errorMessage, confirmDialog } from '../services/notify';
import PageHeader from '../components/PageHeader';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';
import Modal from '../components/Modal';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const load = async () => {
    setLoading(true);
    try {
      const res = await studentApi.list(search);
      setStudents(res.data.data);
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

  const { page, setPage, totalPages, pageItems } = usePagination(students, 8);

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', email: '', mobile: '', enrollment_no: '', course: '', batch: '' });
    setShowModal(true);
  };

  const openEdit = (student) => {
    setEditing(student);
    reset(student);
    setShowModal(true);
  };

  const onSubmit = async (data) => {
    try {
      if (editing) {
        await studentApi.update(editing.id, data);
        notify.success('Student updated');
      } else {
        await studentApi.create(data);
        notify.success('Student created');
      }
      setShowModal(false);
      load();
    } catch (err) {
      notify.error(errorMessage(err));
    }
  };

  const handleDelete = async (student) => {
    const ok = await confirmDialog({
      title: 'Delete student?',
      text: `"${student.name}" and related results will be removed.`,
    });
    if (!ok) return;
    try {
      await studentApi.remove(student.id);
      notify.success('Student deleted');
      load();
    } catch (err) {
      notify.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader
        title="Manage Students"
        breadcrumbs={['Home', 'Students']}
        actions={
          <button className="btn btn-primary" onClick={openCreate}>
            <FiPlus className="me-1" /> New Student
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
              placeholder="Search name, email, enrollment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Enrollment</th>
                <th>Course</th>
                <th>Batch</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            {loading ? (
              <TableSkeleton rows={6} cols={7} />
            ) : (
              <tbody>
                {pageItems.map((s) => (
                  <tr key={s.id}>
                    <td className="fw-semibold">{s.name}</td>
                    <td>{s.email}</td>
                    <td>{s.mobile || '-'}</td>
                    <td>{s.enrollment_no}</td>
                    <td>{s.course || '-'}</td>
                    <td>{s.batch || '-'}</td>
                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-outline-primary me-1"
                        onClick={() => openEdit(s)}
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(s)}
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
          {!loading && students.length === 0 && <EmptyState message="No students found" />}
        </div>

        {!loading && students.length > 0 && (
          <div className="p-3 border-top">
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        )}
      </div>

      <Modal
        show={showModal}
        title={editing ? 'Edit Student' : 'Add Student'}
        onClose={() => setShowModal(false)}
        footer={
          <>
            <button className="btn btn-light" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" form="student-form" type="submit">
              {editing ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <form id="student-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label small fw-semibold">Full Name</label>
              <input
                className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                {...register('name', { required: true })}
              />
            </div>
            <div className="col-6">
              <label className="form-label small fw-semibold">Email</label>
              <input
                type="email"
                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                {...register('email', { required: true })}
              />
            </div>
            <div className="col-6">
              <label className="form-label small fw-semibold">Mobile</label>
              <input className="form-control" {...register('mobile')} />
            </div>
            <div className="col-6">
              <label className="form-label small fw-semibold">Enrollment No</label>
              <input
                className={`form-control ${errors.enrollment_no ? 'is-invalid' : ''}`}
                {...register('enrollment_no', { required: true })}
              />
            </div>
            <div className="col-6">
              <label className="form-label small fw-semibold">Course</label>
              <input className="form-control" {...register('course')} />
            </div>
            <div className="col-6">
              <label className="form-label small fw-semibold">Batch</label>
              <input className="form-control" {...register('batch')} />
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}
