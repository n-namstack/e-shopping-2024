import React from 'react';

// Currency format function
function currencyFormat(num) {
  return 'N$' + num.toFixed(2).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
}

function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

export { currencyFormat,isMobileDevice};
