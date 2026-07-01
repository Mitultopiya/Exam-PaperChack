import { FiChevronRight } from 'react-icons/fi';

// Page title + breadcrumb + optional action slot.
export default function PageHeader({ title, breadcrumbs = [], actions }) {
  return (
    <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
      <div>
        <h4 className="page-title mb-1">{title}</h4>
        <div className="breadcrumb-bar d-flex align-items-center flex-wrap">
          {breadcrumbs.map((b, i) => (
            <span key={i} className="d-flex align-items-center">
              {i > 0 && <FiChevronRight className="mx-1" size={12} />}
              <span className={i === breadcrumbs.length - 1 ? 'text-primary' : ''}>{b}</span>
            </span>
          ))}
        </div>
      </div>
      {actions && <div className="d-flex gap-2">{actions}</div>}
    </div>
  );
}
