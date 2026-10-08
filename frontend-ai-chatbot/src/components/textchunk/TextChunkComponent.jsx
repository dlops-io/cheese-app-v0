import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { CharacterTextSplitter, RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';

// Import the styles
import styles from "./styles.module.css";

class RecursiveCharacterTextSplitter_ext extends RecursiveCharacterTextSplitter {
    joinDocs(docs, separator) {
        // LangChain trims chunks, we don't want that for visuals!
        // Hacky override
        return docs.join(separator);
    }
}

class CharacterTextSplitter_ext extends CharacterTextSplitter {
    joinDocs(docs, separator) {
        // LangChain trims chunks, we don't want that for visuals!
        // Hacky override
        return docs.join(separator);
    }
}

const highlightChunks = (chunks) => {
    let highlightedText = '';
    const colors = ['#70d6ff', '#e9ff70', '#ff9770', '#ffd670', '#ff70a6'];

    chunks.forEach((chunk, index) => {
        let uniquePart, overlapPart;

        if (index === 0) {
            uniquePart = chunk.text.slice(0, chunk.text.length - chunk.overlapWithNext);
            overlapPart = chunk.text.slice(chunk.text.length - chunk.overlapWithNext);
        } else if (index !== chunks.length - 1) {
            uniquePart = chunk.text.slice(chunk.overlapWithNext, chunk.text.length - chunk.overlapWithNext);
            overlapPart = chunk.text.slice(chunk.text.length - chunk.overlapWithNext, chunk.text.overlapWithNext);
        } else { // It's the last chunk
            uniquePart = chunk.text.slice(chunk.overlapWithNext);
            overlapPart = ''; // There's no overlap with the next chunk
        }

        // Generate a pseudo-random color for each unique part using HSL
        const color = colors[index % colors.length];

        const highlightedChunk = `<span style="background: ${color}">${uniquePart}</span>`;
        highlightedText += highlightedChunk;

        // Add overlap part only if it's not the last chunk
        if (overlapPart) {
            highlightedText += `<span class="overlap">${overlapPart}</span>`;
        }
    });
    return highlightedText;
};


function TextChunkComponent({

}) {

    // Component States
    const [text, setText] = useState('');
    const [chunkSize, setChunkSize] = useState(800);
    const [overlap, setOverlap] = useState(0);
    const [highlightedText, setHighlightedText] = useState('');
    const [splitter, setSplitter] = useState('characterSplitter');
    const [rawChunks, setRawChunks] = useState([]);
    const [overlapSize, setOverlapSize] = useState([]);

    const MAX_TEXT_LENGTH = 100000; // Define your maximum text length

    const [books, setBooks] = useState([]);
    const [book, setBook] = React.useState('');


    // Setup Component
    const splitterOptions = useMemo(() => ({
        'characterSplitter': {
            label: 'Character Splitter',
            language: null,
            chunk_overlap_ind: true,
            defaultText: ''
        },
        'recursiveCharacterTextSplitter': {
            label: 'Recursive Character Text Splitter',
            language: null,
            chunk_overlap_ind: false,
            defaultText: ''
        }
    }), []);
    const renderTextWithHighlights = useCallback(async () => {
        let rawChunks;
        const language = splitterOptions[splitter].language;
        if (splitter.startsWith('characterSplitter')) {
            rawChunks = await chunkTextSimple(text, chunkSize, overlap);
        } else {
            rawChunks = await chunkTextRecursive(text, chunkSize, overlap, language);
        }
        setRawChunks(rawChunks); // Set the state variable
        const reconstructedChunks = reconstructChunks(rawChunks, overlap);
        const highlightedText = highlightChunks(reconstructedChunks);
        return highlightedText;
    }, [text, chunkSize, overlap, splitter, splitterOptions]);
    useEffect(() => {
        (async () => {
            const result = await renderTextWithHighlights();
            setHighlightedText(result);
        })();
    }, [renderTextWithHighlights]);
    useEffect(() => {
        if (!splitterOptions[splitter].chunk_overlap_ind) {
            setOverlap(0);
        }

        // Get all default texts
        const defaultTexts = Object.values(splitterOptions).map(option => option.defaultText) || [];

        // Check if the current text is blank or a default text
        if (defaultTexts.includes(text)) {
            setText(splitterOptions[splitter].defaultText); // Set the default text for the selected splitter
        }
    }, [splitter, text, splitterOptions]);




    // Handlers
    const handleTextChange = (event) => {
        let newText = event.target.value;
        if (newText.length > MAX_TEXT_LENGTH) {
            alert(`Error: Text cannot be longer than ${MAX_TEXT_LENGTH} characters. It will be trimmed to fit the limit.`);
            newText = newText.substring(0, MAX_TEXT_LENGTH);
        }
        setText(newText);
    };

    const handleChunkSizeChange = (event) => {
        let newChunkSize = Number(event.target.value);
        if (newChunkSize > overlap * 2) {
            setChunkSize(newChunkSize);
            setOverlapSize(newChunkSize * .45)
        }
    };

    const handleOverlapChange = (event) => {
        let newOverlap = Number(event.target.value);
        if (newOverlap <= chunkSize * 0.5) {
            setOverlap(newOverlap);
        }
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                setText(e.target.result);
            };
            reader.readAsText(file);
        }
    };

    const reconstructChunks = (chunks, chunkOverlap) => {
        let reconstructedText = [];
        let chunkData = [];
        let currentStartIndex = 0;

        chunks.forEach((chunk, index) => {
            const isLastChunk = index === chunks.length - 1;
            const startIndex = currentStartIndex; // Adjusted start index
            const endIndex = startIndex + chunk.length; // Adjusted end index

            reconstructedText.push(chunk);
            chunkData.push({
                id: index + 1,
                startIndex: startIndex,
                endIndex: endIndex,
                text: chunk,
                overlapWithNext: chunkOverlap
            });

            currentStartIndex = endIndex - (isLastChunk ? 0 : chunkOverlap); // Adjusted current start index
        });
        return chunkData;
    };

    const chunkTextSimple = async (text, chunkSize, overlap) => {
        if (!text) {
            return [];
        }
        const splitter = new CharacterTextSplitter_ext({
            separator: "",
            chunkSize: chunkSize,
            chunkOverlap: overlap,
            keepSeparator: true
        });

        const documents = await splitter.createDocuments([text]);

        let chunks = []
        for (let document of documents) {
            chunks.push(document.pageContent);
        }
        return chunks || []; // Ensure that an array is returned
    };

    const chunkTextRecursive = async (text, chunkSize, overlap, language) => {
        if (!text) {
            return [];
        }
        let splitter;
        if (language) {
            splitter = RecursiveCharacterTextSplitter_ext.fromLanguage(language, {
                chunkSize: chunkSize,
                chunkOverlap: overlap,
                keepSeparator: true
            });
        } else {
            splitter = new RecursiveCharacterTextSplitter_ext({
                chunkSize: chunkSize,
                chunkOverlap: overlap,
                keepSeparator: true
            });
        }

        const documents = await splitter.createDocuments([text]);

        let chunks = []
        for (let document of documents) {
            chunks.push(document.pageContent);
        }
        return chunks;
    };

    const handleBookChange = (event) => {
        const book = event.target.value;
        setBook(book);

        if (book != "") {
            fetch(book)
                .then(response => response.text())
                .then(content => {
                    console.log(content);
                    setText(content);
                })
                .catch(error => console.error('Error fetching book content:', error));
        }
    }

    return (
        <div className={styles.root}>
            <main className={styles.main}>
                <Container maxWidth={false} className={styles.container}>
                    <Grid container spacing={3}>
                        <Grid item sm={4}>
                            <FormControl fullWidth>
                                <label className="font-bold text-md text-gray-800 mb-2 uppercase">Select a Book:</label>
                                <Select
                                    labelId="demo-simple-select-label"
                                    value={book}
                                    onChange={handleBookChange}
                                    displayEmpty
                                >
                                    <MenuItem value="">- Select or upload a book -</MenuItem>
                                    <MenuItem value="books/Hand-book on cheese making.txt">Hand-book on cheese making</MenuItem>
                                    <MenuItem value="books/The Book of Cheese.txt">The Book of Cheese</MenuItem>
                                    <MenuItem value="books/The Complete Book of Cheese.txt">The Complete Book of Cheese</MenuItem>
                                </Select>
                            </FormControl>
                            <div className={styles.divider}></div>
                            <div className={styles.textArea}>
                                {/* <textarea value={text} onChange={handleTextChange} rows={10} cols={50} /> */}
                                <TextField
                                    label="Source Text"
                                    multiline
                                    rows={10}
                                    className={styles.textAreaField}
                                    value={text} onChange={handleTextChange}
                                />
                                <div className={styles.uploadButtonArea}>
                                    <label htmlFor="file-upload" className="custom-file-upload">
                                        <span style={{ borderRadius: '5px', padding: '5px', fontSize: '12px', backgroundColor: '#d1dcff' }}>Upload .txt</span>
                                    </label>
                                    <input id="file-upload" type="file" accept=".txt" onChange={handleFileUpload} style={{ display: 'none' }} />
                                </div>
                            </div>
                            <div className={styles.divider}></div>
                            <div>
                                <FormControl fullWidth>
                                    <label className="font-bold text-md text-gray-800 mb-2 uppercase">Select a Splitter:</label>
                                    <Select
                                        value={splitter}
                                        onChange={(e) => setSplitter(e.target.value)}
                                    >
                                        {Object.entries(splitterOptions).map(([value, { label }]) => (
                                            <MenuItem key={value} value={value}>{label}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <div className={styles.sliderContainer}>
                                    <label>
                                        <span style={{ display: 'inline-block', paddingRight: '10px' }}>Chunk Size:</span>
                                        <input
                                            type="number"
                                            min="1"
                                            max="2000"
                                            value={chunkSize}
                                            style={{ width: '50px' }}
                                            onChange={handleChunkSizeChange}
                                        />
                                        <input type="range" min="1" max="2000" value={chunkSize} onChange={handleChunkSizeChange} />
                                    </label>
                                </div>
                                <div className={styles.sliderContainer}>
                                    <label style={{ opacity: splitterOptions[splitter].chunk_overlap_ind ? 1 : 0.5 }}>
                                        <span style={{ display: 'inline-block', paddingRight: '10px' }}>Chunk Overlap:</span>
                                        <input
                                            type="number"
                                            min="0"
                                            max={overlapSize}
                                            value={overlap}
                                            style={{ width: '50px' }}
                                            onChange={handleOverlapChange}
                                            disabled={!splitterOptions[splitter].chunk_overlap_ind}
                                        />
                                        <input
                                            type="range"
                                            min="0"
                                            max={overlapSize}
                                            value={overlap}
                                            onChange={handleOverlapChange}
                                            disabled={!splitterOptions[splitter].chunk_overlap_ind}
                                        />
                                    </label>
                                </div>
                                <div className={styles.divider}></div>
                                <div>
                                    Total Characters: {rawChunks.reduce((a, b) => a + b.length, 0)}
                                </div>
                                <div>
                                    Number of chunks: {rawChunks.length}
                                </div>
                                <div>
                                    Average chunk size: {(rawChunks.reduce((a, b) => a + b.length, 0) / rawChunks.length).toFixed(1)}
                                </div>
                                <div className={styles.divider}></div>
                                <div>
                                    <p>Select different chunking strategies to see how they impact your text, add your own text if you'd like.</p>
                                    <p>You'll see different colors that represent different chunks. <span style={{ background: "#ff70a6" }}>This could be chunk 1. </span><span style={{ background: "#70d6ff" }}>This could be chunk 2, </span><span style={{ background: "#e9ff70" }}>sometimes a chunk will change i</span><span style={{ background: "#ffd670" }}>n the middle of a sentence (this isn't great). </span><span style={{ background: "#ff9770" }}>If any chunks have overlapping text, those will appear in orange.</span></p>
                                    <p><b>Chunk Size</b>: The length (in characters) of your end chunks</p>
                                    <p><b>Chunk Overlap (Green)</b>: The amount of overlap or cross over sequential chunks share</p>
                                </div>
                                <div className={styles.divider}></div>
                                <div>This app is adapted from Greg Kamradt's <a href='https://chunkviz.up.railway.app/' target="_blank"><strong>ChunkViz</strong></a></div>
                                <div className={styles.divider}></div>
                            </div>
                        </Grid>
                        <Grid item sm={8}>
                            <div className={styles.chunkedText}>
                                <div dangerouslySetInnerHTML={{ __html: highlightedText }} />
                            </div>
                        </Grid>
                    </Grid>
                </Container>
            </main>
        </div>
    );
}

export default TextChunkComponent;