'use client'
import Link from 'next/link';
import TextChunkComponent from '@/components/textchunk/TextChunkComponent';

// Import the styles
import styles from "./styles.module.css";

export default function ChunkVizPage() {
    return (
        <div className={styles.root}>
            <TextChunkComponent></TextChunkComponent>
        </div>
    )
}