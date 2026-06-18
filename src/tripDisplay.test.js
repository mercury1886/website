import { describe, expect, it } from 'vitest'
import {
  buildAirlineOptions,
  buildStopOptions,
  filterTrips,
  pickMetricTrip,
  sortTrips,
  stopCountLabel,
} from './tripDisplay'

const trips = [
  {
    id: 'best-trip',
    total_price: 420,
    total_duration_minutes: 320,
    score: 510,
    stop_count: 1,
    segments: [
      {
        carriers: [
          { code: 'AC', name: 'Air Canada' },
          { code: 'WS', name: 'WestJet' },
        ],
        baggage_summary: {
          carry_on: { status: 'included' },
          checked_bag: { status: 'included' },
        },
        legs: [
          { airline_code: 'AC' },
          { airline_code: 'WS' },
        ],
      },
    ],
  },
  {
    id: 'cheap-trip',
    total_price: 340,
    total_duration_minutes: 410,
    score: 560,
    stop_count: 0,
    segments: [
      {
        carriers: [
          { code: 'AC', name: 'Air Canada' },
        ],
        baggage_summary: {
          carry_on: { status: 'included' },
          checked_bag: { status: 'not_available' },
        },
        legs: [
          { airline_code: 'AC' },
        ],
      },
    ],
  },
  {
    id: 'fast-trip',
    total_price: 515,
    total_duration_minutes: 260,
    score: 590,
    stop_count: 2,
    segments: [
      {
        carriers: [
          { code: 'DL', name: 'Delta Air Lines' },
        ],
        baggage_summary: {
          carry_on: { status: 'not_available' },
          checked_bag: { status: 'included' },
        },
        legs: [
          { airline_code: 'DL' },
        ],
      },
    ],
  },
]

describe('tripDisplay helpers', () => {
  it('sorts trips by the selected mode', () => {
    expect(sortTrips(trips, 'best').map((trip) => trip.id)).toEqual([
      'best-trip',
      'cheap-trip',
      'fast-trip',
    ])

    expect(sortTrips(trips, 'cheapest').map((trip) => trip.id)).toEqual([
      'cheap-trip',
      'best-trip',
      'fast-trip',
    ])

    expect(sortTrips(trips, 'fastest').map((trip) => trip.id)).toEqual([
      'fast-trip',
      'best-trip',
      'cheap-trip',
    ])
  })

  it('picks the leading trip for a metric and returns null for an empty set', () => {
    expect(pickMetricTrip(trips, 'best')?.id).toBe('best-trip')
    expect(pickMetricTrip([], 'best')).toBeNull()
  })

  it('builds unique stop filters in ascending order', () => {
    expect(buildStopOptions(trips)).toEqual([0, 1, 2])
  })

  it('builds unique airline filters in code order', () => {
    expect(buildAirlineOptions(trips)).toEqual([
      { code: 'AC', name: 'Air Canada' },
      { code: 'DL', name: 'Delta Air Lines' },
      { code: 'WS', name: 'WestJet' },
    ])
  })

  it('filters by price, stop count, and baggage requirements', () => {
    expect(
      filterTrips(trips, {
        maxPrice: 430,
        preferredAirline: '',
        stopCounts: [0, 1],
        requireCarryOnIncluded: false,
        requireCheckedBagIncluded: false,
      }).map((trip) => trip.id),
    ).toEqual(['best-trip', 'cheap-trip'])

    expect(
      filterTrips(trips, {
        maxPrice: 600,
        preferredAirline: '',
        stopCounts: [],
        requireCarryOnIncluded: true,
        requireCheckedBagIncluded: true,
      }).map((trip) => trip.id),
    ).toEqual(['best-trip'])

    expect(
      filterTrips(trips, {
        maxPrice: 600,
        preferredAirline: 'AC',
        stopCounts: [],
        requireCarryOnIncluded: false,
        requireCheckedBagIncluded: false,
      }).map((trip) => trip.id),
    ).toEqual(['cheap-trip'])
  })

  it('formats stop labels cleanly', () => {
    expect(stopCountLabel(0)).toBe('Direct')
    expect(stopCountLabel(1)).toBe('1 stop')
    expect(stopCountLabel(2)).toBe('2 stops')
  })
})
