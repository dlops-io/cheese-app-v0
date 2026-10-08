'use client'

import React from 'react';
import Link from 'next/link';
import ArchitectureDiagram from '@/components/architecture/ArchitectureDiagram';

const STEPS = [
    { href: '/chunkviz', title: 'Text Chunking', description: 'See how different splitters and chunk sizes break the cheese books into chunks.' },
    { href: '/chromaui', title: 'Vector DB', description: 'Connect to ChromaDB and browse the collections and embedded chunks.' },
    { href: '/chat', title: 'Chat', description: 'Ask questions answered by an LLM using chunks retrieved from the vector DB (RAG).' },
    { href: '/agent', title: 'Cheese Expert Agent', description: 'An agent that picks its own search tool and adds a fun fact from Pavlos.' },
    { href: '/finetunechat', title: 'Pavlos Cheese Model', description: 'The same RAG flow, answered by a fine-tuned model.' },
];

export default function HomePage() {
    return (
        <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
            <div className="mx-auto max-w-5xl px-4 py-12">
                <h1 className="text-2xl font-semibold tracking-tight text-gray-900">LLM + RAG Demo</h1>
                <p className="mt-2 text-gray-600">Walk through each step of building a retrieval-augmented cheese expert.</p>
                <div className="mt-8 grid gap-4 tablet:grid-cols-2">
                    {STEPS.map((step, index) => (
                        <Link
                            key={step.href}
                            href={step.href}
                            className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-xs transition hover:border-gray-300 hover:shadow-md"
                        >
                            <div className="flex items-center gap-3">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-sm font-semibold text-gray-700">{index + 1}</span>
                                <h2 className="font-semibold text-gray-900 group-hover:text-blue-700">{step.title}</h2>
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-gray-600">{step.description}</p>
                        </Link>
                    ))}
                </div>

                <section className="mt-14">
                    <h2 className="text-xl font-semibold tracking-tight text-gray-900">How does it work?</h2>
                    <p className="mt-2 max-w-3xl text-gray-600">
                        The <a href="https://github.com/dlops-io/llm-rag" target="_blank" rel="noreferrer" className="font-medium text-blue-600 underline-offset-2 hover:underline">llm-rag CLI</a> chunks,
                        embeds and loads the books into ChromaDB on your laptop. This web app, hosted on Google Cloud, ties it all together:
                        it reads from your local vector DB and uses Gemini on Vertex AI to answer questions. Pick a scenario to follow the data.
                    </p>
                    <div className="mt-6">
                        <ArchitectureDiagram />
                    </div>
                </section>
            </div>
        </div>
    )
}
