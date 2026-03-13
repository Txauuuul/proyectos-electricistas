export default function AdminPageHeader({
  icon: Icon,
  title,
  accent,
  subtitle,
  actions = null,
}) {
  return (
    <header className="border-b border-white/5 shadow" style={{ background: '#1a1a1a' }}>
      <div className="mx-auto flex min-h-[104px] max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
            {Icon && <Icon size={24} className="text-[#29ace3]" />}
          </div>

          <div>
            <h1 className="text-xl font-extrabold uppercase tracking-wide text-white sm:text-2xl">
              {title}
              {accent ? <span className="text-[#29ace3]">{accent}</span> : null}
            </h1>
            {subtitle ? <p className="mt-1 text-sm text-gray-400">{subtitle}</p> : null}
          </div>
        </div>

        {actions ? (
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}