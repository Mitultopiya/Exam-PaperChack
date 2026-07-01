import Swal from 'sweetalert2';

// Toast notifications (top-right, auto-dismiss).
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2800,
  timerProgressBar: true,
});

export const notify = {
  success: (title) => Toast.fire({ icon: 'success', title }),
  error: (title) => Toast.fire({ icon: 'error', title }),
  info: (title) => Toast.fire({ icon: 'info', title }),
};

// Confirmation dialog returning a boolean.
export async function confirmDialog({
  title = 'Are you sure?',
  text = 'This action cannot be undone.',
  confirmText = 'Yes, delete it',
} = {}) {
  const res = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
    confirmButtonText: confirmText,
  });
  return res.isConfirmed;
}

// Pulls a human-readable message out of an axios error.
export function errorMessage(err, fallback = 'Something went wrong') {
  return err?.response?.data?.message || err?.message || fallback;
}
