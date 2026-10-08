'use client'

import React, { useContext, useCallback } from 'react';
import Link from 'next/link'
import classNames from 'classnames';
import HeaderLogo from './HeaderLogo';

// Import the styles
import styles from "./styles.module.css";

export default function Header() {

    console.log("Header....")

    return (
        <header
            className={classNames(
                'sticky top-0 z-header flex h-14 flex-row content-center items-center justify-center gap-3 border-b border-border-subtlest-tertiary px-4 py-3 tablet:px-8 laptop:left-0 laptop:h-16 laptop:w-full laptop:px-4 laptopL:grid laptopL:auto-cols-fr laptopL:grid-flow-col',
                styles.header
            )}
        >
            <div
                className={classNames(
                    'flex flex-1  laptop:flex-none laptop:justify-start'
                )}
            >
                <h1 className="flex items-center text-xl font-semibold text-white tracking-tight p-4">
                    <img src='logo.png' alt="Logo" className="h-8 md:h-10 lg:h-12 mr-3" />
                    AC215: LLM + RAG
                </h1>

            </div>
            <nav className="flex items-center space-x-4">
                <Link href="/chunkviz" className="font-bold text-white hover:text-gray-300 transition-colors">
                    Text Chunking
                </Link>
                <div className={styles.menuSeparator}></div>
                <Link href="/chromaui" className="font-bold text-white hover:text-gray-300 transition-colors">
                    Vector DB
                </Link>
                <div className={styles.menuSeparator}></div>
                <Link href="/chat" className="font-bold text-white hover:text-gray-300 transition-colors">
                    Chat
                </Link>
                <div className={styles.menuSeparator}></div>
                <Link href="/agent" className="font-bold text-white hover:text-gray-300 transition-colors">
                    Cheese Expert Agent
                </Link>
                <div className={styles.menuSeparator}></div>
                <Link href="/finetunechat" className="font-bold text-white hover:text-gray-300 transition-colors">
                    Pavlos Cheese Model
                </Link>
            </nav>
        </header>
    );
}