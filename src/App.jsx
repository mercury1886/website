import { Routes, Route, Navigate } from 'react-router-dom'
import { searchTrips } from './api'
import SearchPage from './SearchPage'
import ResultsPage from './ResultsPage'
import CheckoutPage from './CheckoutPage'
import './App.css'
import { useState } from 'react'

function formatDateForApi(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function App() {
  const [form, setForm] = useState({
    passengers: '1',
    tripType: 'one-way',
    from: null,
    to: null,
    departureDate: null,
    returnDate: null,
  })
  const [tripResults, setTripResults] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [sortMode, setSortMode] = useState('best')
  const [selectedTripId, setSelectedTripId] = useState('')

  function handleFieldChange(name, value) {
    setForm((currentForm) => {
      if (name === 'tripType' && value === 'one-way') {
        return {
          ...currentForm,
          tripType: value,
          returnDate: null,
        }
      }

      return {
        ...currentForm,
        [name]: value,
      }
    })
  }

  async function handleSearch() {
    if (!form.from || !form.to || !form.departureDate) {
      return false
    }

    setIsSearching(true)
    setSearchError('')
    setSelectedTripId('')

    try {
      const payload = await searchTrips({
        tripType: form.tripType,
        from: form.from.code,
        to: form.to.code,
        departureDate: formatDateForApi(form.departureDate),
        returnDate: form.returnDate ? formatDateForApi(form.returnDate) : '',
        passengers: Number(form.passengers),
      })

      setTripResults(payload)
      return true
    } catch (error) {
      setSearchError(error.message)
      setTripResults(null)
      return false
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <SearchPage
            form={form}
            onFieldChange={handleFieldChange}
            onSearch={handleSearch}
            isSearching={isSearching}
            searchError={searchError}
          />
        }
      />
      <Route
        path="/results"
        element={
          <ResultsPage
            form={form}
            tripResults={tripResults}
            isSearching={isSearching}
            sortMode={sortMode}
            onSortModeChange={setSortMode}
            selectedTripId={selectedTripId}
            onSelectTrip={setSelectedTripId}
          />
        }
      />
      <Route
        path="/checkout/:tripId"
        element={
          <CheckoutPage
            tripResults={tripResults}
            form={form}
            selectedTripId={selectedTripId}
            onSelectTrip={setSelectedTripId}
          />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
