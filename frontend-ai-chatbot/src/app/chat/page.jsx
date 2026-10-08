'use client'
import Link from 'next/link';
import ChatComponent from '@/components/chat/ChatComponent';

// Import the styles
import styles from "./styles.module.css";

export default function ChatPage() {
    return (
        <main className="flex flex-col min-h-screen">
            <div><p className='py-2 font-bold'>LLM + RAG Chat</p></div>
            <ChatComponent />
        </main>
    )
}