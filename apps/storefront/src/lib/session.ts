'use client';

import { useSyncExternalStore } from 'react';

import { cartItemCount } from '@/lib/cart.ts';
import { shopperApi } from '@/lib/shopper-api.ts';

// Who is shopping, shared by every client component without a provider: a tiny store that asks the API once per page
// load (`auth.me`, then the cart for the badge) and is updated by demo login, logout and cart changes.
export interface Session {
  status: 'loading' | 'guest' | 'shopper';
  name: string;
  cartCount: number;
}

const GUEST: Session = { status: 'guest', name: '', cartCount: 0 };
const LOADING: Session = { ...GUEST, status: 'loading' };
let session = LOADING;
let started = false;
const listeners = new Set<() => void>();

function set(next: Partial<Session>) {
  session = { ...session, ...next };
  listeners.forEach((listener) => listener());
}

// Re-reads the cart count (after an add, a remove or an order).
export async function refreshCart(): Promise<void> {
  const cart = await shopperApi.cart.detail().catch(() => null);
  set({ cartCount: cart ? cartItemCount(cart) : 0 });
}

async function load() {
  const profile = await shopperApi.auth.me().catch(() => null);
  if (!profile) return set(GUEST);
  set({ status: 'shopper', name: profile.fullName });
  await refreshCart();
}

// AGENTS.md §6: the demo has no signup; one click signs into the seeded demo shopper.
export async function demoLogin(): Promise<void> {
  const profile = await shopperApi.auth.demoLogin();
  set({ status: 'shopper', name: profile.fullName });
  await refreshCart();
}

export async function logout(): Promise<void> {
  await shopperApi.auth.logout({}).catch(() => undefined);
  set(GUEST);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started) {
    started = true;
    void load();
  }
  return () => {
    listeners.delete(listener);
  };
}

export function useSession(): Session {
  return useSyncExternalStore(
    subscribe,
    () => session,
    () => LOADING,
  );
}
