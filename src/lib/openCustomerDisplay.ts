/**
 * Opens the customer facing screen in a dedicated popup window.
 * Keep this as a tiny utility so UI components can call it from click handlers.
 */
export function openCustomerDisplay(): Window | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const url = new URL('/customer-display', window.location.origin);
  const features = [
    'popup=yes',
    'width=1920',
    'height=1080',
    'left=120',
    'top=80',
    'resizable=yes',
    'scrollbars=no',
  ].join(',');

  const childWindow = window.open(url.toString(), 'green-mood-customer-display', features);
  if (childWindow) {
    childWindow.focus();
  }

  return childWindow;
}
