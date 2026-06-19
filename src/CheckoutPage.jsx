import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import BaggageBadge from './BaggageStat'
import { baggageCount } from './baggage'
import { formatCurrency } from './tripDisplay'

const checkoutSteps = [
  { step: 1, label: 'Trip review' },
  { step: 2, label: 'Checkout' },
  { step: 3, label: 'Booked' },
]

function BaggageStat({ type, offer }) {
  return (
    <BaggageBadge
      type={type}
      count={baggageCount(offer)}
      className="review-baggage-stat"
      iconClassName="review-baggage-icon"
    />
  )
}

function roundAmount(value) {
  return Math.round(value * 100) / 100
}

function travelerLabel(passengers) {
  return `${passengers} traveler${passengers === 1 ? '' : 's'}`
}

function createTraveler() {
  return {
    firstName: '',
    lastName: '',
    passportNumber: '',
  }
}

function createTravelers(passengers) {
  return Array.from({ length: passengers }, () => createTraveler())
}

function createCheckoutDetails(passengers) {
  return {
    travelers: createTravelers(passengers),
    email: '',
    phone: '',
    cardholder: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
  }
}

function checkoutFeeLines(trip, passengers) {
  return [
    {
      id: 'carrier',
      label: 'Carrier surcharge',
      price: roundAmount(Math.max(18, trip.total_price * 0.032)),
    },
    {
      id: 'airport',
      label: 'Airport recovery fee',
      price: roundAmount(
        8 + trip.segments.length * 5.5 + trip.stop_count * 3.25
      ),
    },
    {
      id: 'service',
      label: 'Booking service fee',
      price: roundAmount(9.5 + passengers * 2.25),
    },
  ]
}

function feeTotal(feeLines) {
  return feeLines.reduce((total, item) => total + item.price, 0)
}

function fareLineLabel(direction) {
  if (direction === 'Outbound') {
    return 'Outbound fare'
  }

  if (direction === 'Return') {
    return 'Inbound fare'
  }

  return `${direction} fare`
}

function tripFareLines(trip) {
  if (trip.segments.length === 1) {
    return [
      {
        id: 'fare-total',
        label: 'Fare total',
        price: trip.total_price,
      },
    ]
  }

  return trip.segments.map((segment) => ({
    id: `${segment.direction.toLowerCase()}-fare`,
    label: fareLineLabel(segment.direction),
    price: segment.segment_total_price,
  }))
}

function stageState(step, currentStage) {
  const order = {
    review: 1,
    checkout: 2,
    processing: 2,
    success: 3,
  }

  if (order[currentStage] > step) {
    return 'done'
  }

  if (order[currentStage] === step) {
    return 'active'
  }

  return 'idle'
}

function checkoutRouteLines(trip) {
  return trip.segments.map((segment) => `${segment.from} to ${segment.to}`)
}

function StageRail({ currentStage }) {
  return (
    <div className="checkout-step-rail">
      {checkoutSteps.map((item) => (
        <div
          key={item.step}
          className={`checkout-step ${stageState(item.step, currentStage)}`}
        >
          <strong>{item.step}</strong>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}

function CheckoutHero({ trip, form, currentStage }) {
  const routeLines = checkoutRouteLines(trip)

  return (
    <section className="checkout-hero">
      <div className="checkout-hero-copy">
        <p className="eyebrow">Checkout</p>
        <h1>{routeLines[0]}</h1>
        {routeLines.slice(1).map((routeLine) => (
          <p key={routeLine} className="checkout-hero-route-line">
            {routeLine}
          </p>
        ))}
        <p className="hero-copy-text">
          Review the selected itinerary, fill in traveler details, and finish
          the booking flow.
        </p>

        <div className="checkout-hero-meta">
          <span>{trip.trip_type === 'one-way' ? 'One-way' : 'Round-trip'}</span>
          <span>{trip.total_duration_display} total travel</span>
          <span>{travelerLabel(Number(form.passengers))}</span>
        </div>
      </div>

      <StageRail currentStage={currentStage} />
    </section>
  )
}

function ReviewLegCard({ leg, passengers }) {
  return (
    <article className="checkout-leg-card">
      <div className="checkout-leg-head">
        <div className="checkout-leg-brand">
          <img
            className="carrier-logo detail"
            src={leg.airline_logo}
            alt={leg.airline_name}
          />
          <div className="checkout-leg-brand-copy">
            <strong>
              {leg.airline_name} ({leg.airline_code}
              {leg.flight_number})
            </strong>
            <span>{leg.aircraft.model}</span>
          </div>
        </div>
        <div className="checkout-leg-head-meta">
          <span className="checkout-leg-price">
            {formatCurrency(leg.price * passengers)}
          </span>
          <div className="review-baggage-row">
            <BaggageStat type="carry_on" offer={leg.baggage.carry_on} />
            <BaggageStat type="checked_bag" offer={leg.baggage.checked_bag} />
          </div>
        </div>
      </div>

      <div className="checkout-leg-route">
        <div>
          <strong>{leg.departure_time_label}</strong>
          <span>
            {leg.departure_airport} {leg.departure_city}
          </span>
        </div>
        <div className="checkout-leg-route-bar">
          <small>{leg.duration_display}</small>
          <div className="checkout-leg-route-line" />
        </div>
        <div>
          <strong>{leg.arrival_time_label}</strong>
          <span>
            {leg.arrival_airport} {leg.arrival_city}
          </span>
        </div>
      </div>
    </article>
  )
}

function ReviewSegment({ segment, passengers }) {
  return (
    <section className="checkout-section-card">
      <div className="checkout-section-heading">
        <div>
          <p className="section-label">{segment.direction}</p>
          <h2>
            {segment.from} to {segment.to}
          </h2>
        </div>
        <div className="checkout-chip-stack">
          <span>{segment.travel_date_label}</span>
          <span>{segment.stop_label}</span>
          <span>{segment.duration_display}</span>
        </div>
      </div>

      <div className="checkout-leg-stack">
        {segment.legs.map((leg) => (
          <ReviewLegCard
            key={`${segment.direction}-${leg.airline_code}${leg.flight_number}`}
            leg={leg}
            passengers={passengers}
          />
        ))}
      </div>
    </section>
  )
}

function ReviewSidebar({ trip, passengers, onContinue }) {
  const fareLines = tripFareLines(trip)

  return (
    <aside className="checkout-sidebar">
      <div className="checkout-total-card">
        <p className="section-label">Trip review</p>
        <h2>{formatCurrency(trip.total_price)}</h2>
        <p className="checkout-total-copy">
          Fare total for {travelerLabel(passengers)} before taxes and service
          fees.
        </p>

        <dl className="checkout-breakdown">
          <div>
            <dt>Trip type</dt>
            <dd>{trip.trip_type === 'one-way' ? 'One-way' : 'Round-trip'}</dd>
          </div>
          <div>
            <dt>Total time</dt>
            <dd>{trip.total_duration_display}</dd>
          </div>
          <div>
            <dt>Stops</dt>
            <dd>{trip.stop_count}</dd>
          </div>
          {fareLines.map((fareLine) => (
            <div key={fareLine.id}>
              <dt>{fareLine.label}</dt>
              <dd>{formatCurrency(fareLine.price)}</dd>
            </div>
          ))}
          <div className="strong">
            <dt>Fare total</dt>
            <dd>{formatCurrency(trip.total_price)}</dd>
          </div>
        </dl>

        <button
          type="button"
          className="trip-select-button wide selected"
          onClick={onContinue}
        >
          Continue to checkout
        </button>
      </div>
    </aside>
  )
}

function TravelerCard({ traveler, index, showTitle, onChange }) {
  return (
    <div className="checkout-traveler-card">
      {showTitle && (
        <strong className="checkout-traveler-card-title">
          Traveler {index + 1}
        </strong>
      )}

      <div className="checkout-form-grid">
        <label className="checkout-field">
          <span>Name</span>
          <input
            type="text"
            value={traveler.firstName}
            onChange={(event) =>
              onChange(index, 'firstName', event.target.value)
            }
            placeholder="Alex"
            autoComplete="given-name"
            minLength={2}
            required
          />
        </label>

        <label className="checkout-field">
          <span>Last name</span>
          <input
            type="text"
            value={traveler.lastName}
            onChange={(event) =>
              onChange(index, 'lastName', event.target.value)
            }
            placeholder="Mercer"
            autoComplete="family-name"
            minLength={2}
            required
          />
        </label>

        <label className="checkout-field checkout-field-wide">
          <span>Passport number</span>
          <input
            type="text"
            value={traveler.passportNumber}
            onChange={(event) =>
              onChange(
                index,
                'passportNumber',
                event.target.value.toUpperCase()
              )
            }
            placeholder="A1234567"
            autoComplete="off"
            minLength={6}
            maxLength={15}
            pattern="[A-Z0-9]{6,15}"
            title="Use 6 to 15 letters or numbers."
            required
          />
        </label>
      </div>
    </div>
  )
}

function CheckoutForm({
  details,
  totalDue,
  onTravelerChange,
  onFieldChange,
  onPayNow,
}) {
  return (
    <section className="checkout-section-card">
      <div className="checkout-section-heading">
        <div>
          <p className="section-label">Checkout</p>
          <h2>Traveler and payment details</h2>
        </div>
      </div>

      <div className="checkout-payment-banner">
        <div className="checkout-payment-card">
          <span>Charged today</span>
          <strong>{formatCurrency(totalDue)}</strong>
        </div>
        <div className="checkout-payment-copy">
          <strong>Secure payment step</strong>
          <span>
            All traveler and payment fields below are required to continue.
          </span>
        </div>
      </div>

      <form
        className="checkout-form-stack"
        onSubmit={(event) => {
          event.preventDefault()
          onPayNow()
        }}
      >
        <section className="checkout-form-section">
          <div className="checkout-form-section-heading">
            <p className="section-label">Traveler information</p>
            <h3>Passenger details</h3>
          </div>

          <div className="checkout-traveler-stack">
            {details.travelers.map((traveler, index) => (
              <TravelerCard
                key={`traveler-${index + 1}`}
                traveler={traveler}
                index={index}
                showTitle={details.travelers.length > 1}
                onChange={onTravelerChange}
              />
            ))}
          </div>
        </section>

        <section className="checkout-form-section">
          <div className="checkout-form-section-heading">
            <p className="section-label">Payment</p>
            <h3>Contact and card details</h3>
          </div>

          <div className="checkout-form-grid">
            <label className="checkout-field">
              <span>Email</span>
              <input
                type="email"
                value={details.email}
                onChange={(event) => onFieldChange('email', event.target.value)}
                placeholder="traveler@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="checkout-field">
              <span>Phone</span>
              <input
                type="tel"
                value={details.phone}
                onChange={(event) => onFieldChange('phone', event.target.value)}
                placeholder="+1 514 555 0148"
                autoComplete="tel"
                inputMode="tel"
                pattern="[0-9+()\\-\\s]{10,20}"
                title="Enter a valid phone number."
                required
              />
            </label>

            <label className="checkout-field">
              <span>Cardholder</span>
              <input
                type="text"
                value={details.cardholder}
                onChange={(event) =>
                  onFieldChange('cardholder', event.target.value)
                }
                placeholder="Alex Mercer"
                autoComplete="cc-name"
                minLength={2}
                required
              />
            </label>

            <label className="checkout-field checkout-field-wide">
              <span>Card number</span>
              <input
                type="text"
                value={details.cardNumber}
                onChange={(event) =>
                  onFieldChange('cardNumber', event.target.value)
                }
                placeholder="4242 4242 4242 4242"
                autoComplete="cc-number"
                inputMode="numeric"
                minLength={12}
                maxLength={23}
                pattern="[0-9 ]{12,23}"
                title="Enter a valid card number."
                required
              />
            </label>

            <label className="checkout-field">
              <span>Expiry</span>
              <input
                type="text"
                value={details.expiry}
                onChange={(event) =>
                  onFieldChange('expiry', event.target.value)
                }
                placeholder="08/29"
                autoComplete="cc-exp"
                inputMode="numeric"
                pattern="(0[1-9]|1[0-2])/[0-9]{2}"
                title="Use MM/YY format."
                required
              />
            </label>

            <label className="checkout-field">
              <span>CVV</span>
              <input
                type="text"
                value={details.cvv}
                onChange={(event) => onFieldChange('cvv', event.target.value)}
                placeholder="123"
                autoComplete="cc-csc"
                inputMode="numeric"
                minLength={3}
                maxLength={4}
                pattern="[0-9]{3,4}"
                title="Enter a 3 or 4 digit security code."
                required
              />
            </label>
          </div>
        </section>

        <div className="checkout-pay-row">
          <button type="submit" className="trip-select-button selected">
            Pay now
          </button>
        </div>
      </form>
    </section>
  )
}

function CheckoutSidebar({ trip, passengers, feeLines }) {
  const fareLines = tripFareLines(trip)
  const grandTotal = roundAmount(trip.total_price + feeTotal(feeLines))

  return (
    <aside className="checkout-sidebar">
      <div className="checkout-total-card">
        <p className="section-label">Checkout summary</p>
        <h2>{formatCurrency(grandTotal)}</h2>
        <p className="checkout-total-copy">
          Final amount due for {travelerLabel(passengers)}.
        </p>

        <dl className="checkout-breakdown">
          {fareLines.map((fareLine) => (
            <div key={fareLine.id}>
              <dt>{fareLine.label}</dt>
              <dd>{formatCurrency(fareLine.price)}</dd>
            </div>
          ))}

          <div>
            <dt>Base fare total</dt>
            <dd>{formatCurrency(trip.total_price)}</dd>
          </div>

          {feeLines.map((fee) => (
            <div key={fee.id}>
              <dt>{fee.label}</dt>
              <dd>{formatCurrency(fee.price)}</dd>
            </div>
          ))}

          <div className="strong">
            <dt>Total due</dt>
            <dd>{formatCurrency(grandTotal)}</dd>
          </div>
        </dl>
      </div>
    </aside>
  )
}

function ProcessingScreen() {
  return (
    <main className="page booking-state-page">
      <section className="booking-state-card">
        <div className="booking-loader" />
        <p className="section-label">Finalizing booking</p>
        <h1>Holding your fare...</h1>
        <p className="hero-copy-text">
          We&apos;re processing your trip and preparing the confirmation.
        </p>
      </section>
    </main>
  )
}

function SuccessMark() {
  return (
    <svg className="booking-checkmark" viewBox="0 0 80 80" aria-hidden="true">
      <circle className="booking-checkmark-circle" cx="40" cy="40" r="34" />
      <path className="booking-checkmark-path" d="M24 41 35 52 57 30" />
    </svg>
  )
}

function SuccessScreen() {
  return (
    <main className="page booking-state-page">
      <section className="booking-state-card success">
        <SuccessMark />
        <p className="section-label">Booking complete</p>
        <h1>You are booked, enjoy your flight!</h1>
        <p className="hero-copy-text">
          Your confirmation is locked in and ready.
        </p>
        <Link className="trip-select-button selected" to="/">
          Start another search
        </Link>
      </section>
    </main>
  )
}

function CheckoutPage({ tripResults, form }) {
  const { tripId } = useParams()
  const trips = tripResults?.data ?? []
  const trip = trips.find((item) => item.id === tripId)
  const passengers = Math.max(1, Number(form.passengers) || 1)
  const feeLines = trip ? checkoutFeeLines(trip, passengers) : []
  const totalDue = trip ? roundAmount(trip.total_price + feeTotal(feeLines)) : 0
  const [stage, setStage] = useState('review')
  const [checkoutDetails, setCheckoutDetails] = useState(() =>
    createCheckoutDetails(passengers)
  )

  useEffect(() => {
    if (stage !== 'processing') {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setStage('success')
    }, 2200)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [stage])

  useEffect(() => {
    if (stage !== 'processing' && stage !== 'success') {
      return undefined
    }

    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow

    window.scrollTo(0, 0)
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [stage])

  function updateTraveler(index, field, value) {
    setCheckoutDetails((currentDetails) => ({
      ...currentDetails,
      travelers: currentDetails.travelers.map((traveler, travelerIndex) =>
        travelerIndex === index
          ? {
              ...traveler,
              [field]: value,
            }
          : traveler
      ),
    }))
  }

  function updateCheckoutField(field, value) {
    setCheckoutDetails((currentDetails) => ({
      ...currentDetails,
      [field]: value,
    }))
  }

  if (!tripResults || !trip) {
    return <Navigate to="/results" replace />
  }

  if (stage === 'processing') {
    return <ProcessingScreen />
  }

  if (stage === 'success') {
    return <SuccessScreen />
  }

  return (
    <main className="page checkout-page">
      <CheckoutHero trip={trip} form={form} currentStage={stage} />

      <div className="checkout-layout">
        <div className="checkout-main">
          <div className="checkout-toolbar">
            <Link className="ghost-link" to="/results">
              Back to search
            </Link>
          </div>

          {stage === 'review' ? (
            <>
              {trip.segments.map((segment) => (
                <ReviewSegment
                  key={`${trip.id}-${segment.direction}`}
                  segment={segment}
                  passengers={passengers}
                />
              ))}
            </>
          ) : (
            <CheckoutForm
              details={checkoutDetails}
              totalDue={totalDue}
              onTravelerChange={updateTraveler}
              onFieldChange={updateCheckoutField}
              onPayNow={() => setStage('processing')}
            />
          )}
        </div>

        {stage === 'review' ? (
          <ReviewSidebar
            trip={trip}
            passengers={passengers}
            onContinue={() => setStage('checkout')}
          />
        ) : (
          <CheckoutSidebar
            trip={trip}
            passengers={passengers}
            feeLines={feeLines}
          />
        )}
      </div>
    </main>
  )
}

export default CheckoutPage
