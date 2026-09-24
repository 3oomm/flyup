import SweetAlert from 'sweetalert2'

// Shared dialog preset for consistent confirmations across every role.
const Swal = SweetAlert.mixin({
  confirmButtonColor: '#7c3aed',
  cancelButtonColor: '#6b7280',
  reverseButtons: true,
  buttonsStyling: true,
  customClass: {
    popup: 'rounded-2xl',
    title: 'text-foreground',
    confirmButton: 'cursor-pointer rounded-lg font-medium',
    cancelButton: 'cursor-pointer rounded-lg font-medium',
    denyButton: 'cursor-pointer rounded-lg font-medium',
  },
})

export default Swal
