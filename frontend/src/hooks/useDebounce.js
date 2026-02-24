import { useState, useEffect } from 'react';

/**
 * useDebounce - Returns a debounced copy of the value.
 * The debounced value only updates after the specified delay (ms) has passed
 * without the value changing. Clears the timer on component unmount to prevent
 * memory leaks.
 *
 * @param {*} value - The value to debounce
 * @param {number} delay - Delay in milliseconds (default: 300)
 * @returns {*} The debounced value
 */
const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Instantly clear debounce when the value is empty (better UX: instant reset)
    if (value === '' || value === null || value === undefined) {
      setDebouncedValue(value);
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: cancel previous timer on value change or unmount
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;
