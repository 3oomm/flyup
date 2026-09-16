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

const FilterTabs = ({ tabs, active, onChange }: FilterTabsProps) => (
    <div className="relative w-[120px] shrink-0 sm:w-auto sm:min-w-[180px]">
        <select
            aria-label="เลือกตัวกรอง"
            value={active}
            onChange={(event) => onChange(event.target.value)}
            className="h-10 w-full appearance-none rounded-lg border border-border bg-white pl-4 pr-10 text-[13px] font-medium text-foreground outline-none transition-colors cursor-pointer hover:bg-muted/30 focus:border-primary focus:ring-2 focus:ring-primary/15"
        >
            {tabs.map((tab) => (
                <option key={tab.key} value={tab.key}>
                    {tab.label}{tab.count !== undefined ? ` (${tab.count})` : ''}
                </option>
            ))}
        </select>
        <ChevronDown
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
    </div>
)

export default FilterTabs
