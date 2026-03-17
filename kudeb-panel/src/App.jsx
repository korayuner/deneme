import { useEffect } from 'react'
import useStore from './store/useStore'
import Header from './components/Layout/Header'
import JobList from './components/JobList/JobList'
import JobDetail from './components/JobDetail/JobDetail'

export default function App() {
  const { darkMode } = useStore()

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
        <JobList />
        <JobDetail />
      </div>
    </div>
  )
}
