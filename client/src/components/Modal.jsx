import { FiX } from 'react-icons/fi';

// Controlled Bootstrap-styled modal (no JS dependency on bootstrap's modal class).
export default function Modal({ show, title, onClose, children, footer, size = '' }) {
  if (!show) return null;

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        onMouseDown={(e) => {
          if (e.target.classList.contains('modal')) onClose();
        }}
      >
        <div className={`modal-dialog modal-dialog-centered ${size}`} role="document">
          <div className="modal-content border-0 shadow">
            <div className="modal-header">
              <h5 className="modal-title fw-bold">{title}</h5>
              <button type="button" className="btn btn-sm btn-light" onClick={onClose}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}
