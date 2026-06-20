export default function StatCard({ label, value, icon: Icon, color, sub }) {
  const gradients = {
    blue:   'from-blue-500 to-indigo-600',
    green:  'from-emerald-400 to-teal-600',
    amber:  'from-amber-400 to-orange-500',
    red:    'from-rose-500 to-red-600',
    purple: 'from-violet-500 to-purple-700',
    indigo: 'from-indigo-500 to-blue-700',
    orange: 'from-orange-400 to-amber-600',
  }

  const gradient = gradients[color] || gradients.blue

  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-5 flex items-start gap-4 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200`}>
      <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-white/75 font-medium">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5 leading-tight">
          {value === null || value === undefined ? '—' : String(value)}
        </p>
        {sub && <p className="text-xs text-white/65 mt-1">{sub}</p>}
      </div>
    </div>
  )
}
