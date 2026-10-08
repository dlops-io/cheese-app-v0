'use client'
import Link from 'next/link';
import ChatComponent from '@/components/chat/ChatComponent';

// Import the styles
import styles from "./styles.module.css";

export default function ChatPage() {
    return (
        <main className="flex flex-col">
            <ChatComponent title="LLM + RAG Chat" />
        </main>
    )
}