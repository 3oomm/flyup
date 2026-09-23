import { useState, useEffect, useRef } from 'react';
import { Search, Menu, X, LayoutDashboard, ChevronDown, Settings, LogOut, Files, Flag, Banknote, Wallet, TrendingUp, RotateCcw, MailSearch, Users } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router';
import { useAuthStore } from '../store/useAuthStore';
import { usePublicProjectStore } from '../store/usePublicProjectStore';
import NotificationBell from './NotificationBell';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=400';

// แสดงรูป profile หรือ initials แทน — ไม่ส่ง email ไป third-party
function UserAvatar({ picture, firstName, lastName, className }: {
    picture?: string | null
    firstName?: string | null
    lastName?: string | null
    className?: string
}) {
    const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?'
    if (picture) return <img src={picture} alt="profile" className={className} />
    return (
        <div className={`bg-primary/20 flex items-center justify-center text-primary font-bold text-sm ${className}`}>
            {initials}
        </div>
    )
}

const SEARCH_PLACEHOLDERS = [
    'โปรเจกต์ AI...',
    'Mobile App...',
    'Web Development...',
    'หมวดหมู่ที่ต้องการ...',
    'FinTech, EdTech...',
];

const ROLE_MENU_ITEMS: Record<string, { icon: React.ReactNode; label: string; path: string }[]> = {
    pioneer: [
        { icon: <Files size={18} className="text-brand-violet" />, label: 'โปรเจกต์ของฉัน', path: '/pioneer/dashboard/projects' },
        { icon: <Flag size={18} className="text-brand-violet" />, label: 'Milestone', path: '/pioneer/dashboard/milestones' },
        { icon: <Banknote size={18} className="text-brand-violet" />, label: 'การรับเงิน', path: '/pioneer/dashboard/payouts' },
    ],
    booster: [
        { icon: <Wallet size={18} className="text-brand-violet" />, label: 'การลงทุน', path: '/booster/investments' },
        { icon: <TrendingUp size={18} className="text-brand-violet" />, label: 'กำไร', path: '/booster/profits' },
        { icon: <RotateCcw size={18} className="text-brand-violet" />, label: 'คืนเงิน', path: '/booster/refunds' },
    ],
    admin: [
        { icon: <MailSearch size={18} className="text-brand-violet" />, label: 'ตรวจสอบโปรเจกต์', path: '/admin/projects-approval' },
        { icon: <Users size={18} className="text-brand-violet" />, label: 'จัดการผู้ใช้', path: '/admin/users' },
    ],
};

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showNotif, setShowNotif] = useState(false);

    const [searchFocused, setSearchFocused] = useState(false);
    const [typeText, setTypeText] = useState('');
    const [typeIdx, setTypeIdx] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const fullText = SEARCH_PLACEHOLDERS[typeIdx];
        let timeout: ReturnType<typeof setTimeout>;
        if (!isDeleting && typeText === fullText) {
            timeout = setTimeout(() => setIsDeleting(true), 1600);
        } else if (isDeleting && typeText === '') {
            timeout = setTimeout(() => {
                setIsDeleting(false);
                setTypeIdx(i => (i + 1) % SEARCH_PLACEHOLDERS.length);
            }, 0);
        } else if (isDeleting) {
            timeout = setTimeout(() => setTypeText(t => t.slice(0, -1)), 40);
        } else {
            timeout = setTimeout(() => setTypeText(fullText.slice(0, typeText.length + 1)), 75);
        }
        return () => clearTimeout(timeout);
    }, [typeText, typeIdx, isDeleting]);

    const handleProfileToggle = () => {
        setShowProfileMenu(prev => {
            const next = !prev;
            if (next) setShowNotif(false);
            return next;
        });
    };
    const handleNotifChange = (next: boolean) => {
        setShowNotif(next);
        if (next) setShowProfileMenu(false);
    };
    const { authUser, logout } = useAuthStore();
    const { publicProjects, fetchPublicProjects } = usePublicProjectStore();
    const navigate = useNavigate();
    const location = useLocation();

    const suggestions = publicProjects.filter((p) => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return false;

        const rawCategory = p.category as unknown;
        const categoryName = typeof rawCategory === 'string'
            ? rawCategory
            : (rawCategory as { name?: string } | null)?.name ?? '';

        return p.title.toLowerCase().includes(query) ||
            (p.description ?? '').toLowerCase().includes(query) ||
            categoryName.toLowerCase().includes(query);
    }).slice(0, 5);
    const suggestionRef = useRef<HTMLDivElement>(null);
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    // Hide search bar on /projects page
    const isProjectsPage = location.pathname === '/projects';

    const toggleMenu = () => setIsOpen(!isOpen);
    const closeMenu = () => {
        setIsOpen(false);
        setShowSuggestions(false);
    };

    // Load projects for search if not loaded yet
    useEffect(() => {
        if (publicProjects.length === 0) {
            fetchPublicProjects();
        }
    }, [publicProjects.length, fetchPublicProjects]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (mobileMenuRef.current && mobileMenuRef.current.contains(target)) return;
            if (suggestionRef.current && !suggestionRef.current.contains(target)) {
                setShowSuggestions(false);
            }
            if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
                setShowProfileMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await logout();
        setShowProfileMenu(false);
        navigate('/');
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);
        setShowSuggestions(!!value.trim());
    };

    const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            performSearch(searchQuery);
        }
    };

    const performSearch = (query: string) => {
        if (query.trim()) {
            navigate(`/projects?q=${encodeURIComponent(query.trim())}`);
        } else {
            navigate('/projects');
        }
        setSearchQuery('');
        closeMenu();
    };

    const handleSuggestionClick = (slug: string, id: number) => {
        navigate(`/projects/${slug || id}`);
        setSearchQuery('');
        closeMenu();
    };

    return (

        <nav className={`fixed top-0 left-0 right-0 z-50 w-full py-4 px-4 transition-all duration-300`}>
            <div className="w-full max-w-[1104px] mx-auto relative">
                <div className="flex items-center justify-between bg-card/90 backdrop-blur-sm w-full border border-border h-[70px] px-6 md:px-8 rounded-full shadow-sm">

                    <Link to='/' className="flex-shrink-0" onClick={closeMenu}>
                        <img src="/flyup-logo.png" alt="Flyup Logo" className="h-[50px] md:h-[70px] w-auto transition-all" />
                    </Link>

                    {/* Desktop Search — hidden on /projects */}
                    {!isProjectsPage && (
                        <div className="hidden md:block relative" ref={suggestionRef}>
                            <div className="flex items-center gap-[10px] bg-background border border-border h-[40px] w-[414px] rounded-[12px] px-4 focus-within:border-primary transition-all relative">
                                <Search size={20} className="text-muted-foreground flex-shrink-0" />
                                <div className="relative flex-1 overflow-hidden">
                                    {!searchQuery && !searchFocused && (
                                        <span className="absolute inset-0 flex items-center text-[14px] text-muted-foreground pointer-events-none whitespace-nowrap">
                                            {typeText}
                                            <span className="inline-block w-[1.5px] h-[14px] bg-muted-foreground ml-[1px] animate-pulse" />
                                        </span>
                                    )}
                                    <input
                                        type="text"
                                        className="bg-transparent outline-none w-full text-[14px] text-foreground relative z-10"
                                        value={searchQuery}
                                        onChange={handleSearchChange}
                                        onFocus={() => { setSearchFocused(true); if (searchQuery) setShowSuggestions(true); }}
                                        onBlur={() => setSearchFocused(false)}
                                        onKeyDown={handleSearch}
                                    />
                                </div>
                            </div>

                            {showSuggestions && (
                                <div className="absolute top-[50px] left-0 w-full bg-card border border-border rounded-[16px] shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[60]">
                                    <div className="py-2">
                                        {suggestions.length > 0 ? (
                                            suggestions.map((item) => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => handleSuggestionClick(item.slug, item.id)}
                                                    className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted transition-all text-left group"
                                                >
                                                    <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden border border-border">
                                                        <img
                                                            src={item.thumbnail_url || PLACEHOLDER_IMG}
                                                            alt={item.title}
                                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                                        />
                                                    </div>

                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[14px] font-semibold text-foreground truncate">
                                                            {item.title}
                                                        </span>
                                                        <span className="text-[12px] text-muted-foreground truncate">
                                                            {item.description || 'ยังไม่มีรายละเอียด'}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))
                                        ) : (
                                            <button
                                                onClick={() => performSearch(searchQuery)}
                                                className="w-full px-5 py-3 text-sm text-muted-foreground flex items-center gap-3 hover:bg-muted"
                                            >
                                                <Search size={16} />
                                                <span>ค้นหาแบบละเอียดสำหรับ "{searchQuery}"</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="hidden md:flex items-center gap-4">
                        {authUser ? (
                            <>
                                <Link to={`/${authUser?.role}/dashboard`} className="flex items-center justify-center w-11 h-11 bg-brand-violet hover:bg-brand-violet-hover text-white rounded-full transition-all shadow-sm active:scale-95">
                                    <LayoutDashboard size={22} />
                                </Link>
                                <NotificationBell open={showNotif} onOpenChange={handleNotifChange} desktopOnly />
                                <div className="relative" ref={profileMenuRef}>
                                    <button
                                        onClick={handleProfileToggle}
                                        className="relative flex items-center justify-center focus:outline-none hover:opacity-90 transition-opacity cursor-pointer"
                                    >
                                        <UserAvatar
                                            picture={authUser.picture as string}
                                            firstName={authUser.first_name as string}
                                            lastName={authUser.last_name as string}
                                            className="w-11 h-11 rounded-full object-cover border-2 border-transparent shadow-sm"
                                        />
                                        <div className="absolute -bottom-1 -right-1 bg-brand-violet text-white rounded-full p-[2px] border-2 border-white">
                                            <ChevronDown size={12} strokeWidth={3} />
                                        </div>
                                    </button>

                                    {showProfileMenu && (
                                        <div className="absolute top-[56px] right-0 w-[260px] bg-card border border-border rounded-[20px] shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[60]">
                                            <div className="flex items-center gap-3 px-5 py-4">
                                                <UserAvatar
                                                    picture={authUser.picture as string}
                                                    firstName={authUser.first_name as string}
                                                    lastName={authUser.last_name as string}
                                                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                                />
                                                <span className="text-[14px] font-semibold text-foreground truncate">
                                                    {authUser.first_name && authUser.last_name
                                                        ? `${authUser.first_name} ${authUser.last_name}`
                                                        : authUser.name || authUser.email}
                                                </span>
                                            </div>
                                            <div className="border-t border-border" />
                                            {(ROLE_MENU_ITEMS[authUser?.role as string] ?? []).map((item) => (
                                                <Link
                                                    key={item.path}
                                                    to={item.path}
                                                    onClick={() => setShowProfileMenu(false)}
                                                    className="flex items-center gap-3 px-5 py-3 hover:bg-muted transition-colors text-[14px] text-foreground"
                                                >
                                                    {item.icon}
                                                    {item.label}
                                                </Link>
                                            ))}
                                            <div className="border-t border-border" />
                                            <Link
                                                to={`/${authUser?.role}/profile`}
                                                onClick={() => setShowProfileMenu(false)}
                                                className="flex items-center gap-3 px-5 py-3 hover:bg-muted transition-colors text-[14px] text-foreground"
                                            >
                                                <Settings size={18} className="text-brand-violet" />
                                                การตั้งค่าและความเป็นส่วนตัว
                                            </Link>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                                                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted transition-colors text-[14px] text-foreground cursor-pointer"
                                            >
                                                <LogOut size={18} className="text-brand-violet" />
                                                ออกจากระบบ
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex gap-2">
                                <Link to='/login' className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-xl text-[14px] font-medium transition-all shadow-sm active:scale-95">เริ่มต้น</Link>
                                <Link to='/register' className="bg-background border border-border px-6 py-2 rounded-xl text-[14px] font-medium text-foreground hover:bg-muted transition-all active:scale-95">สมัคร</Link>
                            </div>
                        )}
                    </div>

                    <button onClick={toggleMenu} className="md:hidden p-2 text-foreground focus:outline-none cursor-pointer">
                        {isOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                {isOpen && (
                    <div ref={mobileMenuRef} className="absolute top-[80px] left-0 right-0 bg-card/95 backdrop-blur-lg border border-border rounded-[24px] p-6 shadow-xl md:hidden flex flex-col gap-4 animate-in fade-in zoom-in duration-200">

                        {/* Search + Profile avatar row */}
                        <div className="flex items-center gap-3">
                            <div className="flex-1 flex items-center gap-3 bg-background border border-border h-[48px] rounded-[12px] px-4">
                                <Search size={20} className="text-muted-foreground flex-shrink-0" />
                                <input
                                    type="text"
                                    placeholder="ค้นหา โปรเจกต์..."
                                    className="bg-transparent outline-none w-full text-[16px]"
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    onKeyDown={handleSearch}
                                />
                            </div>
                            {authUser && (
                                <>
                                    <NotificationBell open={showNotif} onOpenChange={handleNotifChange} mobile />
                                    <button
                                        onClick={handleProfileToggle}
                                        className="flex-shrink-0 w-[48px] h-[48px] rounded-full overflow-hidden border-2 border-transparent focus:outline-none cursor-pointer"
                                    >
                                        <UserAvatar
                                            picture={authUser.picture as string}
                                            firstName={authUser.first_name as string}
                                            lastName={authUser.last_name as string}
                                            className="w-full h-full object-cover"
                                        />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Search suggestions */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="bg-background border border-border rounded-[12px] overflow-hidden">
                                {suggestions.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => performSearch(item.title)}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-all text-left"
                                    >
                                        <div className="w-9 h-9 flex-shrink-0 rounded-lg overflow-hidden border border-border">
                                            <img src={item.thumbnail_url || PLACEHOLDER_IMG} alt={item.title} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[13px] font-semibold text-foreground truncate">{item.title}</span>
                                            <span className="text-[11px] text-muted-foreground truncate">{item.description}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Profile dropdown menu */}
                        {authUser && showProfileMenu && (
                            <div className="border-t border-border pt-3 flex flex-col gap-1">
                                <div className="flex items-center gap-3 px-2 py-2 mb-1">
                                    <UserAvatar
                                        picture={authUser.picture as string}
                                        firstName={authUser.first_name as string}
                                        lastName={authUser.last_name as string}
                                        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                                    />
                                    <span className="text-[14px] font-semibold text-foreground truncate">
                                        {authUser.first_name && authUser.last_name
                                            ? `${authUser.first_name} ${authUser.last_name}`
                                            : authUser.name || authUser.email}
                                    </span>
                                </div>
                                <div className="border-t border-border mb-1" />
                                <Link to={`/${authUser?.role}/dashboard`} onClick={closeMenu} className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-muted transition-colors text-[14px] text-foreground">
                                    <LayoutDashboard size={18} className="text-brand-violet" /> แดชบอร์ด
                                </Link>
                                {(ROLE_MENU_ITEMS[authUser?.role as string] ?? []).map((item) => (
                                    <Link key={item.path} to={item.path} onClick={closeMenu} className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-muted transition-colors text-[14px] text-foreground">
                                        {item.icon} {item.label}
                                    </Link>
                                ))}
                                <Link to={`/${authUser?.role}/profile`} onClick={closeMenu} className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-muted transition-colors text-[14px] text-foreground">
                                    <Settings size={18} className="text-brand-violet" /> การตั้งค่าและความเป็นส่วนตัว
                                </Link>
                                <button onClick={() => { handleLogout(); closeMenu(); }} className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-muted transition-colors text-[14px] text-foreground cursor-pointer w-full">
                                    <LogOut size={18} className="text-brand-violet" /> ออกจากระบบ
                                </button>
                            </div>
                        )}

                        {!authUser && (
                            <div className="flex flex-col gap-3 pt-2 border-t border-border">
                                <Link to='/login' className="w-full bg-primary hover:bg-primary-hover text-white text-center py-3 rounded-xl text-[15px] font-medium transition-all shadow-sm" onClick={closeMenu}>เริ่มต้น</Link>
                                <Link to='/register' className="w-full bg-background border border-border text-center py-3 rounded-xl text-[15px] font-medium text-foreground hover:bg-muted transition-all" onClick={closeMenu}>สมัคร</Link>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
