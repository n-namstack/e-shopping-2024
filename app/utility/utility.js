import React from 'react';
import * as ImagePicker from 'expo-image-picker';

// Currency format function
function currencyFormat(num) {
  return 'N$' + num.toFixed(2).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
}

function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

function convertText(input) {
  return input.toLowerCase().replace(/\s+/g, '-');
}

export { currencyFormat, isMobileDevice, convertText };
