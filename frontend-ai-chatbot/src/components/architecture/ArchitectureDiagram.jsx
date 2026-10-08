'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
    IconRouter, IconBrandReact, IconApi, IconSparkles, IconBrain, IconFlask, IconBucket,
    IconTerminal2, IconDatabase, IconBooks, IconCloud, IconDeviceLaptop, IconServer,
    IconPlayerPlayFilled, IconPlayerPauseFilled, IconPlayerTrackNextFilled, IconPlayerTrackPrevFilled,
    IconArrowRight,
} from '@tabler/icons-react';

// ---------------------------------------------------------------------------
// Diagram geometry (SVG viewBox 1000 x 650)
// ---------------------------------------------------------------------------

const NODES = {
    nginx: { x: 50, y: 168, w: 130, h: 64, title: 'Nginx', sub: 'reverse proxy', icon: IconRouter },
    frontend: { x: 215, y: 95, w: 175, h: 64, title: 'frontend', sub: 'React container', icon: IconBrandReact },
    api: { x: 215, y: 210, w: 175, h: 64, title: 'api-service', sub: 'FastAPI container', icon: IconApi },
    gemini: { x: 450, y: 95, w: 300, h: 64, title: 'Gemini', sub: 'embedding-001 · 3.1-flash-lite', icon: IconSparkles },
    ft: { x: 450, y: 210, w: 140, h: 64, title: 'Fine-tuned', sub: 'Pavlos model', icon: IconBrain },
    tuning: { x: 610, y: 210, w: 140, h: 64, title: 'Tuning job', sub: 'SFT on Gemini', icon: IconFlask },
    bucket: { x: 800, y: 210, w: 170, h: 64, title: 'Cloud Storage', sub: 'fine-tuning dataset', icon: IconBucket },
    browser: { x: 40, y: 440, w: 250, h: 110, title: 'Web app', sub: 'chunk · browse · chat · agent', browser: true },
    cli: { x: 420, y: 400, w: 180, h: 64, title: 'llm-rag CLI', sub: 'chunk · embed · load', icon: IconTerminal2 },
    books: { x: 420, y: 560, w: 180, h: 60, title: 'Cheese books', sub: 'input-datasets/books', icon: IconBooks },
    chroma: { x: 770, y: 450, w: 200, h: 90, title: 'ChromaDB', sub: 'localhost:8000', icon: IconDatabase },
};

// Edge paths are drawn from `from` to `to`; hops can travel them in reverse
const EDGES = {
    browser_nginx: { from: 'browser', to: 'nginx', d: 'M115 440 V232' },
    nginx_frontend: { from: 'nginx', to: 'frontend', d: 'M180 192 H198 V127 H215' },
    nginx_api: { from: 'nginx', to: 'api', d: 'M180 208 H198 V242 H215' },
    api_gemini: { from: 'api', to: 'gemini', d: 'M390 230 H412 V115 H450' },
    api_ft: { from: 'api', to: 'ft', d: 'M390 252 H450' },
    cli_gemini: { from: 'cli', to: 'gemini', d: 'M470 400 V330 H426 V140 H450' },
    cli_chroma: { from: 'cli', to: 'chroma', d: 'M600 432 H870 V450' },
    books_cli: { from: 'books', to: 'cli', d: 'M510 560 V464' },
    browser_chroma: { from: 'browser', to: 'chroma', d: 'M290 495 H770' },
    bucket_tuning: { from: 'bucket', to: 'tuning', d: 'M800 242 H750' },
    tuning_ft: { from: 'tuning', to: 'ft', d: 'M610 242 H590' },
};

const KIND_COLORS = {
    request: '#2563eb',
    response: '#059669',
    data: '#d97706',
    local: '#A41034',
};

// ---------------------------------------------------------------------------
// Scenarios: each hop moves a labelled packet along one or more edges
// ---------------------------------------------------------------------------

const fwd = (id) => [id, 1];
const rev = (id) => [id, -1];
const TO_API = [fwd('browser_nginx'), fwd('nginx_api')];
const FROM_API = [rev('nginx_api'), rev('browser_nginx')];

const SCENARIOS = [
    {
        id: 'build',
        title: 'Build the vector DB',
        where: 'llm-rag CLI · before class',
        tryIt: { href: '/chunkviz', label: 'Explore chunking' },
        hops: [
            { path: [fwd('books_cli')], label: 'books (.txt)', kind: 'data', caption: 'The llm-rag CLI reads the cheese books and splits them into chunks (character, recursive or semantic splitting).' },
            { path: [fwd('cli_gemini')], label: 'text chunks', kind: 'request', caption: 'Each chunk is sent to Gemini on Vertex AI to be embedded.' },
            { path: [rev('cli_gemini')], label: 'vectors · 256-d', kind: 'response', caption: 'gemini-embedding-001 returns a 256-dimension vector for every chunk.' },
            { path: [fwd('cli_chroma')], label: 'chunks + vectors + metadata', kind: 'data', caption: 'Chunks, vectors and metadata (book, author) are loaded into a collection in the ChromaDB running on the laptop.' },
        ],
    },
    {
        id: 'open',
        title: 'Open the web app',
        where: 'Browser · Nginx · frontend',
        tryIt: { href: '/chromaui', label: 'Open Vector DB' },
        hops: [
            { path: [fwd('browser_nginx')], label: 'GET /', kind: 'request', caption: 'The student opens ac215-llm-rag.dlops.io. Nginx on the GCP VM terminates HTTPS.' },
            { path: [fwd('nginx_frontend')], label: 'GET /', kind: 'request', caption: 'Nginx forwards page requests to the React frontend container.' },
            { path: [rev('nginx_frontend'), rev('browser_nginx')], label: 'web app', kind: 'response', caption: 'The web app loads; from here on it runs in the student\'s browser.' },
            { path: [fwd('browser_chroma')], label: 'list collections', kind: 'request', caption: 'The Vector DB page talks directly to the student\'s own ChromaDB at localhost:8000. That traffic never leaves the laptop.' },
            { path: [rev('browser_chroma')], label: 'collections + chunks', kind: 'data', caption: 'Students can browse the chunks and metadata they loaded with the CLI.' },
        ],
    },
    {
        id: 'rag',
        title: 'RAG chat',
        where: 'Browser · api-service · Gemini · ChromaDB',
        tryIt: { href: '/chat', label: 'Try Chat' },
        hops: [
            { path: TO_API, label: 'question', kind: 'request', caption: 'The question goes to the api-service; Nginx routes /api requests to it.' },
            { path: [fwd('api_gemini')], label: 'embed question', kind: 'request', caption: 'The api-service asks Gemini to embed the question with the same model the CLI used.' },
            { path: [rev('api_gemini')], label: 'query vector', kind: 'response', caption: 'Gemini returns a 256-dimension query vector.' },
            { path: FROM_API, label: 'query vector', kind: 'response', caption: 'The vector is sent back to the browser.' },
            { path: [fwd('browser_chroma')], label: 'nearest neighbours?', kind: 'request', caption: 'The browser searches the local ChromaDB with the query vector.' },
            { path: [rev('browser_chroma')], label: 'top 10 chunks', kind: 'data', caption: 'ChromaDB returns the 10 closest chunks. These are the References shown under each answer.' },
            { path: TO_API, label: 'question + 10 chunks', kind: 'data', caption: 'The question and the retrieved chunks go to the api-service.' },
            { path: [fwd('api_gemini')], label: 'prompt + chunks', kind: 'request', caption: 'Gemini 3.1 Flash-Lite is told to answer only from the provided chunks.' },
            { path: [rev('api_gemini')], label: 'answer', kind: 'response', caption: 'Gemini writes a grounded answer.' },
            { path: FROM_API, label: 'answer', kind: 'response', caption: 'The answer shows up in the chat, together with its references.' },
        ],
    },
    {
        id: 'agent',
        title: 'Cheese expert agent',
        where: 'Function calling · tools',
        tryIt: { href: '/agent', label: 'Try the Agent' },
        hops: [
            { path: TO_API, label: 'question', kind: 'request', caption: 'The question goes to the api-service.' },
            { path: [fwd('api_gemini')], label: 'question + 2 search tools', kind: 'request', caption: 'Gemini is given two search tools and must choose one (function calling).' },
            { path: [rev('api_gemini')], label: 'get_book_by_author(…)', kind: 'response', caption: 'Gemini picks a tool and its arguments, e.g. an author and a search phrase.' },
            { path: FROM_API, label: 'tool call + vector', kind: 'response', caption: 'The api-service embeds the search phrase and hands the tool call to the browser.' },
            { path: [fwd('browser_chroma')], label: 'filtered search', kind: 'request', caption: 'The browser runs the tool against ChromaDB, e.g. only chunks by that author.' },
            { path: [rev('browser_chroma')], label: 'top 10 chunks', kind: 'data', caption: 'ChromaDB returns the matching chunks.' },
            { path: TO_API, label: 'tool result: chunks', kind: 'data', caption: 'The tool result goes back to the api-service.' },
            { path: [fwd('api_gemini')], label: 'chunks', kind: 'data', caption: 'Gemini reads the chunks...' },
            { path: [rev('api_gemini')], label: 'pavlos_fun_fact_tool()', kind: 'response', caption: '...and decides to call a second tool: pavlos_fun_fact_tool.' },
            { at: 'api', label: '🧀 fun fact', kind: 'local', caption: 'The api-service runs this tool itself; it doesn\'t need the browser or ChromaDB.' },
            { path: [fwd('api_gemini')], label: 'fun fact', kind: 'data', caption: 'The fun fact is returned to Gemini as the tool result.' },
            { path: [rev('api_gemini')], label: 'answer + fun fact', kind: 'response', caption: 'Gemini writes the final answer and ends with Pavlos\' fun fact.' },
            { path: FROM_API, label: 'answer', kind: 'response', caption: 'The agent\'s answer appears in the chat.' },
        ],
    },
    {
        id: 'finetune',
        title: 'Fine-tuned model',
        where: 'Cloud Storage · Vertex AI tuning',
        tryIt: { href: '/finetunechat', label: 'Try Pavlos Cheese Model' },
        hops: [
            { path: [fwd('bucket_tuning')], label: 'training JSONL', kind: 'data', caption: 'Question-answer pairs for fine-tuning are stored in a Cloud Storage bucket.' },
            { path: [fwd('tuning_ft')], label: 'tuned model', kind: 'data', caption: 'A Vertex AI supervised tuning job fine-tunes Gemini and deploys it to an endpoint.' },
            { path: [...TO_API, fwd('api_gemini')], label: 'embed question', kind: 'request', caption: 'At chat time the question is embedded exactly as in RAG chat...' },
            { path: [rev('api_gemini'), ...FROM_API], label: 'query vector', kind: 'response', caption: '...and the query vector comes back to the browser.' },
            { path: [fwd('browser_chroma')], label: 'nearest neighbours?', kind: 'request', caption: 'The browser retrieves chunks from the local ChromaDB.' },
            { path: [rev('browser_chroma')], label: 'top 10 chunks', kind: 'data', caption: 'The top 10 chunks come back.' },
            { path: TO_API, label: 'question + 10 chunks', kind: 'data', caption: 'The question and chunks go to the api-service.' },
            { path: [fwd('api_ft')], label: 'prompt + chunks', kind: 'request', caption: 'This time the api-service calls the fine-tuned endpoint instead of base Gemini.' },
            { path: [rev('api_ft')], label: 'answer', kind: 'response', caption: 'The fine-tuned model answers in its trained style.' },
            { path: FROM_API, label: 'answer', kind: 'response', caption: 'The answer appears in the Pavlos Cheese Model chat.' },
        ],
    },
];

const HOP_MS = 1150;
const LOCAL_MS = 1400;
const HOP_GAP_MS = 250;
const SCENARIO_GAP_MS = 1600;

const hopEdges = (hop) => (hop.path || []).map(([id]) => id);
const hopNodes = (hop) => {
    if (hop.at) return [hop.at];
    return hop.path.flatMap(([id]) => [EDGES[id].from, EDGES[id].to]);
};

// ---------------------------------------------------------------------------
// SVG pieces
// ---------------------------------------------------------------------------

const Node = ({ id, node, state, color }) => {
    const { x, y, w, h, title, sub } = node;
    const isActive = state === 'active';
    const opacity = state === 'dim' ? 0.4 : 1;
    const stroke = isActive ? color : '#e5e7eb';
    const filter = isActive ? `url(#glow-${color.slice(1)})` : 'url(#soft)';

    if (node.browser) {
        return (
            <g opacity={opacity} style={{ transition: 'opacity 300ms' }}>
                <rect x={x} y={y} width={w} height={h} rx={14} fill="#ffffff" stroke={stroke} strokeWidth={isActive ? 2 : 1} filter={filter} />
                <path d={`M${x} ${y + 26} H${x + w}`} stroke="#e5e7eb" />
                {[0, 1, 2].map((i) => (
                    <circle key={i} cx={x + 14 + i * 10} cy={y + 13} r={3.2} fill={['#f87171', '#fbbf24', '#34d399'][i]} />
                ))}
                <rect x={x + 50} y={y + 6} width={w - 62} height={14} rx={7} fill="#f3f4f6" />
                <text x={x + 58} y={y + 16.5} fontSize={9} fill="#6b7280">ac215-llm-rag.dlops.io</text>
                <rect x={x + 14} y={y + 40} width={36} height={36} rx={9} fill="#A41034" />
                <text x={x + 32} y={y + 63} fontSize={15} textAnchor="middle">🧀</text>
                <text x={x + 62} y={y + 55} fontSize={14} fontWeight={600} fill="#111827">{title}</text>
                <text x={x + 62} y={y + 71} fontSize={10.5} fill="#6b7280">{sub}</text>
                <text x={x + 14} y={y + 97} fontSize={9.5} fill="#9ca3af">runs in the student&apos;s browser</text>
            </g>
        );
    }

    const Icon = node.icon;
    const isDb = id === 'chroma';
    return (
        <g opacity={opacity} style={{ transition: 'opacity 300ms' }}>
            <rect x={x} y={y} width={w} height={h} rx={12} fill="#ffffff" stroke={stroke} strokeWidth={isActive ? 2 : 1} filter={filter} />
            <rect x={x + 12} y={y + h / 2 - 16} width={32} height={32} rx={8} fill={isActive ? color : '#f3f4f6'} style={{ transition: 'fill 300ms' }} />
            <Icon x={x + 18} y={y + h / 2 - 10} size={20} stroke={1.75} color={isActive ? '#ffffff' : '#374151'} />
            <text x={x + 54} y={y + h / 2 - 3} fontSize={isDb ? 14 : 13} fontWeight={600} fill="#111827">{title}</text>
            <text x={x + 54} y={y + h / 2 + 13} fontSize={10.5} fill="#6b7280">{sub}</text>
        </g>
    );
};

const Zone = ({ x, y, w, h, fill, stroke, icon: Icon, label, note }) => (
    <g>
        <rect x={x} y={y} width={w} height={h} rx={20} fill={fill} stroke={stroke} strokeDasharray="6 5" />
        <Icon x={x + 18} y={y + 14} size={18} stroke={1.75} color="#374151" />
        <text x={x + 42} y={y + 28} fontSize={14} fontWeight={600} fill="#111827">{label}</text>
        {note && <text x={x + 42 + label.length * 8.2} y={y + 28} fontSize={11} fill="#6b7280">{note}</text>}
    </g>
);

const Group = ({ x, y, w, h, icon: Icon, label }) => (
    <g>
        <rect x={x} y={y} width={w} height={h} rx={14} fill="#ffffff" fillOpacity={0.55} stroke="#cbd5e1" strokeDasharray="4 4" />
        <Icon x={x + 12} y={y + 9} size={14} stroke={1.75} color="#6b7280" />
        <text x={x + 31} y={y + 21} fontSize={10.5} fontWeight={600} fill="#6b7280" letterSpacing="0.04em">{label}</text>
    </g>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ArchitectureDiagram() {
    const [scenarioIdx, setScenarioIdx] = useState(0);
    const [hopIdx, setHopIdx] = useState(0);
    const [progress, setProgress] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [, setMounted] = useState(false);
    const progressRef = useRef(0);
    const pathRefs = useRef({});

    const scenario = SCENARIOS[scenarioIdx];
    const hop = scenario.hops[hopIdx];
    const color = KIND_COLORS[hop.kind];

    // Start playing after mount unless the user prefers reduced motion
    useEffect(() => {
        setMounted(true);
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (reduced) {
            progressRef.current = 1;
            setProgress(1);
        } else {
            setPlaying(true);
        }
    }, []);

    const setHop = useCallback((nextScenario, nextHop, nextProgress = 0) => {
        progressRef.current = nextProgress;
        setProgress(nextProgress);
        setScenarioIdx(nextScenario);
        setHopIdx(nextHop);
    }, []);

    // Animation loop for the current hop
    useEffect(() => {
        if (!playing) return;
        const duration = hop.at ? LOCAL_MS : HOP_MS;
        const isLastHop = hopIdx === scenario.hops.length - 1;
        let raf;
        let timeout;
        let start;
        const tick = (t) => {
            if (start === undefined) start = t - progressRef.current * duration;
            const p = Math.min(1, (t - start) / duration);
            progressRef.current = p;
            setProgress(p);
            if (p < 1) {
                raf = requestAnimationFrame(tick);
            } else {
                timeout = setTimeout(() => {
                    if (isLastHop) setHop((scenarioIdx + 1) % SCENARIOS.length, 0);
                    else setHop(scenarioIdx, hopIdx + 1);
                }, isLastHop ? SCENARIO_GAP_MS : HOP_GAP_MS);
            }
        };
        raf = requestAnimationFrame(tick);
        return () => {
            cancelAnimationFrame(raf);
            clearTimeout(timeout);
        };
    }, [playing, scenarioIdx, hopIdx, hop, scenario, setHop]);

    // Packet position along the hop's (possibly multi-edge) path
    const packet = (() => {
        if (hop.at) {
            const n = NODES[hop.at];
            return { x: n.x + n.w / 2, y: n.y - 4 };
        }
        const edgeSegments = hop.path.map(([id, dir]) => {
            const el = pathRefs.current[id];
            if (!el) return null;
            const len = el.getTotalLength();
            const at = (l) => el.getPointAtLength(dir === 1 ? l : len - l);
            return { len, at, start: at(0), end: at(len) };
        });
        if (edgeSegments.some((s) => !s)) return null;

        // Edges end at node borders; bridge consecutive edges with a straight
        // line so the packet glides through the node it passes (e.g. Nginx)
        const segments = [];
        edgeSegments.forEach((s, i) => {
            const prev = edgeSegments[i - 1];
            if (prev) {
                const dx = s.start.x - prev.end.x;
                const dy = s.start.y - prev.end.y;
                const len = Math.hypot(dx, dy);
                if (len > 0.5) {
                    segments.push({ len, at: (l) => ({ x: prev.end.x + (dx * l) / len, y: prev.end.y + (dy * l) / len }) });
                }
            }
            segments.push(s);
        });

        const total = segments.reduce((sum, s) => sum + s.len, 0);
        // Ease in-out so packets accelerate and settle
        const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        let remaining = eased * total;
        for (const s of segments) {
            if (remaining <= s.len || s === segments[segments.length - 1]) {
                const pt = s.at(Math.min(remaining, s.len));
                return { x: pt.x, y: pt.y };
            }
            remaining -= s.len;
        }
        return null;
    })();

    // Which edges/nodes to emphasise
    const scenarioEdges = new Set(scenario.hops.flatMap(hopEdges));
    const scenarioNodes = new Set(scenario.hops.flatMap(hopNodes));
    const visitedEdges = new Set(scenario.hops.slice(0, hopIdx).flatMap(hopEdges));
    const activeEdges = new Map((hop.path || []).map(([id, dir]) => [id, dir]));
    const activeNodes = new Set(hopNodes(hop));

    const nodeState = (id) => (activeNodes.has(id) ? 'active' : scenarioNodes.has(id) ? 'normal' : 'dim');

    const labelWidth = hop.label.length * 6.3 + 20;
    const chip = packet && {
        x: Math.max(8, Math.min(1000 - labelWidth - 8, packet.x - labelWidth / 2)),
        y: Math.max(6, packet.y - 36),
    };

    const goToStep = (i) => {
        setPlaying(false);
        setHop(scenarioIdx, i, 1);
    };
    const step = (delta) => {
        const next = hopIdx + delta;
        if (next >= 0 && next < scenario.hops.length) {
            goToStep(next);
        } else if (next >= scenario.hops.length) {
            setPlaying(false);
            setHop((scenarioIdx + 1) % SCENARIOS.length, 0, 1);
        } else {
            const prevIdx = (scenarioIdx - 1 + SCENARIOS.length) % SCENARIOS.length;
            setPlaying(false);
            setHop(prevIdx, SCENARIOS[prevIdx].hops.length - 1, 1);
        }
    };
    const selectScenario = (i) => {
        setHop(i, 0);
        setPlaying(true);
    };
    const togglePlay = () => {
        if (!playing && progressRef.current >= 1) {
            // Resume from the next hop rather than replaying a finished one
            const isLast = hopIdx === scenario.hops.length - 1;
            if (isLast) setHop((scenarioIdx + 1) % SCENARIOS.length, 0);
            else setHop(scenarioIdx, hopIdx + 1);
        }
        setPlaying(!playing);
    };

    const glowColors = Object.values(KIND_COLORS);

    return (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
            {/* Scenario tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3">
                {SCENARIOS.map((s, i) => (
                    <button
                        key={s.id}
                        type="button"
                        onClick={() => selectScenario(i)}
                        className={`flex items-center gap-2 rounded-pill border px-3 py-1.5 text-sm font-medium transition-colors ${i === scenarioIdx
                            ? 'border-gray-900 bg-gray-900 text-white'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        <span className={`flex h-5 w-5 items-center justify-center rounded-pill text-[11px] ${i === scenarioIdx ? 'bg-white text-gray-900' : 'bg-gray-100 text-gray-600'}`}>{i + 1}</span>
                        {s.title}
                    </button>
                ))}
            </div>

            {/* Diagram */}
            <div className="overflow-x-auto bg-gray-50">
                <svg
                    viewBox="0 0 1000 650"
                    className="block w-full min-w-[760px]"
                    role="img"
                    aria-label="Architecture of the LLM RAG tutorial: Google Cloud hosts Nginx, the frontend, the api-service and Vertex AI; the student's laptop runs the web app in a browser, the llm-rag CLI and ChromaDB."
                >
                    <defs>
                        <filter id="soft" x="-20%" y="-20%" width="140%" height="160%">
                            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.06" />
                        </filter>
                        {glowColors.map((c) => (
                            <filter key={c} id={`glow-${c.slice(1)}`} x="-30%" y="-40%" width="160%" height="180%">
                                <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor={c} floodOpacity="0.35" />
                            </filter>
                        ))}
                        <style>{`
                            .flow-fwd { stroke-dasharray: 7 6; animation: flow-fwd 0.7s linear infinite; }
                            .flow-rev { stroke-dasharray: 7 6; animation: flow-rev 0.7s linear infinite; }
                            @keyframes flow-fwd { to { stroke-dashoffset: -13; } }
                            @keyframes flow-rev { to { stroke-dashoffset: 13; } }
                            .packet-ring { transform-box: fill-box; transform-origin: center; animation: ring 1.1s ease-out infinite; }
                            @keyframes ring { from { transform: scale(1); opacity: 0.55; } to { transform: scale(2.6); opacity: 0; } }
                            @media (prefers-reduced-motion: reduce) {
                                .flow-fwd, .flow-rev, .packet-ring { animation: none; }
                            }
                        `}</style>
                    </defs>

                    {/* Zones and groups */}
                    <Zone x={10} y={10} w={980} h={300} fill="#eff6ff" stroke="#bfdbfe" icon={IconCloud} label="Google Cloud" note="ac215-project" />
                    <Group x={30} y={50} w={380} h={244} icon={IconServer} label="VM · ac215-llm-rag" />
                    <Group x={430} y={50} w={340} h={244} icon={IconSparkles} label="Vertex AI" />
                    <Zone x={10} y={350} w={980} h={290} fill="#fafaf9" stroke="#d6d3d1" icon={IconDeviceLaptop} label="Student's laptop" note="Docker · localhost" />
                    <text x={500} y={334} fontSize={10.5} fill="#9ca3af" textAnchor="middle">internet</text>

                    {/* Edges */}
                    {Object.entries(EDGES).map(([id, edge]) => {
                        const activeDir = activeEdges.get(id);
                        const isActive = activeDir !== undefined;
                        const isVisited = visitedEdges.has(id);
                        const inScenario = scenarioEdges.has(id);
                        return (
                            <g key={id}>
                                {/* Base track (also used to measure the packet path) */}
                                <path
                                    ref={(el) => { pathRefs.current[id] = el; }}
                                    d={edge.d}
                                    fill="none"
                                    stroke={isVisited ? '#64748b' : '#cbd5e1'}
                                    strokeOpacity={isVisited ? 0.55 : inScenario ? 1 : 0.45}
                                    strokeWidth={isVisited ? 2.5 : 1.5}
                                    strokeLinejoin="round"
                                    style={{ transition: 'stroke 300ms, stroke-opacity 300ms' }}
                                />
                                {isActive && (
                                    <path
                                        d={edge.d}
                                        fill="none"
                                        stroke={color}
                                        strokeWidth={2.5}
                                        strokeLinejoin="round"
                                        className={activeDir === 1 ? 'flow-fwd' : 'flow-rev'}
                                    />
                                )}
                            </g>
                        );
                    })}

                    {/* Edge annotations */}
                    <text x={123} y={330} fontSize={10} fill="#6b7280" opacity={scenarioEdges.has('browser_nginx') ? 1 : 0.4}>HTTPS</text>
                    <text x={530} y={488} fontSize={10} fill="#6b7280" textAnchor="middle" opacity={scenarioEdges.has('browser_chroma') ? 1 : 0.4}>localhost:8000 · never leaves the laptop</text>

                    {/* Nodes */}
                    {Object.entries(NODES).map(([id, node]) => (
                        <Node key={id} id={id} node={node} state={nodeState(id)} color={color} />
                    ))}

                    {/* Packet + payload label */}
                    {packet && (
                        <g style={{ pointerEvents: 'none' }}>
                            <circle cx={packet.x} cy={packet.y} r={7} fill={color} className="packet-ring" />
                            <circle cx={packet.x} cy={packet.y} r={7} fill={color} stroke="#ffffff" strokeWidth={2.5} />
                            <g transform={`translate(${chip.x} ${chip.y})`}>
                                <rect width={labelWidth} height={22} rx={11} fill="#111827" opacity={0.92} />
                                <circle cx={11} cy={11} r={3.5} fill={color} />
                                <text x={20} y={15} fontSize={11} fontWeight={500} fill="#ffffff">{hop.label}</text>
                            </g>
                        </g>
                    )}
                </svg>
            </div>

            {/* Caption + controls */}
            <div className="border-t border-gray-100 px-4 py-4">
                <div className="flex flex-wrap items-start gap-4">
                    <div className="min-w-0 flex-1" aria-live="polite">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                            <span className="font-semibold text-gray-900">{scenario.title}</span>
                            <span>·</span>
                            <span>{scenario.where}</span>
                            <span>·</span>
                            <span>Step {hopIdx + 1} of {scenario.hops.length}</span>
                        </div>
                        <p className="mt-1.5 text-[15px] leading-relaxed text-gray-800">{hop.caption}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => step(-1)} aria-label="Previous step" className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">
                            <IconPlayerTrackPrevFilled size={14} />
                        </button>
                        <button type="button" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'} className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 text-white hover:bg-gray-700">
                            {playing ? <IconPlayerPauseFilled size={14} /> : <IconPlayerPlayFilled size={14} />}
                        </button>
                        <button type="button" onClick={() => step(1)} aria-label="Next step" className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">
                            <IconPlayerTrackNextFilled size={14} />
                        </button>
                    </div>
                </div>

                {/* Step progress */}
                <div className="mt-3 flex gap-1">
                    {scenario.hops.map((h, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => goToStep(i)}
                            aria-label={`Step ${i + 1}`}
                            className="h-1.5 flex-1 overflow-hidden rounded-pill bg-gray-100"
                        >
                            <span
                                className="block h-full rounded-pill"
                                style={{
                                    width: i < hopIdx ? '100%' : i === hopIdx ? `${progress * 100}%` : '0%',
                                    backgroundColor: KIND_COLORS[h.kind],
                                }}
                            />
                        </button>
                    ))}
                </div>

                {/* Legend + try it */}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
                    {[['request', 'Request'], ['response', 'Response'], ['data', 'Data / chunks'], ['local', 'Runs on the server']].map(([kind, label]) => (
                        <span key={kind} className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-pill" style={{ backgroundColor: KIND_COLORS[kind] }} />
                            {label}
                        </span>
                    ))}
                    <Link href={scenario.tryIt.href} className="ml-auto flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700">
                        {scenario.tryIt.label}
                        <IconArrowRight size={14} />
                    </Link>
                </div>
            </div>
        </div>
    );
}
