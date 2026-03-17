import clsx from 'clsx'

const variants = {
  gecmis: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  yaklasan: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  normal: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  default: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
}

export default function Badge({ children, variant = 'default', className = '' }) {
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  )
}
