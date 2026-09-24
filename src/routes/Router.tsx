import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router'
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';
import { useEffect, lazy, Suspense } from 'react';

function ScrollToTop() {
    const { pathname } = useLocation()
    useEffect(() => { window.scrollTo(0, 0) }, [pathname])
    return null
}

function PageLoader() {
    return (
        <div className="flex items-center justify-center h-screen">
            <Loader2 className="size-10 animate-spin" />
        </div>
    )
}
import GoogleRoleModal from '../components/GoogleRoleModal';

// Layouts (eager — shared shells rendered for every nested route)
import MainLayout from '../layouts/MainLayout';
import PioneerLayout from '../layouts/PioneerLayout';
import ProjectStageLayout from '../layouts/ProjectStageLayout';
import AdminLayout from '../layouts/AdminLayout';
import BoosterLayout from '../layouts/BoosterLayout';

import { Loader2 } from 'lucide-react';

// Public Pages — lazy-loaded so each route only ships the JS it needs
const Home = lazy(() => import('../pages/public/Home'));
const Projects = lazy(() => import('../pages/public/Projects'));
const Register = lazy(() => import('../pages/public/Register'));
const Login = lazy(() => import('../pages/public/Login'));
const VerifyEmail = lazy(() => import('../pages/public/VerifyEmail'));
const ProjectDetail = lazy(() => import('../pages/public/ProjectDetail'));
const Investment = lazy(() => import('../pages/public/Investment'));
const ForgotPassword = lazy(() => import('../pages/public/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/public/ResetPassword'));
const MilestoneDetail = lazy(() => import('../pages/public/MilestoneDetail'));
const AboutUs = lazy(() => import('../pages/public/AboutUs'));
const Terms = lazy(() => import('../pages/public/Terms'));
const HelpCenter = lazy(() => import('../pages/public/HelpCenter'));
const MobileKyc = lazy(() => import('../pages/public/MobileKyc'));

// Pioneer Pages
const ProjectOverview = lazy(() => import('../pages/pioneer/ProjectOverview'));
const ProjectGuide = lazy(() => import('../pages/pioneer/ProjectGuide'));
const Dashboard = lazy(() => import('../pages/pioneer/Dashboard'));
const MyProjects = lazy(() => import('../pages/pioneer/MyProjects'));
const Profile = lazy(() => import('../pages/pioneer/Profile'));
const Step1Basics = lazy(() => import('../components/steps/Step1Basics'));
const Step2Story = lazy(() => import('../components/steps/Step2Story'));
const Step3Milestone = lazy(() => import('../components/steps/Step3Milestone'));
const Step4Agreement = lazy(() => import('../components/steps/Step4Agreement'));
const Step5Updates = lazy(() => import('../components/steps/Step5Updates'));
const Preview = lazy(() => import('../pages/pioneer/Preview'));
const MilestonePage = lazy(() => import('../pages/pioneer/MilestonePage'));
const MilestoneListPage = lazy(() => import('../pages/pioneer/MilestoneListPage'));
const PioneerMeetings = lazy(() => import('../pages/pioneer/Meetings'));
const PioneerPayouts = lazy(() => import('../pages/pioneer/Payouts'));
const PioneerProfitPage = lazy(() => import('../pages/pioneer/PioneerProfitPage'));
const CancelProjectRequest = lazy(() => import('../pages/pioneer/CancelProjectRequest'));
const PreviewMilestoneDetail = lazy(() => import('../pages/pioneer/PreviewMilestoneDetail'));

// Admin Pages
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const ProjectApproval = lazy(() => import('@/pages/admin/ProjectApproval'));
const AdminProjectDetail = lazy(() => import('@/pages/admin/AdminProjectDetail'));
const VerificationApproval = lazy(() => import('@/pages/admin/VerificationApproval'));
const AdminProfile = lazy(() => import('@/pages/admin/AdminProfile'));
const AdminMilestoneApproval = lazy(() => import('@/pages/admin/AdminMilestoneApproval'));
const AdminMilestoneDetail = lazy(() => import('@/pages/admin/AdminMilestoneDetail'));
const AdminProjectMilestonesOverview = lazy(() => import('@/pages/admin/AdminProjectMilestonesOverview'));
const AdminDisbursements = lazy(() => import('@/pages/admin/AdminDisbursements'));
const AdminProjectSuspension = lazy(() => import('@/pages/admin/AdminProjectSuspension'));
const AdminUserManagement = lazy(() => import('@/pages/admin/AdminUserManagement'));
const AdminComplaints = lazy(() => import('@/pages/admin/AdminComplaints'));
const AdminAuditLogs = lazy(() => import('@/pages/admin/AdminAuditLogs'));
const AdminRefunds = lazy(() => import('@/pages/admin/AdminRefunds'));
const AdminProfitDistribution = lazy(() => import('@/pages/admin/AdminProfitDistribution'));
const AdminUniversities = lazy(() => import('@/pages/admin/AdminUniversities'));
const AdminUniversityDetail = lazy(() => import('@/pages/admin/AdminUniversityDetail'));
const AdminCategories = lazy(() => import('@/pages/admin/AdminCategories'));
const AdminCancelRequests = lazy(() => import('@/pages/admin/AdminCancelRequests'));
const AdminProjectEditRequests = lazy(() => import('@/pages/admin/AdminProjectEditRequests'));

// Booster Pages
const BoosterDashboard = lazy(() => import('../pages/booster/Dashboard'));
const BoosterMyInvestments = lazy(() => import('../pages/booster/MyInvestments'));
const BoosterInvestmentDetail = lazy(() => import('../pages/booster/InvestmentDetail'));
const BoosterMeetings = lazy(() => import('../pages/booster/Meetings'));
const BoosterVotes = lazy(() => import('../pages/booster/Votes'));
const BoosterVoteDetail = lazy(() => import('../pages/booster/VoteDetail'));
const BoosterProfits = lazy(() => import('../pages/booster/Profits'));
const BoosterRefunds = lazy(() => import('../pages/booster/Refunds'));
const BoosterComplaints = lazy(() => import('../pages/booster/Complaints'));
const BoosterComplaintDetail = lazy(() => import('../pages/booster/ComplaintDetail'));
const BoosterComplaintNew = lazy(() => import('../pages/booster/ComplaintNew'));
const BoosterProfile = lazy(() => import('../pages/booster/Profile'));

const PioneerGuard = () => {
    const { authUser } = useAuthStore()
    if (!authUser) return <Navigate to='/login' replace />
    if (authUser.role !== 'pioneer') return <Navigate to='/' replace />
    return <Outlet />
}

const BoosterGuard = () => {
    const { authUser } = useAuthStore()
    if (!authUser) return <Navigate to='/login' replace />
    if (authUser.role?.toLowerCase() !== 'booster') return <Navigate to='/' replace />
    return <Outlet />
}

const AdminGuard = () => {
    const { authUser } = useAuthStore()
    if (!authUser) return <Navigate to='/login' replace />
    if (authUser.role?.toLowerCase() !== 'admin') return <Navigate to='/' replace />
    return <Outlet />
}

const Router = () => {
    const { authUser, checkAuth, isCheckingAuth, loginWithGoogleToken, selectRole } = useAuthStore()

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const accessToken = params.get('access_token')
        // backward compat: รองรับ ?token=1 เดิม + ?access_token=<jwt> ใหม่
        const legacyFlag = params.get('token')
        const isVerifyPage = window.location.pathname === '/verify'
        const isKycPage = window.location.pathname === '/mobile-kyc'
        if ((accessToken || legacyFlag) && !isVerifyPage && !isKycPage) {
            // Google OAuth flow: ใช้ loginWithGoogleToken อย่างเดียว
            // ไม่เรียก checkAuth() พร้อมกัน เพื่อป้องกัน race condition
            params.delete('access_token')
            params.delete('token')
            const newSearch = params.toString()
            window.history.replaceState({}, '', newSearch ? `?${newSearch}` : window.location.pathname)
            loginWithGoogleToken(accessToken ?? undefined)
        } else {
            checkAuth()
        }
    }, [checkAuth, loginWithGoogleToken])

    const hasUniversityDomain = !!authUser?.student_profile?.university;

    useEffect(() => {
        // Wait for /user/me to populate student_profile before deciding —
        // JWT alone doesn't contain student_profile.university, so checking
        // hasUniversityDomain too early would incorrectly default to booster.
        if (isCheckingAuth) return;
        if (authUser?.role === 'pending' && !hasUniversityDomain) {
            selectRole('booster');
        }
    }, [authUser?.role, hasUniversityDomain, selectRole, isCheckingAuth])

    const showRoleModal = authUser?.role === 'pending' && hasUniversityDomain;

    if (isCheckingAuth && !authUser) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="size-10 animate-spin" />
            </div>
        );
    }

    return (
        <>
            <BrowserRouter>
                <ScrollToTop />
                <Suspense fallback={<PageLoader />}>
                <Routes>
                    <Route path='/mobile-kyc' element={<MobileKyc />} />
                    <Route element={<MainLayout />}>
                        <Route path='/' element={<Home />} />
                        <Route path='/register' element={!authUser ? <Register /> : <Navigate to='/' />} />
                        <Route path='/login' element={!authUser ? <Login /> : <Navigate to='/' />} />
                        <Route path='/forgot/password' element={!authUser ? <ForgotPassword /> : <Navigate to='/' />} />
                        <Route path='/reset-password' element={!authUser ? <ResetPassword /> : <Navigate to='/' />} />
                        <Route path='/projects' element={<Projects />} />
                        <Route path='/verify' element={<VerifyEmail />} />
                        <Route path='/projects/:slug' element={<ProjectDetail />} />
                        <Route path='/projects/:slug/invest' element={<Investment />} />
                        <Route path='/projects/:slug/milestones' element={<MilestoneDetail />} />
                        <Route path='/about/we' element={<AboutUs />} />
                        <Route path='/legal/terms' element={<Terms />} />
                        <Route path='/help' element={<HelpCenter />} />
                    </Route>

                    <Route element={<PioneerGuard />}>
                        <Route element={<PioneerLayout />}>
                            <Route path='/pioneer/dashboard' element={<Dashboard />} />
                            <Route path='/pioneer/dashboard/projects' element={<MyProjects />} />
                            <Route path='/pioneer/dashboard/milestones' element={<MilestoneListPage />} />
                            <Route path='/pioneer/dashboard/meetings' element={<PioneerMeetings />} />
                            <Route path='/pioneer/dashboard/payouts' element={<PioneerPayouts />} />
                            <Route path='/pioneer/dashboard/profit' element={<PioneerProfitPage />} />
                            <Route path='/pioneer/dashboard/projects/:projectId/cancel-request' element={<CancelProjectRequest />} />
                            <Route path='/pioneer/dashboard/projects/:projectId/milestones' element={<MilestonePage />} />
                            <Route path='/pioneer/profile' element={<Profile />} />
                        </Route>
                        {/* flow สร้างโปรเจกต์: Overview (สรุป/เริ่ม) -> step/1-5 (กรอกข้อมูลทีละขั้น) -> preview (ดูตัวอย่างก่อนส่ง) */}
                        <Route element={<MainLayout />}>
                            <Route path='/preview/:projectId' element={<Preview />} />
                            <Route path='/preview/:projectId/milestones' element={<PreviewMilestoneDetail />} />
                            <Route path='/project/overview/:projectId' element={<ProjectOverview />} />
                            <Route path='/project/guide' element={<ProjectGuide />} />
                            {/* ProjectStageLayout ครอบ Step1-5 ไว้ด้วย Stepper เดียวกัน — index (ไม่ระบุเลข step) จะ redirect ไป step 1 เสมอ */}
                            <Route path='/project/overview/:projectId/step' element={<ProjectStageLayout />}>
                                <Route index element={<Navigate to="1" replace />} />
                                <Route path='1' element={<Step1Basics />} />
                                <Route path='2' element={<Step2Story />} />
                                <Route path='3' element={<Step3Milestone />} />
                                <Route path='4' element={<Step4Agreement />} />
                                <Route path='5' element={<Step5Updates />} />
                            </Route>
                        </Route>
                    </Route>

                    <Route element={<BoosterGuard />}>
                        <Route element={<BoosterLayout />}>
                            <Route path='/booster/dashboard' element={<BoosterDashboard />} />
                            <Route path='/booster/investments' element={<BoosterMyInvestments />} />
                            <Route path='/booster/investments/:id' element={<BoosterInvestmentDetail />} />
                            <Route path='/booster/meetings' element={<BoosterMeetings />} />
                            <Route path='/booster/votes' element={<BoosterVotes />} />
                            <Route path='/booster/votes/:id' element={<BoosterVoteDetail />} />
                            <Route path='/booster/profits' element={<BoosterProfits />} />
                            <Route path='/booster/refunds' element={<BoosterRefunds />} />
                            <Route path='/booster/complaints' element={<BoosterComplaints />} />
                            <Route path='/booster/complaints/new' element={<BoosterComplaintNew />} />
                            <Route path='/booster/complaints/:id' element={<BoosterComplaintDetail />} />
                            <Route path='/booster/profile' element={<BoosterProfile />} />
                        </Route>
                    </Route>

                    <Route element={<AdminGuard />}>
                        <Route element={<AdminLayout />}>
                            <Route path='/admin/dashboard' element={<AdminDashboard />} />
                            <Route path='/admin/projects-approval' element={<ProjectApproval />} />
                            <Route path='/admin/projects/:id' element={<AdminProjectDetail />} />
                            <Route path='/admin/projects/:id/milestones-overview' element={<AdminProjectMilestonesOverview />} />
                            <Route path='/admin/verifications' element={<VerificationApproval />} />
                            <Route path='/admin/milestones' element={<AdminMilestoneApproval />} />
                            <Route path='/admin/milestones/:milestoneId' element={<AdminMilestoneDetail />} />
                            <Route path='/admin/refunds' element={<AdminRefunds />} />
                            <Route path='/admin/disbursements' element={<AdminDisbursements />} />
                            <Route path='/admin/profit-distribution' element={<AdminProfitDistribution />} />
                            <Route path='/admin/projects-suspension' element={<AdminProjectSuspension />} />
                            <Route path='/admin/users' element={<AdminUserManagement />} />
                            <Route path='/admin/complaints' element={<AdminComplaints />} />
                            <Route path='/admin/audit-logs' element={<AdminAuditLogs />} />
                            <Route path='/admin/universities' element={<AdminUniversities />} />
                            <Route path='/admin/universities/:id' element={<AdminUniversityDetail />} />
                            <Route path='/admin/categories' element={<AdminCategories />} />
                            <Route path='/admin/cancel-requests' element={<AdminCancelRequests />} />
                            <Route path='/admin/project-edit-requests' element={<AdminProjectEditRequests />} />
                            <Route path='/admin/profile' element={<AdminProfile />} />
                        </Route>
                    </Route>

                </Routes>
                </Suspense>
                <GoogleRoleModal open={showRoleModal} onClose={() => {}} />
                <Toaster
                    position='top-right'
                    gutter={10}
                    containerStyle={{ top: 20, right: 20, zIndex: 100000 }}
                    toastOptions={{
                        duration: 4000,
                        className: 'app-toast',
                        style: {
                            maxWidth: 420,
                            padding: '12px 16px',
                            border: '1px solid #e5e7eb',
                            borderRadius: 12,
                            background: '#ffffff',
                            color: '#111827',
                            fontSize: 13,
                            fontWeight: 500,
                            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.14)',
                        },
                        success: {
                            duration: 3500,
                            iconTheme: { primary: '#16a34a', secondary: '#ffffff' },
                        },
                        error: {
                            duration: 5000,
                            iconTheme: { primary: '#dc2626', secondary: '#ffffff' },
                        },
                        loading: {
                            duration: Infinity,
                            iconTheme: { primary: '#7c3aed', secondary: '#ffffff' },
                        },
                    }}
                />
            </BrowserRouter>
        </>
    )
}

export default Router
