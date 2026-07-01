import { useEffect, useState } from 'react';
import {
  FiFileText,
  FiUsers,
  FiKey,
  FiCheckCircle,
  FiClock,
} from 'react-icons/fi';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { dashboardApi } from '../services/endpoints';
import { errorMessage, notify } from '../services/notify';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend
);

const StatCard = ({ icon, value, label, color, bg }) => (
  <div className="stat-card d-flex align-items-center gap-3">
    <div className="stat-icon" style={{ background: bg, color }}>
      {icon}
    </div>
    <div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  </div>
);

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .get()
      .then((res) => setData(res.data.data))
      .catch((err) => notify.error(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Loading dashboard..." />;
  if (!data) return <EmptyState message="Could not load dashboard data" />;

  const { cards, passFail, passPercentage, dailyEvaluations, examStats, recentActivity } = data;

  const lineData = {
    labels: dailyEvaluations.map((d) => d.day?.slice(5) || d.day),
    datasets: [
      {
        label: 'Evaluations',
        data: dailyEvaluations.map((d) => d.total),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.15)',
        fill: true,
        tension: 0.35,
      },
    ],
  };

  const barData = {
    labels: examStats.map((e) => e.exam_title),
    datasets: [
      {
        label: 'Evaluations',
        data: examStats.map((e) => e.evaluations),
        backgroundColor: '#2563eb',
        borderRadius: 6,
      },
      {
        label: 'Passed',
        data: examStats.map((e) => e.passed),
        backgroundColor: '#22c55e',
        borderRadius: 6,
      },
    ],
  };

  const doughnutData = {
    labels: ['Pass', 'Fail'],
    datasets: [
      {
        data: [passFail.pass, passFail.fail],
        backgroundColor: ['#22c55e', '#ef4444'],
        borderWidth: 0,
      },
    ],
  };

  return (
    <>
      <PageHeader title="Dashboard" breadcrumbs={['Home', 'Dashboard']} />

      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl">
          <StatCard
            icon={<FiFileText />}
            value={cards.totalExams}
            label="Total Exams"
            color="#2563eb"
            bg="#dbeafe"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl">
          <StatCard
            icon={<FiUsers />}
            value={cards.totalStudents}
            label="Total Students"
            color="#7c3aed"
            bg="#ede9fe"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl">
          <StatCard
            icon={<FiKey />}
            value={cards.totalAnswerKeys}
            label="Total Answer Keys"
            color="#f59e0b"
            bg="#fef3c7"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl">
          <StatCard
            icon={<FiCheckCircle />}
            value={cards.evaluatedPapers}
            label="Evaluated Papers"
            color="#22c55e"
            bg="#dcfce7"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl">
          <StatCard
            icon={<FiClock />}
            value={cards.pendingEvaluations}
            label="Pending Evaluations"
            color="#ef4444"
            bg="#fee2e2"
          />
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12 col-lg-8">
          <div className="content-card p-3 h-100">
            <h6 className="fw-bold mb-3">Daily Evaluations (last 7 days)</h6>
            {dailyEvaluations.length ? (
              <Line data={lineData} options={{ plugins: { legend: { display: false } } }} />
            ) : (
              <EmptyState message="No evaluations yet" />
            )}
          </div>
        </div>
        <div className="col-12 col-lg-4">
          <div className="content-card p-3 h-100">
            <h6 className="fw-bold mb-3">Pass Percentage</h6>
            <div className="position-relative">
              <Doughnut data={doughnutData} options={{ cutout: '70%' }} />
              <div
                className="position-absolute top-50 start-50 translate-middle text-center"
                style={{ pointerEvents: 'none' }}
              >
                <div className="fw-bold fs-4">{passPercentage}%</div>
                <div className="small text-muted">Pass rate</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-7">
          <div className="content-card p-3 h-100">
            <h6 className="fw-bold mb-3">Exam Statistics</h6>
            {examStats.length ? (
              <Bar
                data={barData}
                options={{
                  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                }}
              />
            ) : (
              <EmptyState message="No exam data" />
            )}
          </div>
        </div>
        <div className="col-12 col-lg-5">
          <div className="content-card p-3 h-100">
            <h6 className="fw-bold mb-3">Recent Activity</h6>
            {recentActivity.length ? (
              <ul className="list-group list-group-flush">
                {recentActivity.map((r) => (
                  <li
                    key={r.id}
                    className="list-group-item d-flex justify-content-between align-items-center px-0"
                  >
                    <div>
                      <div className="fw-semibold small">{r.student_name}</div>
                      <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                        {r.exam_title}
                      </div>
                    </div>
                    <div className="text-end">
                      <span
                        className={`badge ${r.status === 'pass' ? 'bg-success' : 'bg-danger'}`}
                      >
                        {r.percentage}%
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState message="No recent activity" />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
