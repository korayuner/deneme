import { Moon, Sun, Building2 } from 'lucide-react'
import useStore from '../../store/useStore'

export default function Header() {
  const { darkMode, toggleDarkMode } = useStore()

  return (
    <header className="flex-shrink-0 h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Building2 size={22} className="text-blue-600" />
        <div>
          <span className="font-semibold text-gray-800 dark:text-gray-100">KUDEB</span>
          <span className="hidden sm:inline text-gray-500 dark:text-gray-400 text-sm ml-2">İş Yönetim Paneli</span>
        </div>
        <span className="hidden md:inline ml-2 text-xs text-gray-400">İzmir Büyükşehir Belediyesi</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
          title={darkMode ? 'Açık tema' : 'Koyu tema'}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  )
}
