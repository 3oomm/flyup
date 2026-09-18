import { useState, useEffect, useMemo } from 'react';
import { useSEO } from '../../hooks/useSEO';
import { Link } from 'react-router';
import type { ElementType } from 'react';
import {
  Search, ChevronDown, Flame, Sparkles,
  LayoutGrid, Laptop, Smartphone, Bot, Briefcase,
  Rocket, BookOpen, ShieldCheck, Wifi, Gamepad2, Loader2,
  SlidersHorizontal, X, Star, Zap
} from 'lucide-react';
import { usePublicProjectStore } from '../../store/usePublicProjectStore';
import { getProgress, getDaysLeft, getProjectTimingDisplay } from '../../lib/project';

// ─── Category icon mapping ──────────────────────────────────────────────────

const categoryIconMap: Record<string, ElementType> = {
  'Technology': Laptop,
  'AI': Bot,
  'FinTech': Briefcase,
  'EdTech': BookOpen,
  'HealthTech': Rocket,
  'Gaming': Gamepad2,
  'Environment': Wifi,
  'Social Impact': ShieldCheck,
  'Education': BookOpen,
  'Others': LayoutGrid,
  // legacy
  'Web App': Laptop,
  'Mobile App': Smartphone,
  'AI/ML': Bot,
  'Business': Briefcase,
  'Fintech / Blockchain': Rocket,
  'Cybersecurity': ShieldCheck,
  'IoT': Wifi,
  'Game': Gamepad2,
};

function getCategoryIcon(name: string | null): ElementType {
  if (!name) return LayoutGrid;
  return categoryIconMap[name] || LayoutGrid;
}

// ─── Component ───────────────────────────────────────────────────────────────

const NOW = Date.now();

const Projects = () => {
  useSEO({
    title: 'โปรเจกต์ทั้งหมด',
    description: 'ค้นหาและลงทุนในโปรเจกต์ซอฟต์แวร์ของนักศึกษาไทยที่น่าสนใจ หลากหลายหมวดหมู่ พร้อมระบบ Milestone โปร่งใส',
    url: '/projects',
  });

  const {
    publicProjects, endingProjects, newProjects, executingProjects, recommendedProjects,
    categories, isLoading, isFetchError, fetchPublicProjects, fetchHomeProjects, fetchCategories,
  } = usePublicProjectStore();

  const [activeCategory, setActiveCategory] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('category') || 'ทั้งหมด';
  });
  const [searchQuery, setSearchQuery] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('q') || '';
  });
  const [sortOrder] = useState<'latest' | 'oldest' | 'ending_soon' | 'popular'>(() => {
    const params = new URLSearchParams(window.location.search);
    const sort = params.get('sort');
    if (sort === 'oldest' || sort === 'ending_soon' || sort === 'popular') return sort;
    return 'latest';
  });
  const [section, setSection] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('section') || '';
  });
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [minGoal, setMinGoal] = useState('');
  const [maxGoal, setMaxGoal] = useState('');

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (section) fetchHomeProjects();
    else fetchPublicProjects();
  }, [section, fetchPublicProjects, fetchHomeProjects]);

  const SECTION_OPTIONS = [
    { key: 'hot',         label: 'ใกล้สำเร็จแล้ว!',       icon: Flame,     color: 'text-red-500' },
    { key: 'new',         label: 'โปรเจกต์มาใหม่',         icon: Sparkles,  color: 'text-purple-500' },
    { key: 'executing',   label: 'กำลังดำเนินการ',          icon: Zap,       color: 'text-green-500' },
    { key: 'recommended', label: 'แนะนำ',                   icon: Star,      color: 'text-amber-500' },
  ] as const;

  const activeSectionOption = SECTION_OPTIONS.find(s => s.key === section) ?? null;
  const dropdownLabel = activeSectionOption ? activeSectionOption.label : 'เลือกหมวดหมู่';

  const categoryList = useMemo(() => {
    const allOption = { name: 'ทั้งหมด', icon: LayoutGrid };
    const apiCategories = categories.map(c => ({
      name: c.name,
      icon: getCategoryIcon(c.name),
    }));
    return [allOption, ...apiCategories];
  }, [categories]);

  const activeFilterCount = [minGoal, maxGoal].filter(v => v !== '').length;

  const sourceProjects = useMemo(() => {
    if (section === 'hot') return endingProjects;
    if (section === 'new') return newProjects;
    if (section === 'executing') return executingProjects;
    if (section === 'recommended') return recommendedProjects;
    return publicProjects;
  }, [section, publicProjects, endingProjects, newProjects, executingProjects, recommendedProjects]);

  const filteredProjects = useMemo(() => {
    let result = [...sourceProjects];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => {
        const rawCat = p.category as unknown;
        const categoryName = typeof rawCat === 'string'
          ? rawCat
          : (rawCat as { name?: string } | null)?.name ?? '';

        return p.title.toLowerCase().includes(query) ||
          (p.description || '').toLowerCase().includes(query) ||
          categoryName.toLowerCase().includes(query);
      });
    }

    if (activeCategory !== 'ทั้งหมด') {
      result = result.filter(p => {
        const rawCat = p.category as unknown;
        const catName = typeof rawCat === 'string' ? rawCat : (rawCat as { name?: string } | null)?.name;
        return catName === activeCategory;
      });
    }

    const min = parseFloat(minGoal.replace(/,/g, ''));
    const max = parseFloat(maxGoal.replace(/,/g, ''));
    if (!isNaN(min)) result = result.filter(p => (p.funding_goal ?? 0) >= min);
    if (!isNaN(max)) result = result.filter(p => (p.funding_goal ?? 0) <= max);

    // หมวดหมู่พิเศษ (section) มาจาก endpoint ที่ backend เรียงลำดับมาให้แล้ว
    // ไม่ควร sort ทับ ไม่งั้นจะขัดกับ label ที่บอกว่าเรียงตามอะไร
    if (!section) {
      result.sort((a, b) => {
        if (sortOrder === 'oldest') return a.id - b.id;
        if (sortOrder === 'ending_soon') return getDaysLeft(a) - getDaysLeft(b);
        if (sortOrder === 'popular') return (b.current_funding ?? 0) - (a.current_funding ?? 0);
        return b.id - a.id; // latest
      });
    }

    return result;
  }, [sourceProjects, activeCategory, searchQuery, sortOrder, minGoal, maxGoal, section]);

  if (isFetchError) {
    return (
      <div className="bg-background min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4 mt-[100px]">
        <div className="text-5xl">⚠️</div>
        <h2 className="text-xl font-bold text-foreground">ขออภัย ระบบขัดข้องชั่วคราว</h2>
        <p className="text-muted-foreground text-sm max-w-sm">และกำลังกลับมาให้บริการเร็วๆ นี้</p>
        <button
          onClick={() => section ? fetchHomeProjects() : fetchPublicProjects()}
          className="mt-2 px-6 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          ลองใหม่อีกครั้ง
        </button>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen pb-20 font-sans text-foreground mt-[100px]">
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">

        <div className="mb-5 md:mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-1">สำรวจโปรเจกต์</h1>
          {section === 'hot' && (
            <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 text-xs font-semibold">
              <Flame size={13} fill="currentColor" /> ใกล้สำเร็จแล้ว! — เรียงตามใกล้หมดเวลา
            </div>
          )}
          {section === 'new' && (
            <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-600 text-xs font-semibold">
              <Sparkles size={13} fill="currentColor" /> โปรเจกต์มาใหม่ — เรียงตามล่าสุด
            </div>
          )}
          {section === 'executing' && (
            <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-green-50 border border-green-200 text-green-600 text-xs font-semibold">
              <Zap size={13} fill="currentColor" /> โปรเจกต์กำลังดำเนินการ — เรียงตามยอดนิยม
            </div>
          )}
          {section === 'recommended' && (
            <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-xs font-semibold">
              <Star size={13} fill="currentColor" /> โปรเจกต์แนะนำ — เรียงตามยอดนิยม
            </div>
          )}
          {!section && <p className="text-sm text-muted-foreground">ค้นพบโปรเจกต์ซอฟต์แวร์จากนักศึกษาที่กำลังระดมทุน</p>}
        </div>

        <div className="flex flex-col lg:flex-row gap-3 md:gap-4 mb-4">
          <div className="flex-1 flex items-center gap-2 bg-card border border-border h-12 md:h-11 rounded-lg px-4 focus-within:border-primary transition-all shadow-sm w-full">
            <Search size={18} className="text-muted-foreground flex-shrink-0" />
            <input
              data-testid="projects-search"
              type="text"
              placeholder="ค้นหาชื่อโปรเจกต์..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none w-full text-sm placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex gap-3 w-full lg:w-auto">
            {/* Sort / Section dropdown */}
            <div className="relative flex-1 lg:flex-none lg:w-47.5">
              <div
                onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                className="flex items-center justify-between bg-card border border-border h-12 md:h-11 rounded-lg px-4 cursor-pointer hover:bg-muted/30 transition-all shadow-sm select-none w-full"
              >
                <span className="text-sm font-medium whitespace-nowrap flex items-center gap-1.5">
                  {activeSectionOption && <activeSectionOption.icon size={13} className={activeSectionOption.color} />}
                  {dropdownLabel}
                </span>
                <ChevronDown size={16} className={`text-muted-foreground transition-transform ml-2 flex-shrink-0 ${isSortDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
              {isSortDropdownOpen && (
                <div className="absolute top-13 md:top-12 left-0 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden z-20">
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">เรียงตาม</div>
                  {section && (
                    <div
                      onClick={() => { setSection(''); setIsSortDropdownOpen(false); }}
                      className="px-4 py-2.5 text-sm cursor-pointer hover:bg-muted/30 whitespace-nowrap flex items-center gap-2 text-muted-foreground"
                    >
                      <LayoutGrid size={13} />
                      ทั้งหมด
                    </div>
                  )}
                  {SECTION_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    return (
                      <div
                        key={opt.key}
                        onClick={() => { setSection(opt.key); setIsSortDropdownOpen(false); }}
                        className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-muted/30 whitespace-nowrap flex items-center gap-2 ${section === opt.key ? 'text-primary font-medium bg-primary-light' : ''}`}
                      >
                        <Icon size={13} className={opt.color} />
                        {opt.label}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilter(v => !v)}
              className={`relative flex items-center gap-2 px-4 h-12 md:h-11 rounded-lg border shadow-sm text-sm font-medium transition-all cursor-pointer flex-shrink-0 ${showFilter ? 'bg-primary text-white-foreground border-primary' : 'bg-card border-border hover:bg-muted/30'}`}
            >
              <SlidersHorizontal size={16} />
              <span className="hidden sm:inline">ตัวกรอง</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filter panel */}
        {showFilter && (
          <div className="bg-card border border-border rounded-xl p-4 mb-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-foreground">กรองตามเป้าหมายระดมทุน (฿)</span>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setMinGoal(''); setMaxGoal(''); }}
                  className="text-xs text-error hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <X size={12} /> ล้างตัวกรอง
                </button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">ขั้นต่ำ</label>
                <div className="flex items-center gap-2 border border-border rounded-lg px-3 h-10 focus-within:border-primary bg-background">
                  <span className="text-sm text-muted-foreground">฿</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={minGoal}
                    onChange={e => setMinGoal(e.target.value)}
                    className="bg-transparent outline-none w-full text-sm"
                    min={0}
                  />
                </div>
              </div>
              <div className="flex items-end pb-[1px] text-muted-foreground text-sm hidden sm:flex">—</div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">สูงสุด</label>
                <div className="flex items-center gap-2 border border-border rounded-lg px-3 h-10 focus-within:border-primary bg-background">
                  <span className="text-sm text-muted-foreground">฿</span>
                  <input
                    type="number"
                    placeholder="ไม่จำกัด"
                    value={maxGoal}
                    onChange={e => setMaxGoal(e.target.value)}
                    className="bg-transparent outline-none w-full text-sm"
                    min={0}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex overflow-x-auto gap-2.5 pb-3 mb-6 md:mb-8 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {categoryList.map((category) => {
            const Icon = category.icon;
            const isActive = activeCategory === category.name;
            return (
              <button
                key={category.name}
                onClick={() => setActiveCategory(category.name)}
                className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all border shadow-sm flex-shrink-0 cursor-pointer ${isActive
                    ? 'bg-primary-light text-primary border-primary'
                    : 'bg-card text-muted-foreground border-border hover:border-primary hover:text-foreground'
                  }`}
              >
                <Icon size={16} className={isActive ? 'text-primary' : ''} />
                {category.name}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 md:py-20">
            <Loader2 size={32} className="animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">กำลังโหลดโปรเจกต์...</p>
          </div>
        ) : filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {filteredProjects.map((project) => {
              const rawCat = project.category as unknown;
              const categoryName = typeof rawCat === 'string'
                ? rawCat
                : (rawCat as { name?: string } | null)?.name ?? null;
              const ProjectCategoryIcon = getCategoryIcon(categoryName);
              const progress = getProgress(project);
              const timing = getProjectTimingDisplay(project, NOW);
              const isHot = progress >= 70;
              const isNew = (NOW - new Date(project.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000;

              return (
                <Link
                  key={project.id}
                  data-testid="project-card"
                  to={`/projects/${project.slug || project.id}`}
                  className="bg-card rounded-2xl overflow-hidden border border-border hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer group flex flex-col"
                >
                  <div className="relative h-48 w-full overflow-hidden bg-muted">
                    <img
                      src={project.thumbnail_url || `https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=800`}
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3 flex gap-2">
                      {isHot && (
                        <div className="bg-error text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-md">
                          <Flame size={14} fill="currentColor" />
                          {progress}%
                        </div>
                      )}
                      {isNew && !isHot && (
                        <div className="bg-[image:var(--gradient-primary)] text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-md">
                          <Sparkles size={14} fill="currentColor" />
                          ใหม่
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 md:p-5 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <h3 className="text-base md:text-lg font-bold line-clamp-1 flex-1">{project.title}</h3>
                      {categoryName && (
                        <span className="flex items-center gap-1 text-xs font-medium text-primary bg-primary-light border border-primary/20 px-2 py-1 rounded-full whitespace-nowrap">
                          <ProjectCategoryIcon size={12} />
                          {categoryName}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
                      {project.description || 'ยังไม่มีรายละเอียด'}
                    </p>

                    <div className="w-full h-1.5 bg-muted rounded-full mb-3 overflow-hidden mt-auto">
                      <div
                        className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-dashed border-border">
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">ระดมทุนแล้ว</p>
                        <span className="text-sm md:text-base font-bold text-primary">{project.current_funding.toLocaleString()} ฿</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground mb-0.5">{timing.caption}</p>
                        <span className="text-sm font-medium text-foreground">{timing.label}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 md:py-20 text-center px-4">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-muted/50 rounded-full flex items-center justify-center mb-4">
              <Search size={28} className="text-muted-foreground" />
            </div>
            <h3 className="text-base md:text-lg font-bold mb-1">ไม่พบโปรเจกต์</h3>
            <p className="text-sm text-muted-foreground">ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่ใหม่อีกครั้ง</p>
            <button
              onClick={() => { setSearchQuery(''); setActiveCategory('ทั้งหมด'); setMinGoal(''); setMaxGoal(''); }}
              className="mt-4 text-primary text-sm font-medium hover:underline p-2"
            >
              ล้างตัวกรอง
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default Projects;
