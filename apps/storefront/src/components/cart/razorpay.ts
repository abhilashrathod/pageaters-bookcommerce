'use client';

// Razorpay Checkout (test mode in the demo). Only the public key id the API hands out reaches the browser; the API
// confirms the payment through Razorpay's webhook, so `onDismiss`/`onPaid` only move the shopper along.
const SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

interface RazorpayOptions {
  key: string;
  order_id: string;
  name: string;
  description: string;
  currency: 'INR';
  handler: () => void;
  modal: { ondismiss: () => void };
}
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load the payment window. Please try again.'));
    document.body.appendChild(script);
  });
}

export async function openRazorpay({ key, orderId, onPaid, onDismiss }: { key: string; orderId: string; onPaid: () => void; onDismiss: () => void }) {
  await loadScript();
  if (!window.Razorpay) throw new Error('Could not load the payment window. Please try again.');
  new window.Razorpay({
    key,
    order_id: orderId,
    name: 'Pageaters',
    description: 'Demo order: test mode, no real money',
    currency: 'INR',
    handler: onPaid,
    modal: { ondismiss: onDismiss },
  }).open();
}
