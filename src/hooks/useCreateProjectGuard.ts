import { useNavigate } from 'react-router'
import Swal from 'sweetalert2'
import { useAuthStore } from '../store/useAuthStore'
import { useProjectStore } from '../store/useProjectStore'

const useCreateProjectGuard = () => {
    const navigate = useNavigate()
    const { authUser } = useAuthStore()
    const { createProject, isCreating } = useProjectStore()

    // เช็คเงื่อนไขก่อนอนุญาตให้สร้างโปรเจกต์: ต้องยืนยันตัวตนนักศึกษา (บัตรนักศึกษา + บัตรประชาชน) และผูกบัญชีธนาคารแล้ว
    const createWithGuard = async () => {
        if (!authUser) {
            navigate('/login')
            return null
        }

        const studentApproved =
            authUser?.student_card_verification?.status === 'approved' &&
            authUser?.id_card_verification?.status === 'approved'
        const hasBank = (authUser?.bank_accounts?.length ?? 0) > 0

        // ถ้ายังไม่ครบเงื่อนไข แจ้งเตือนด้วย SweetAlert แล้วเสนอทางลัดไปหน้ายืนยันตัวตน
        if (!studentApproved || !hasBank) {
            const missing: string[] = []
            if (!studentApproved) missing.push('ยืนยันตัวตนนักศึกษา')
            if (!hasBank) missing.push('ยืนยันบัญชีธนาคาร')

            const result = await Swal.fire({
                icon: 'warning',
                title: 'ยังไม่พร้อมสร้างโปรเจกต์',
                html: `กรุณาดำเนินการให้ครบก่อน:<br/><b>${missing.join(', ')}</b><br/><span style="font-size:13px;color:#6b7280">ไปที่ตั้งค่าโปรไฟล์ → แท็บยืนยันตัวตน</span>`,
                confirmButtonText: 'ไปยืนยันตัวตน',
                confirmButtonColor: '#16A34A',
                showCancelButton: true,
                cancelButtonText: 'ตกลง',
                cancelButtonColor: '#6B7280',
                reverseButtons: true,
            })
            if (result.isConfirmed) navigate('/pioneer/profile?tab=verify')
            return null
        }

        // เงื่อนไขครบแล้ว: สร้างโปรเจกต์ draft ใหม่ แล้วพาไปหน้า overview เพื่อเริ่มกรอกขั้นตอน Step 1-5
        const id = await createProject()
        if (id) navigate(`/project/overview/${id}`)
        return id
    }

    return { createWithGuard, isCreating }
}

export default useCreateProjectGuard
