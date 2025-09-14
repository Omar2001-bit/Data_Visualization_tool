import React from 'react';

interface CurrencyInputProps {
  currency: string;
  onCurrencyChange: (currency: string) => void;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  currency,
  onCurrencyChange
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Currency
      </label>
      <input
        type="text"
        value={currency}
        onChange={(e) => onCurrencyChange(e.target.value)}
        placeholder="e.g., SAR, USD, EUR, ₹, £, etc."
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <p className="text-xs text-gray-500 mt-1">
        Enter any currency symbol or code (e.g., SAR, $, €, ₹)
      </p>
    </div>
  );
};