import { Search } from 'lucide-react'

interface SearchBarProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    resultCount?: number
}

const SearchBar = ({ value, onChange, placeholder = 'ค้นหา...', resultCount }: SearchBarProps) => (
    <div className="flex min-w-0 flex-1 items-center gap-[10px]">
        <div className="relative min-w-0 flex-1 sm:max-w-[320px]">
            <Search size={14} className="absolute left-[12px] top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full pl-[34px] pr-[12px] py-[8px] text-[13px] border border-border rounded-[8px] bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
        </div>
        {value && resultCount !== undefined && (
            <span className="hidden text-[12px] text-muted-foreground sm:inline">พบ {resultCount} รายการ</span>
        )}
    </div>
)

export default SearchBar
