'use client'

import React from 'react';
import Link from 'next/link'
import { usePathname } from 'next/navigation';
import classNames from 'classnames';

// Import the styles
import styles from "./styles.module.css";

const NAV_ITEMS = [
    { href: '/chunkviz', label: 'Text Chunking' },
    { href: '/chromaui', label: 'Vector DB' },
    { href: '/chat', label: 'Chat' },
    { href: '/agent', label: 'Cheese Expert Agent' },
    { href: '/finetunechat', label: 'Pavlos Cheese Model' },
];

export default function Header() {
    const pathname = usePathname();

    return (
        <header
            className={classNames(
                'sticky top-0 z-header flex h-14 items-center gap-4 px-4 shadow-md tablet:px-6 laptop:h-16',
                styles.header
            )}
        >
            <Link href="/" className="flex shrink-0 items-center gap-3 text-white">
                <img src='/logo.png' alt="Logo" className="h-8 w-8 rounded-md object-cover" />
                <span className="text-lg font-semibold tracking-tight">AC215: LLM + RAG</span>
            </Link>
            <nav className="ml-auto flex items-center gap-1 overflow-x-auto">
                {NAV_ITEMS.map(({ href, label }) => {
                    const isActive = pathname === href || pathname?.startsWith(href + '/');
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={classNames(
                                'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-white hover:bg-white/[0.12]'
                            )}
                        >
                            {label}
                        </Link>
                    );
                })}
            </nav>
        </header>
    );
}
