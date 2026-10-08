'use client'

import React, { useContext } from 'react';
import Link from 'next/link';


// Import the styles
import styles from "./styles.module.css";

export default function HomePage() {
    return (
        <div className={styles.root}>
            <h1 className="text-3xl font-bold"></h1>
        </div>
    )
}