import { Search, X, ChevronDown } from 'lucide-react'
import useStore from '../../store/useStore'
import { useJobFilterOptions } from '../../hooks/useJobs'

export default function SearchFilter() {
  const {
    searchQuery, setSearchQuery,
    filterIlce, setFilterIlce,
    filterTur, setFilterTur,
    filterVade, setFilterVade,
  } = useStore()
  const { data: options } = useJobFilterOptions()

  const hasFilters = filterIlce || filterTur || filterVade

  const clearAll = () => {
    setSearchQuery('')
    setFilterIlce('')
    setFilterTur('')
    setFilterVade('')
  }

  return (
    <div className="p-3 border-b border-gray-200 dark:border-gray-700 space-y-2 flex-shrink-0">
      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="İş no, ilçe, ada/parsel..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-8 pr-8 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-1.5">
        <Select
          value={filterIlce}
          onChange={setFilterIlce}
          options={options?.ilceler || []}
          placeholder="Tüm ilçeler"
        />
        <Select
          value={filterTur}
          onChange={setFilterTur}
          options={options?.turler || []}
          placeholder="Tüm iş türleri"
        />
        <Select
          value={filterVade}
          onChange={setFilterVade}
          options={[
            { value: 'gecmis', label: 'Vadesi geçmiş' },
            { value: 'yaklasan', label: 'Bu hafta vadeli' },
          ]}
          placeholder="Tüm vadeler"
        />
      </div>

      {hasFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
        >
          <X size={12} /> Filtreleri temizle
        </button>
      )}
    </div>
  )
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none text-sm rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 pr-7 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-300"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => {
          const val = typeof opt === 'string' ? opt : opt.value
          const label = typeof opt === 'string' ? opt : opt.label
          return <option key={val} value={val}>{label}</option>
        })}
      </select>
      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  )
}
