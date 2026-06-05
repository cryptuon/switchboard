/**
 * Main Layout Component
 */

import React from 'react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import clsx from 'clsx';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/' },
  { name: 'Deployments', href: '/deployments' },
  { name: 'Chains', href: '/chains' },
  { name: 'Transactions', href: '/transactions' },
  { name: 'Billing', href: '/billing' },
  { name: 'Settings', href: '/settings' },
];

export default function Layout({ children }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-white shadow-sm">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">Switchboard</h1>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="sr-only">Open main menu</span>
            {mobileMenuOpen ? (
              <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
            ) : (
              <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center justify-center h-16 bg-primary-600">
              <h1 className="text-2xl font-bold text-white">Switchboard</h1>
            </div>

            {/* Navigation */}
            <nav className="mt-8 flex-1">
              <div className="px-4 space-y-2">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={clsx(
                      'block px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                      router.pathname === item.href
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </nav>

            {/* Status indicator */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="ml-3 text-sm font-medium text-gray-500">
                  System Online
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Overlay for mobile */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Main content */}
        <div className="flex-1 lg:ml-0">
          <main className="py-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}