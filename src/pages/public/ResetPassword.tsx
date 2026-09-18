import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { Loader2, CheckCircle, Circle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useAuthStore } from "../../store/useAuthStore"
import { isValidPasswordLength, unicodeLength, utf8ByteLength } from "../../lib/validation"

const ResetPassword = () => {
    const { resetPassword, isResetting } = useAuthStore()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    
    // reset_token from URL ?reset_token=...
    const reset_token = searchParams.get('reset_token')
    
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [hasError, setHasError] = useState(false)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        
        if (!reset_token) {
            toast.error('ลิงก์ไม่ถูกต้อง ไม่พบ reset_token')
            return
        }

        const isPasswordValid = /[A-Z]/.test(password) && 
                                /[a-z]/.test(password) && 
                                /[0-9]/.test(password) && 
                                /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/.test(password) && 
                                isValidPasswordLength(password);

        if (!password || !isPasswordValid) {
            setHasError(true)
            toast.error('กรุณาตั้งรหัสผ่านให้ตรงตามเงื่อนไข')
            return
        }
        
        if (password !== confirmPassword) {
            toast.error('รหัสผ่านไม่ตรงกัน')
            return
        }

        const success = await resetPassword(reset_token, password)
        if (success) {
            navigate('/login')
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setPassword(value);
        if (hasError) setHasError(false);
    }

    const inputStyle = `w-full border focus:outline-none bg-background text-foreground rounded-[6px] border-border outline-none p-[12px] h-[38px] focus:border-primary`
    const errorInputStyle = `w-full border focus:outline-none bg-background text-foreground rounded-[6px] outline-none p-[12px] h-[38px] border-error focus:border-error`

    return (
        <div className="w-full mx-auto max-w-[510px] border border-border rounded-[12px] bg-card mt-[100px]">
            <div className="flex flex-col gap-[16px] p-[24px]">
                <div className="flex flex-col items-center justify-center">
                    <img src="/flyup-logo.png" alt="flyup-logo.png" className="h-[70px] w-[106px]" />
                    <h1 className="text-[24px] font-semibold text-foreground">ตั้งรหัสผ่านใหม่</h1>
                    <p className="text-[14px] text-muted-foreground font-medium text-center">กรุณาตั้งรหัสผ่านใหม่ของคุณ</p>
                </div>
                {!reset_token ? (
                    <div className="bg-error/10 text-error p-4 rounded-lg flex flex-col items-center justify-center text-center mt-4">
                       <p className="text-[14px] font-medium">ไม่พบ Token สำหรับการรีเซ็ตรหัสผ่าน</p>
                       <p className="text-[12px] mt-1">กรุณากดลิงก์จากอีเมลของคุณอีกครั้ง</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-[16px] mt-[8px]">
                        <div className="flex flex-col gap-[4px] w-full">
                            <label className="text-[14px] text-foreground">รหัสผ่านใหม่ <span className="text-error">*</span></label>
                            <input name="password" onChange={handleChange} value={password} type="password" className={hasError ? errorInputStyle : inputStyle} />
                            
                            {(password.length > 0 || hasError) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-[10px] gap-y-[6px] mt-[4px] bg-muted/30 p-[12px] rounded-[8px] border border-border/50">
                                    {[
                                        { id: 1, text: "ตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว", valid: /[A-Z]/.test(password) },
                                        { id: 2, text: "พิมพ์เล็ก 1 ตัว", valid: /[a-z]/.test(password) },
                                        { id: 3, text: "ตัวเลข 1 ตัว", valid: /[0-9]/.test(password) },
                                        { id: 4, text: "อักษรพิเศษ 1 ตัว", valid: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/.test(password) },
                                        { id: 5, text: "8 ตัวอักษรขึ้นไป", valid: unicodeLength(password) >= 8 },
                                        { id: 6, text: "ไม่เกิน 72 ไบต์ UTF-8", valid: utf8ByteLength(password) <= 72 }
                                    ].map(item => (
                                        <div key={item.id} className="flex items-center gap-[6px]">
                                            {item.valid ? (
                                                <CheckCircle size={14} className="text-green-500 shrink-0" />
                                            ) : (
                                                <Circle size={14} className={hasError ? "text-error shrink-0" : "text-muted-foreground shrink-0"} />
                                            )}
                                            <span className={`text-[12px] leading-tight ${item.valid ? 'text-green-500' : (hasError ? 'text-error' : 'text-muted-foreground')}`}>
                                                {item.text}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col gap-[4px] w-full">
                            <label className="text-[14px] text-foreground">ยืนยันรหัสผ่านใหม่ <span className="text-error">*</span></label>
                            <input name="confirmPassword" onChange={(e) => setConfirmPassword(e.target.value)} value={confirmPassword} type="password" className={inputStyle} />
                        </div>
                        <button disabled={isResetting} type="submit" className="bg-primary text-white text-[14px] w-full flex items-center justify-center h-[40px] rounded-[8px] cursor-pointer hover:bg-primary-hover transition-all duration-300 mt-2">
                            {isResetting ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    <span>กำลังดำเนินการ...</span>
                                </>
                            ) : <span>บันทึกรหัสผ่านใหม่</span>}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}

export default ResetPassword
