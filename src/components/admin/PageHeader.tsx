const PageHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div className="min-w-0 px-1 py-2 sm:p-2.5">
        <h1 className="break-words text-xl font-semibold sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 break-words text-xs text-muted-foreground">{subtitle}</p>}
    </div>
)

export default PageHeader
