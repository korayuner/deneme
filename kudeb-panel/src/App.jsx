import { useEffect } from 'react'
import useStore from './store/useStore'
import Header from './components/Layout/Header'
import JobList from './components/JobList/JobList'
import JobDetail from './components/JobDetail/JobDetail'
import FullMap from './components/MapView/FullMap'

export default function App() {
  const { darkMode, viewMode } = useStore()

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        {viewMode === 'map' ? (
          <FullMap />
        ) : (
          <>
            <JobList />
            <JobDetail />
          </>
        )}
      </div>
    </div>
  )
}
