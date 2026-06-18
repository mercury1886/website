function BaggageIcon({ type }) {
  if (type === 'carry_on') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 7V6a3 3 0 0 1 6 0v1h2.5A2.5 2.5 0 0 1 20 9.5v7A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-7A2.5 2.5 0 0 1 6.5 7H9Zm2 0h2V6a1 1 0 1 0-2 0v1Z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 5.5V5a3 3 0 0 1 6 0v.5h1.5A2.5 2.5 0 0 1 19 8v10.5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 18.5V8a2.5 2.5 0 0 1 2.5-2.5H9Zm2 0h2V5a1 1 0 1 0-2 0v.5Z" />
      <path d="M8 10h8M8 13h8" />
    </svg>
  )
}

export default function BaggageStat({
  type,
  count,
  title = '',
  className = 'baggage-stat',
  iconClassName = 'baggage-stat-icon',
}) {
  return (
    <span className={className} title={title}>
      <span className={iconClassName}>
        <BaggageIcon type={type} />
      </span>
      <strong>{count}</strong>
    </span>
  )
}
