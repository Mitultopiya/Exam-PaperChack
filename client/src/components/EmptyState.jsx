import { FiInbox } from 'react-icons/fi';

// Friendly empty placeholder for tables/lists.
export default function EmptyState({ message = 'No records found', icon }) {
  return (
    <div className="text-center text-muted py-5">
      <div className="mb-2" style={{ fontSize: '2.4rem', opacity: 0.5 }}>
        {icon || <FiInbox />}
      </div>
      <div>{message}</div>
    </div>
  );
}
