import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { useLocalStorage } from '@mantine/hooks';
import { IconArrowUp, IconBook2, IconChevronDown } from '@tabler/icons-react';
import { uuid } from "../../services/Common";
import DataService from "../../services/DataService";

const SUGGESTIONS = [
    "How is cheese made?",
    "What makes a cheese melt well?",
    "How long should cheddar be aged?",
];

// Text of a hast node's first child, used to spot the "Pavlos' fun fact" paragraph
const firstStrongText = (node) => {
    const first = node?.children?.[0];
    if (first?.tagName !== 'strong') return '';
    return first.children?.map((c) => c.value || '').join('') || '';
};

const markdownComponents = {
    p: ({ node, ...props }) => {
        if (firstStrongText(node).startsWith("Pavlos")) {
            return <p className="mt-3 mb-0 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900" {...props} />;
        }
        return <p className="mb-3 last:mb-0" {...props} />;
    },
    ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-3 space-y-1.5 marker:text-gray-400" {...props} />,
    ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-3 space-y-1.5 marker:text-gray-400" {...props} />,
    strong: ({ node, ...props }) => <strong className="font-semibold text-gray-900" {...props} />,
    h1: ({ node, ...props }) => <h3 className="font-semibold text-base mt-2 mb-2" {...props} />,
    h2: ({ node, ...props }) => <h3 className="font-semibold text-base mt-2 mb-2" {...props} />,
    h3: ({ node, ...props }) => <h3 className="font-semibold mt-2 mb-1" {...props} />,
    a: ({ node, ...props }) => <a className="text-blue-600 underline underline-offset-2" target="_blank" rel="noreferrer" {...props} />,
    code: ({ node, ...props }) => <code className="rounded bg-gray-100 px-1 py-0.5 text-[0.9em]" {...props} />,
    blockquote: ({ node, ...props }) => <blockquote className="border-l-2 border-gray-300 pl-3 text-gray-600" {...props} />,
};

// Turn a ChromaDB query response into a list of { text, metadata, distance }
const buildReferences = (data) =>
    (data?.documents?.[0] || []).map((text, i) => ({
        text,
        metadata: data.metadatas?.[0]?.[i] || {},
        distance: data.distances?.[0]?.[i],
    }));

const ReferenceItem = ({ reference, index }) => {
    const [expanded, setExpanded] = useState(false);
    const { book, author } = reference.metadata;
    return (
        <li className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
            <div className="flex items-center gap-2 text-xs">
                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-md bg-white px-1 font-semibold text-gray-700 ring-1 ring-gray-200">{index + 1}</span>
                <span className="truncate font-medium text-gray-800" title={book}>{book || 'Unknown source'}</span>
                {author && <span className="hidden shrink-0 text-gray-500 tablet:inline">· {author}</span>}
                {reference.distance !== undefined && (
                    <span className="ml-auto shrink-0 font-mono text-[11px] text-gray-500" title="Vector distance to the query (lower = more similar)">
                        dist {reference.distance.toFixed(3)}
                    </span>
                )}
            </div>
            <p className={`mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-gray-600 ${expanded ? '' : 'line-clamp-3'}`}>
                {reference.text}
            </p>
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="mt-1 text-xs font-medium text-blue-600 hover:text-blue-700"
            >
                {expanded ? 'Show less' : 'Show full chunk'}
            </button>
        </li>
    );
};

const References = ({ references }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="mt-4 border-t border-gray-100 pt-3">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex w-full items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                aria-expanded={open}
            >
                <IconBook2 size={16} stroke={1.75} className="text-gray-400" />
                <span className="font-medium">References</span>
                <span className="rounded-pill bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {references.length} {references.length === 1 ? 'chunk' : 'chunks'}
                </span>
                <IconChevronDown size={16} className={`ml-auto text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <ol className="mt-3 space-y-2">
                    {references.map((reference, index) => (
                        <ReferenceItem key={index} reference={reference} index={index} />
                    ))}
                </ol>
            )}
        </div>
    );
};

const BotAvatar = () => (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-base shadow-sm">
        🧀
    </div>
);

const ChatMessage = ({ message, isUser, isError, references }) => {
    if (isUser) {
        return (
            <div className="flex justify-end">
                <div className="max-w-[75%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-blue-600 px-4 py-2.5 text-[15px] leading-relaxed text-white shadow-sm">
                    {message}
                </div>
            </div>
        );
    }
    return (
        <div className="flex items-start gap-3">
            <BotAvatar />
            <div className={`max-w-[85%] rounded-2xl rounded-tl-md border px-4 py-3 text-[15px] leading-relaxed shadow-sm ${isError
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-gray-200 bg-white text-gray-800'
                }`}>
                <ReactMarkdown components={markdownComponents}>{message}</ReactMarkdown>
                {references?.length > 0 && <References references={references} />}
            </div>
        </div>
    );
};

const TypingIndicator = () => (
    <div className="flex items-start gap-3">
        <BotAvatar />
        <div className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-gray-200 bg-white px-4 py-4 shadow-sm">
            {[0, 150, 300].map((delay) => (
                <span key={delay} className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: `${delay}ms` }} />
            ))}
        </div>
    </div>
);

const ChatComponent = ({ agent, finetuned, title = 'Chat' }) => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState(uuid());
    const [url, setURL] = useLocalStorage({ key: 'url' });
    const [tenant, setTenant] = useLocalStorage({ key: 'tenant' });
    const [dbname, setDbName] = useLocalStorage({ key: 'dbname' });
    const [collections, setCollections] = useState([]);
    const [selectedCollection, setSelectedCollection] = useState('');
    const bottomRef = useRef(null);

    const isConnected = !!(url && tenant && dbname);
    const modeLabel = agent ? 'Agent' : finetuned ? 'Fine-tuned model' : 'RAG';

    // RAG / fine-tuned: embed the query, retrieve chunks, then ask the LLM
    const getRagResponse = async (query) => {
        const embeddingResponse = await DataService.GenerateEmbeddings(query);
        const chunksResponse = await DataService.RetrieveChunks(url, selectedCollection, embeddingResponse.data["embedding"], tenant, dbname);
        const chat_data = {
            "session_id": sessionId,
            "prompt": query + '\n' + chunksResponse.data["documents"][0].join('\n')
        };
        const response = finetuned
            ? await DataService.ChatWithFinetunedLLM(chat_data)
            : await DataService.ChatWithLLM(chat_data);
        return { answer: response.data["response"], references: buildReferences(chunksResponse.data) };
    };

    // Agent: LLM picks a retrieval tool, we run it against ChromaDB, then the LLM answers
    const getAgentResponse = async (query) => {
        const agentCall = await DataService.GetAgentCall(query);
        const agent_response = agentCall.data["response"][0];
        const function_name = agent_response.function_name;

        let chunksResponse;
        if (function_name == "get_book_by_author") {
            chunksResponse = await DataService.RetrieveBookChunks(url, selectedCollection, agent_response.args["search_content"], agent_response.args["author"], tenant, dbname);
        } else if (function_name == "get_book_by_search_content") {
            chunksResponse = await DataService.RetrieveChunks(url, selectedCollection, agent_response.args["search_content"], tenant, dbname);
        } else {
            throw new Error(`The agent chose an unsupported tool: ${function_name}`);
        }

        const chat_data = {
            "session_id": sessionId,
            "query": query,
            "function_name": function_name,
            "chunks": chunksResponse.data["documents"][0].join('\n')
        };
        const response = await DataService.ChatWithLLMAgent(chat_data);
        return { answer: response.data["response"], references: buildReferences(chunksResponse.data) };
    };

    const sendMessage = async (text) => {
        const query = text.trim();
        if (!query || isLoading || !isConnected) return;

        setMessages(prevMessages => [...prevMessages, { text: query, isUser: true }]);
        setInputMessage('');
        setIsLoading(true);
        try {
            const { answer, references } = agent ? await getAgentResponse(query) : await getRagResponse(query);
            setMessages(prevMessages => [...prevMessages, { text: answer, isUser: false, references }]);
        } catch (error) {
            console.error(error);
            const detail = error.response?.data?.detail || error.response?.data?.error || error.message;
            setMessages(prevMessages => [...prevMessages, { text: `Sorry, something went wrong: ${detail}`, isUser: false, isError: true }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        sendMessage(inputMessage);
    };

    useEffect(() => {
        if (url && tenant && dbname) {
            DataService.RetrieveCollections(url, tenant, dbname)
                .then(function (response) {
                    setCollections(response.data);
                    if (response.data.length > 0) {
                        setSelectedCollection(response.data[0].id);
                    }
                })
                .catch((error) => console.error(error));
        }

    }, [url, tenant, dbname])

    // Keep the latest message in view
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages, isLoading]);

    return (
        <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-gray-50 laptop:h-[calc(100vh-4rem)]">
            {/* Toolbar: title + mode, collection picker */}
            <div className="border-b border-gray-200 bg-white">
                <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <h1 className="text-base font-semibold text-gray-900">{title}</h1>
                        <span className="rounded-pill bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{modeLabel}</span>
                    </div>
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-gray-500">Collection</span>
                        {collections.map((collection) => (
                            <button
                                key={collection.id}
                                type="button"
                                onClick={() => setSelectedCollection(collection.id)}
                                className={`rounded-pill border px-3 py-1 text-xs font-medium transition-colors ${selectedCollection === collection.id
                                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                {collection.name}
                            </button>
                        ))}
                        {isConnected && collections.length === 0 && (
                            <span className="text-xs text-gray-400">None found</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
                    {!isConnected && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            Not connected to a vector database. Open <Link href="/chromaui" className="font-semibold underline underline-offset-2">Vector DB</Link> and connect first.
                        </div>
                    )}

                    {isConnected && messages.length === 0 && (
                        <div className="flex flex-col items-center pt-16 text-center">
                            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-200 bg-white text-3xl shadow-sm">🧀</div>
                            <h2 className="text-xl font-semibold text-gray-900">Ask the cheese expert</h2>
                            <p className="mt-1 max-w-md text-sm text-gray-500">
                                {agent
                                    ? 'The agent picks a search tool, retrieves passages from the cheese books, and adds a fun fact from Pavlos.'
                                    : 'Answers are grounded in passages retrieved from the cheese books.'}
                            </p>
                            <div className="mt-6 flex flex-wrap justify-center gap-2">
                                {SUGGESTIONS.map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        type="button"
                                        onClick={() => sendMessage(suggestion)}
                                        className="rounded-pill border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-xs transition-colors hover:border-gray-300 hover:bg-gray-50"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((message, index) => (
                        <ChatMessage key={index} message={message.text} isUser={message.isUser} isError={message.isError} references={message.references} />
                    ))}
                    {isLoading && <TypingIndicator />}
                    <div ref={bottomRef} />
                </div>
            </div>

            {/* Composer */}
            <div className="border-t border-gray-200 bg-white">
                <form onSubmit={handleSendMessage} className="mx-auto max-w-3xl px-4 py-3">
                    <div className="flex items-center gap-2 rounded-2xl border border-gray-300 bg-white py-1.5 pl-4 pr-1.5 shadow-sm transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                        <input
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            className="flex-1 bg-transparent py-1.5 text-[15px] text-gray-800 placeholder:text-gray-400 focus:outline-none"
                            placeholder={isConnected ? "Ask a cheese question..." : "Connect to the vector DB to start chatting"}
                            disabled={!isConnected}
                        />
                        <button
                            type="submit"
                            aria-label="Send"
                            disabled={!inputMessage.trim() || isLoading || !isConnected}
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                        >
                            <IconArrowUp size={18} stroke={2.25} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChatComponent;
