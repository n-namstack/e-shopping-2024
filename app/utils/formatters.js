// Format order ID to a shorter, more readable format
export const formatOrderNumber = (orderId) => {
  if (!orderId) return 'N/A';
  // Take the first 8 characters of the UUID and convert to uppercase
  return `ORD-${orderId.substring(0, 8).toUpperCase()}`;
};

// Format currency with Namibian Dollar symbol
export const formatCurrency = (amount) => {
  if (!amount) return 'N$0.00';
  return `N$${parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
};

// Format date to readable format
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}; 