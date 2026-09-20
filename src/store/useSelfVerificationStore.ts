import { create } from 'zustand'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useAuthStore } from './useAuthStore'

export interface BankAccountForm {
    bank_name: string
    account_name: string
    account_number: string
}

interface IdVerifyPayload {
    id_card_url: string
    selfie_url: string
    declare_truth: boolean
}

interface StudentVerifyPayload {
    student_card_url: string
    declare_truth: boolean
    accept_pioneer_terms: boolean
}

interface SelfVerificationStore {
    uploadVerificationDocument: (file: File) => Promise<string | null>
    submitIdVerify: (payload: IdVerifyPayload, kycToken?: string) => Promise<'approved' | 'pending' | null>
    submitStudentVerify: (payload: StudentVerifyPayload, kycToken?: string) => Promise<boolean>
    addBankAccount: (form: BankAccountForm) => Promise<boolean>
    updateBankAccount: (id: number, form: BankAccountForm) => Promise<boolean>
    setDefaultBankAccount: (id: number) => Promise<boolean>
}

const bankErrorMessage = (err: unknown) => {
    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
    return msg === 'account number already exists' ? 'เลขบัญชีนี้มีในระบบแล้ว' : 'กรุณากรอกเลขบัญชีให้ครบถ้วน'
}

const verificationErrorMessage = (err: unknown) => {
    const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
    const messages: Record<string, string> = {
        'invalid or expired kyc session': 'ลิงก์ยืนยันตัวตนไม่ถูกต้องหรือหมดอายุ กรุณาสร้าง QR Code ใหม่',
        'verification service unavailable, please try again later': 'ระบบตรวจสอบใบหน้าไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง',
        'verification is already pending': 'ข้อมูลยืนยันตัวตนถูกส่งแล้วและกำลังรอตรวจสอบ',
        'already verified': 'บัญชีนี้ยืนยันตัวตนแล้ว',
        'invalid ID card URL': 'ระบบไม่สามารถอ่านรูปบัตรประชาชนที่อัปโหลดได้',
    }
    return message ? (messages[message] ?? message) : 'ส่งข้อมูลยืนยันตัวตนไม่สำเร็จ กรุณาลองใหม่'
}

export const useSelfVerificationStore = create<SelfVerificationStore>(() => ({
    uploadVerificationDocument: async (file) => {
        try {
            const fd = new FormData()
            fd.append('file', file)
            const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
            return res.data.data.url as string
        } catch {
            toast.error('อัปโหลดไฟล์ไม่สำเร็จ')
            return null
        }
    },

    submitIdVerify: async (payload, kycToken) => {
        try {
            const res = await api.post('/user/id-verify', payload, {
                params: kycToken ? { token: kycToken } : undefined,
            })
            if (!kycToken) await useAuthStore.getState().checkAuth()
            return res.data?.data?.status === 'approved' ? 'approved' : 'pending'
        } catch (err) {
            const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            // คำขอรอบก่อนอาจบันทึกสำเร็จแล้ว แต่ response ขั้นท้ายล้มเหลว
            // ให้หน้า mobile จบ flow ได้แทนการบังคับส่งรูปซ้ำ
            if (message === 'verification is already pending') return 'pending'
            if (message === 'already verified') return 'approved'
            toast.error(verificationErrorMessage(err))
            return null
        }
    },

    submitStudentVerify: async (payload, kycToken) => {
        try {
            await api.post('/user/student-verify', payload, {
                params: kycToken ? { token: kycToken } : undefined,
            })
            if (!kycToken) await useAuthStore.getState().checkAuth()
            return true
        } catch (err) {
            toast.error(verificationErrorMessage(err))
            return false
        }
    },

    addBankAccount: async (form) => {
        try {
            await api.post('/user/add-bank', form)
            await useAuthStore.getState().checkAuth()
            toast.success('เพิ่มบัญชีสำเร็จ')
            return true
        } catch (err) {

            toast.error(bankErrorMessage(err))
            return false
        }
    },

    updateBankAccount: async (id, form) => {
        try {
            await api.patch(`/user/update-bank/${id}`, form)
            await useAuthStore.getState().checkAuth()
            toast.success('แก้ไขบัญชีสำเร็จ')
            return true
        } catch (err) {
            toast.error(bankErrorMessage(err))
            return false
        }
    },

    setDefaultBankAccount: async (id) => {
        try {
            await api.patch(`/user/set-default-bank/${id}`)
            await useAuthStore.getState().checkAuth()
            toast.success('ตั้งบัญชีหลักสำเร็จ')
            return true
        } catch {
            toast.error('เกิดข้อผิดพลาด')
            return false
        }
    },
}))
