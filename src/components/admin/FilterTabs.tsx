import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface TabItem {
    key: string
    label: string
    count?: number
}

interface FilterTabsProps {
    tabs: TabItem[]
    active: string
    onChange: (key: string) => void
}

const FilterTabs = ({ tabs, active, onChange }: FilterTabsProps) => {
    const [open, setOpen] = useState(false)
    const rootRef = useRef<HTMLDivElement>(null)
    const activeTab = tabs.find((tab) => tab.key === active) ?? tabs[0]

    useEffect(() => {
        const closeOnOutsideClick = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
        }
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false)
        }
        document.addEventListener('mousedown', closeOnOutsideClick)
        document.addEventListener('keydown', closeOnEscape)
        return () => {
            document.removeEventListener('mousedown', closeOnOutsideClick)
            document.removeEventListener('keydown', closeOnEscape)
        }
    }, [])

    return (
        <div ref={rootRef} className="relative z-20 w-[124px] shrink-0 sm:w-[180px]">
            <button
                type="button"
                aria-label="เลือกตัวกรอง"
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
                className={`flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border bg-white px-3 text-left text-[13px] font-medium text-foreground outline-none transition-colors hover:bg-muted/30 ${
                    open ? 'border-primary ring-2 ring-primary/15' : 'border-border'
                }`}
            >
                <span className="min-w-0 truncate">
                    {activeTab?.label}
                    {activeTab?.count !== undefined ? ` (${activeTab.count})` : ''}
                </span>
                <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className={`shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {open && (
                <div
                    role="listbox"
                    className="absolute right-0 top-[calc(100%+6px)] z-50 w-full overflow-hidden rounded-lg border border-border bg-white p-1 shadow-lg"
                >
                    {tabs.map((tab) => {
                        const selected = tab.key === active
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                onClick={() => {
                                    onChange(tab.key)
                                    setOpen(false)
                                }}
                                className={`flex w-full cursor-pointer items-center rounded-md px-3 py-2 text-left text-[13px] transition-colors ${
                                    selected
                                        ? 'bg-primary/10 font-semibold text-primary'
                                        : 'text-foreground hover:bg-muted'
                                }`}
                            >
                                <span className="min-w-0 truncate">
                                    {tab.label}{tab.count !== undefined ? ` (${tab.count})` : ''}
                                </span>
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default FilterTabs
