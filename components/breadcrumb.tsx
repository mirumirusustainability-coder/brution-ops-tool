import Link from 'next/link'

export type BreadcrumbItem = {
  label: string
  href?: string
}

type BreadcrumbProps = {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="text-xs text-gray-400" aria-label="breadcrumb">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-gray-600">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? 'text-gray-500 font-medium' : ''}>{item.label}</span>
              )}
              {!isLast && <span className="text-gray-300">&gt;</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
