import { useState } from 'react'
import { Moon, Sun, Building2, Map, List, Settings, Bell } from 'lucide-react'
import useStore from '../../store/useStore'
import SettingsModal from '../Settings/SettingsModal'
import { useBekleyenBelgeler } from '../../hooks/useBelgeler'
import BekleyenYazismalar from '../JobList/BekleyenYazismalar'

export default function Header() {
  const { darkMode, toggleDarkMode, viewMode, setViewMode } = useStore()
  const [settingsAcik, setSettingsAcik] = useState(false)
  const [bekleyenAcik, setBekleyenAcik] = useState(false)

  const { data: bekleyenler = [] } = useBekleyenBelgeler()
  const bekleyenSayi = bekleyenler.length

  return (
    <>
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
          {/* Bekleyen yazışmalar butonu */}
          <button
            onClick={() => setBekleyenAcik(true)}
            className="relative p-2 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:text-gray-400 dark:hover:text-amber-400 dark:hover:bg-amber-900/20 transition-colors"
            title="Bekleyen yazışmalar"
          >
            <Bell size={18} />
            {bekleyenSayi > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {bekleyenSayi > 99 ? '99+' : bekleyenSayi}
              </span>
            )}
          </button>

          {/* List / Map toggle */}
          <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Liste görünümü"
            >
              <List size={15} />
              <span className="hidden sm:inline">Liste</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                viewMode === 'map'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Harita görünümü"
            >
              <Map size={15} />
              <span className="hidden sm:inline">Harita</span>
            </button>
          </div>

          {/* Settings */}
          <button
            onClick={() => setSettingsAcik(true)}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Ayarlar"
          >
            <Settings size={18} />
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
            title={darkMode ? 'Açık tema' : 'Koyu tema'}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {settingsAcik && <SettingsModal onClose={() => setSettingsAcik(false)} />}
      {bekleyenAcik && <BekleyenYazismalar onClose={() => setBekleyenAcik(false)} />}
    </>
  )
}
