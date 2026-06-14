const configs = {
  pending:  { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400'  },
  verified: { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
  rejected: { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500'    },
  seller:   { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  buyer:    { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500'   },
  admin:    { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
}

export default function StatusBadge({ status }) {
  const cfg = configs[status] || { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
