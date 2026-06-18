import { useState } from 'react'

function CaretIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m5 7 5 6 5-6" />
    </svg>
  )
}

function SelectOption({ option, selected, onSelect }) {
  return (
    <li>
      <button
        type="button"
        className={`search-result-button${selected ? ' selected' : ''}`}
        onClick={() => onSelect(option.value)}
        onMouseDown={(event) => {
          event.preventDefault()
        }}
      >
        <div>
          <span>{option.label}</span>
        </div>
      </button>
    </li>
  )
}

function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  placeholder = 'Select',
  panelClassName = '',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedOption = options.find((option) => option.value === value)

  function closeOptions() {
    setIsOpen(false)
  }

  function handleBlur(event) {
    if (event.currentTarget.contains(event.relatedTarget)) {
      return
    }

    closeOptions()
  }

  return (
    <div className="field">
      <label htmlFor={id}>
        <span>{label}</span>
      </label>
      <div className="airport-search-shell" onBlur={handleBlur}>
        <button
          id={id}
          type="button"
          className={`search-input select-trigger${isOpen ? ' open' : ''}`}
          onClick={() => setIsOpen((current) => !current)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              closeOptions()
            }
          }}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span>{selectedOption?.label ?? placeholder}</span>
          <span className="select-caret">
            <CaretIcon />
          </span>
        </button>

        {isOpen && (
          <div className={`search-results-panel ${panelClassName}`.trim()}>
            <ul className="search-results-list" role="listbox">
              {options.map((option) => (
                <SelectOption
                  key={`${id}-${option.value}`}
                  option={option}
                  selected={option.value === value}
                  onSelect={(nextValue) => {
                    onChange(nextValue)
                    closeOptions()
                  }}
                />
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default SelectField
