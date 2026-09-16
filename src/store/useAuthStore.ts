import { create } from 'zustand'
import api, { getStoredToken, setStoredToken, clearStoredTokens } from '../services/api'
import toast from 'react-hot-toast'
import { AxiosError } from 'axios'

interface University {
    id?: number;
    name_th?: string;
    name_en?: string;
    province?: string;
}

interface StudentProfile {
    bio?: string;
    portfolio?: string;
    skills?: string;
    faculty?: string;
    major?: string;
    student_code?: string;
    university_id?: number;
    university?: University;
}

interface CardVerification {
    id?: number;
    document?: string;
    selfie_url?: string;
    status?: string;
    verified_at?: string;
}

interface BankAccount {
    id?: number;
    bank_name?: string;
    account_name?: string;
    account_number?: string;
    is_default?: boolean;
}

interface DecodedUser extends Record<string, unknown> {
    role?: string;
    email?: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    address?: string;
    picture?: string;
    google_sub?: string;
    has_password?: boolean;
    student_profile?: StudentProfile;
    bank_accounts?: BankAccount[];
    student_card_verification?: CardVerification;
    id_card_verification?: CardVerification;
    notification_preferences?: Record<string, boolean>;
}

interface RegisterData {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    password: string;
    role: string;
    accept_terms: boolean;
}

interface LoginData {
    email: string;
    password: string;
}

interface AuthStore {
    authUser: DecodedUser | null;
    checkAuth: () => Promise<void>;
    isCheckingAuth: boolean;
    isRegistering: boolean;
    isLoggingIn: boolean;
    isSelectingRole: boolean;
    register: (data: RegisterData) => Promise<boolean>;
    login: (data: LoginData) => Promise<void>;
    loginWithGoogleToken: (accessToken?: string) => Promise<void>;
    logout: () => Promise<void>;
    selectRole: (role: 'pioneer' | 'booster') => Promise<boolean>;
    isSendingReset: boolean;
    isResetting: boolean;
    verifyEmail: (token: string) => Promise<boolean>;
    forgotPassword: (email: string) => Promise<boolean>;
    resetPassword: (token: string, new_password: string) => Promise<boolean>;
    isUploadingAvatar: boolean;
    isSavingProfile: boolean;
    isSavingPassword: boolean;
    uploadAvatar: (file: File) => Promise<boolean>;
    updateProfile: (data: Record<string, unknown>) => Promise<boolean>;
    addPassword: (newPassword: string) => Promise<boolean>;
    changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
}

const profileErrorMessage = (error: unknown) => {
    if (!(error instanceof AxiosError)) return 'บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่'

    const message = String(error.response?.data?.message ?? error.response?.data?.error ?? '')
    if (message.includes("ProfileInput.Phone") || message.includes("'thaiphone'")) {
        return 'เบอร์โทรไม่ถูกต้อง กรุณากรอกเบอร์มือถือไทย 10 หลัก เช่น 0812345678'
    }
    if (message.includes("ProfileInput.Address")) {
        return 'กรุณากรอกที่อยู่'
    }
    if (message.includes("ProfileInput.FirstName") || message.includes("ProfileInput.LastName")) {
        return 'กรุณากรอกชื่อและนามสกุล'
    }
    return message || 'บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่'
}

// เมื่อ refresh token หมดอายุ api.ts จะ dispatch event นี้
if (typeof window !== 'undefined') {
    window.addEventListener('auth:logout', () => {
        useAuthStore.getState().logout()
    })
}

export const useAuthStore = create<AuthStore>((set, get) => ({
    authUser: null,
    isCheckingAuth: true,
    isRegistering: false,
    isLoggingIn: false,
    isSelectingRole: false,
    isSendingReset: false,
    isResetting: false,
    isUploadingAvatar: false,
    isSavingProfile: false,
    isSavingPassword: false,
    checkAuth: async () => {
        // ยังไม่เคย login (ไม่มี token เก็บไว้เลย) ไม่ต้องยิง /user/me
        // เพราะ backend จะตอบ 401 "authorization token missing" ทุกครั้งอยู่แล้ว
        if (!getStoredToken()) {
            set({ authUser: null, isCheckingAuth: false })
            return
        }
        try {
            const response = await api.get('/user/me')
            set({ authUser: response?.data?.data })
        } catch {
            set({ authUser: null })
        } finally {
            set({ isCheckingAuth: false })
        }
    },
    register: async (data) => {
        set({ isRegistering: true })
        try {
            await api.post('/signup', data)
            console.log(data)
            toast.success('สร้างบัญชีสำเร็จ กรุณายืนยันอีเมล์ก่อนเข้าสู่ระบบ')
            return true
        } catch (error: unknown) {
            const err = error instanceof AxiosError ? error : null;
            const data = err?.response?.data;
            const message = data?.message;
            if (message === 'this email is already registered' || data === 'this email is already registered') {
                toast.error('อีเมลนี้ถูกลงทะเบียนแล้ว')
            } else if (message === `sorry!, the domain doesn't exist` || message === 'domain not found' || (typeof message === 'string' && message.toLowerCase().includes('domain'))) {
                toast.error('ไม่พบอีเมลมหาวิทยาลัยนี้ในระบบ กรุณาตรวจสอบอีเมลอีกครั้ง')
            } else {
                toast.error(data?.error || 'เกิดข้อผิดพลาดบางอย่าง');
            }
            return false
        } finally {
            set({ isRegistering: false })
        }
    },
    loginWithGoogleToken: async (accessToken?: string) => {
        set({ isCheckingAuth: true })
        if (accessToken) setStoredToken(accessToken);
        try {
            const res = await api.get('/user/me')
            set({ authUser: res.data?.data })
        } catch {
            set({ authUser: null })
        } finally {
            set({ isCheckingAuth: false })
        }
    },
    login: async (data) => {
        set({ isLoggingIn: true })
        try {
            const signinRes = await api.post('/signin', data)
            const token: string | undefined = signinRes.data?.token
            if (token) setStoredToken(token)
            const meRes = await api.get('/user/me')
            set({ authUser: meRes.data.data })
        } catch (error: unknown) {
            const err = error instanceof AxiosError ? error : null;
            const errorMessage = err?.response?.data?.error;
            const apiMessage = err?.response?.data?.message;

            if (!err || err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED') {
                toast.error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่')
            } else if (apiMessage === 'your account has been suspended') {
                toast.error('บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ')
            } else if (errorMessage === 'please verify email') {
                toast.error('กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ')
            } else if (err?.response?.data?.login_method === 'google') {
                toast.error('บัญชีผู้ใช้นี้ลงทะเบียนด้วย Google กรุณาเข้าสู่ระบบด้วย Google')
            } else {
                toast.error('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
            }
        } finally {
            set({ isLoggingIn: false })
        }
    },
    logout: async () => {
        try {
            await api.post('/user/signout')
        } catch {
            // ignore
        } finally {
            clearStoredTokens()
            set({ authUser: null })
        }
    },
    selectRole: async (role) => {
        set({ isSelectingRole: true })
        try {
            await api.patch('/user/role', { role })
            // cookie with new role-embedded token set by backend
            const meRes = await api.get('/user/me')
            set({ authUser: meRes.data.data })
            return true
        } catch (error: unknown) {
            const err = error instanceof AxiosError ? error : null;
            const msg = err?.response?.data?.error || err?.response?.data?.message
            if (msg?.includes('domain') || msg?.includes('university')) {
                toast.error('อีเมลนี้ไม่ใช่อีเมลมหาวิทยาลัยที่รองรับ')
            } else {
                toast.error(msg || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
            }
            return false
        } finally {
            set({ isSelectingRole: false })
        }
    },
    verifyEmail: async (token) => {
        try {
            await api.get(`/verify-email?token=${token}`)
            return true
        } catch {
            return false
        }
    },
    forgotPassword: async (email) => {
        set({ isSendingReset: true })
        try {
            await api.post('/forgot-password', { email })
            toast.success('ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว')
            return true
        } catch (error: unknown) {
            const err = error instanceof AxiosError ? error : null;
            toast.error(err?.response?.data?.error || 'เกิดข้อผิดพลาดในการส่งอีเมล')
            return false
        } finally {
            set({ isSendingReset: false })
        }
    },
    resetPassword: async (token, new_password) => {
        set({ isResetting: true })
        try {
            await api.post(`/reset-password?reset_token=${token}`, { new_password })
            toast.success('เปลี่ยนรหัสผ่านสำเร็จ สามารถเข้าสู่ระบบได้เลย')
            return true
        } catch (error: unknown) {
            const err = error instanceof AxiosError ? error : null;
            toast.error(err?.response?.data?.error || 'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง หรือหมดอายุแล้ว')
            return false
        } finally {
            set({ isResetting: false })
        }
    },
    uploadAvatar: async (file) => {
        set({ isUploadingAvatar: true })
        try {
            const formData = new FormData()
            formData.append('file', file)
            const uploadRes = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            const pictureUrl: string = uploadRes.data.data.url
            await api.patch('/user/profile', { picture: pictureUrl })
            await get().checkAuth()
            toast.success('เปลี่ยนรูปโปรไฟล์สำเร็จ')
            return true
        } catch {
            toast.error('อัปโหลดรูปไม่สำเร็จ')
            return false
        } finally {
            set({ isUploadingAvatar: false })
        }
    },
    updateProfile: async (data) => {
        set({ isSavingProfile: true })
        try {
            await api.patch('/user/profile', data)
            await get().checkAuth()
            toast.success('แก้ไขข้อมูลสำเร็จ')
            return true
        } catch (error) {
            toast.error(profileErrorMessage(error))
            return false
        } finally {
            set({ isSavingProfile: false })
        }
    },
    addPassword: async (newPassword) => {
        set({ isSavingPassword: true })
        try {
            await api.put('/user/add-password', { new_password: newPassword })
            await get().checkAuth()
            toast.success('ตั้งรหัสผ่านสำเร็จ')
            return true
        } catch {
            toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
            return false
        } finally {
            set({ isSavingPassword: false })
        }
    },
    changePassword: async (oldPassword, newPassword) => {
        set({ isSavingPassword: true })
        try {
            await api.put('/user/change-password', {
                old_password: oldPassword,
                new_password: newPassword,
            })
            toast.success('เปลี่ยนรหัสผ่านสำเร็จ')
            return true
        } catch (error: unknown) {
            const err = error instanceof AxiosError ? error : null;
            const msg = err?.response?.data?.message
            if (msg === "can't not use old password as new password") {
                toast.error('ไม่สามารถใช้รหัสผ่านเดิมได้')
            } else if (msg === 'password is incorrect') {
                toast.error('รหัสผ่านปัจจุบันไม่ถูกต้อง')
            } else {
                toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
            }
            return false
        } finally {
            set({ isSavingPassword: false })
        }
    },
}))
