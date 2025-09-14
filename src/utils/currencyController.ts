// Enhanced formatter that works with any unit string
export const formatCurrency = (value: number, unit: string): string => {
  // Handle percentage
  if (unit === '%') {
    return `${value.toLocaleString()}%`;
  }
  
  // Format number with commas
  const formattedNumber = value.toLocaleString();
  
  // If unit looks like a currency symbol (single character or common symbols), put it before the number
  const currencySymbols = ['$', '€', '£', '¥', '₹', '₽', '₩', '₪', '₦', '₡', '₨'];
  const isSymbol = unit.length === 1 || currencySymbols.includes(unit);
  
  // For SAR specifically or if it looks like a code/unit, put it after
  if (unit.toUpperCase() === 'SAR' || unit.includes('ر.س') || (!isSymbol && unit.length > 1)) {
    return `${formattedNumber} ${unit}`;
  }
  
  // For symbols, put before the number
  return `${unit}${formattedNumber}`;
};