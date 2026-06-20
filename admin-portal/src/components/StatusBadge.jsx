const configs = {
  pending:  { bg: 'bg-amber-50  dark:bg-amber-900/30',  text: 'text-amber-700  dark:text-amber-400',  dot: 'bg-amber-400'  },
  verified: { bg: 'bg-green-50  dark:bg-green-900/30',  text: 'text-green-700  dark:text-green-400',  dot: 'bg-green-500'  },
  rejected: { bg: 'bg-red-50    dark:bg-red-900/30',    text: 'text-red-700    dark:text-red-400',    dot: 'bg-red-500'    },
  seller:   { bg: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
  buyer:    { bg: 'bg-blue-50   dark:bg-blue-900/30',   text: 'text-blue-700   dark:text-blue-400',   dot: 'bg-blue-500'   },
  admin:    { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', dot: 'bg-purple-500' },
}

export default function StatusBadge({ status }) {
  const cfg = configs[status] || { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300', dot: 'bg-gray-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
