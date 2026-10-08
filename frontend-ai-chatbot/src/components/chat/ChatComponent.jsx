import React, { useState, useEffect } from 'react';
import { useLocalStorage } from '@mantine/hooks';
import { uuid } from "../../services/Common";
import DataService from "../../services/DataService";

// Import the styles
import styles from "./styles.module.css";

const ChatMessage = ({ message, isUser }) => (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`rounded-lg p-3 max-w-lg lg:max-w-md ${isUser
            ? 'bg-blue-500 text-blue'
            : 'bg-gray-200 text-gray-800'
            }`}>
            {message}
        </div>
    </div>
);

const ChatComponent = ({ agent, finetuned }) => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [sessionId, setSessionId] = useState(uuid());
    const [url, setURL] = useLocalStorage({ key: 'url' });
    const [tenant, setTenant] = useLocalStorage({ key: 'tenant' });
    const [dbname, setDbName] = useLocalStorage({ key: 'dbname' });
    const [collections, setCollections] = useState([]);
    const [selectedCollection, setSelectedCollection] = useState('');

    console.log(agent);
    console.log(finetuned);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (url && tenant && dbname) {
            if (inputMessage.trim() !== '') {
                setMessages([...messages, { text: inputMessage, isUser: true }]);

                // Simulate a response (you can replace this with actual API calls later)
                // setTimeout(() => {
                //     setMessages(prevMessages => [...prevMessages, { text: "Thanks for your message!", isUser: false }]);
                // }, 1000);

                if (!agent) {
                    if (!finetuned) {
                        // Generate query embeddings
                        DataService.GenerateEmbeddings(inputMessage)
                            .then(function (response) {
                                console.log(response.data);
                                return DataService.RetrieveChunks(url, selectedCollection, response.data["embedding"], tenant, dbname);
                            }).then(function (response) {
                                console.log(response.data);

                                let chat_data = {
                                    "session_id": sessionId,
                                    "prompt": inputMessage + '\n' + response.data["documents"][0].join('\n')
                                }
                                return DataService.ChatWithLLM(chat_data);
                            }).then(function (response) {
                                console.log(response.data);
                                setMessages(prevMessages => [...prevMessages, { text: response.data["response"], isUser: false }]);
                            })
                    } else {
                        // Generate query embeddings
                        DataService.GenerateEmbeddings(inputMessage)
                            .then(function (response) {
                                console.log(response.data);
                                return DataService.RetrieveChunks(url, selectedCollection, response.data["embedding"], tenant, dbname);
                            }).then(function (response) {
                                console.log(response.data);

                                let chat_data = {
                                    "session_id": sessionId,
                                    "prompt": inputMessage + '\n' + response.data["documents"][0].join('\n')
                                }
                                return DataService.ChatWithFinetunedLLM(chat_data);
                            }).then(function (response) {
                                console.log(response.data);
                                setMessages(prevMessages => [...prevMessages, { text: response.data["response"], isUser: false }]);
                            })
                    }

                } else {
                    console.log("Agent calling......");
                    var function_name = "";
                    DataService.GetAgentCall(inputMessage)
                        .then(function (response) {
                            console.log(response.data);
                            var agent_response = response.data["response"][0];
                            console.log(agent_response.function_name)
                            if (agent_response.function_name == "get_book_by_author") {
                                function_name = agent_response.function_name;
                                return DataService.RetrieveBookChunks(url, selectedCollection, agent_response.args["search_content"], agent_response.args["author"], tenant, dbname);
                            }
                            if (agent_response.function_name == "get_book_by_search_content") {
                                function_name = agent_response.function_name
                                return DataService.RetrieveChunks(url, selectedCollection, agent_response.args["search_content"], tenant, dbname);
                            }
                        }).then(function (response) {
                            if (response) {
                                console.log(response.data);

                                let chat_data = {
                                    "session_id": sessionId,
                                    "query": inputMessage,
                                    "function_name": function_name,
                                    "chunks": response.data["documents"][0].join('\n')
                                }
                                return DataService.ChatWithLLMAgent(chat_data);
                            }
                        }).then(function (response) {
                            if (response) {
                                console.log(response.data);
                                setMessages(prevMessages => [...prevMessages, { text: response.data["response"], isUser: false }]);
                            }
                        })
                }

                setInputMessage('');
            }
        }
    };

    useEffect(() => {
        if (url && tenant && dbname) {
            console.log(url);
            console.log(tenant);
            console.log(dbname);

            DataService.RetrieveCollections(url, tenant, dbname)
                .then(function (response) {
                    console.log(response.data);
                    setCollections(response.data);
                    if (response.data.length > 0) {
                        setSelectedCollection(response.data[0].id);
                    }
                })
        }

    }, [url, tenant, dbname])

    const handleCollectionChange = (event) => {
        setSelectedCollection(event.target.value);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-128px)] bg-white">
            <div className="p-4 border-b border-gray-200">
                <span>Select collection to use for RAG:&nbsp;</span>
                {collections.map((collection, index) => (
                    <label key={collection.id} className="inline-flex items-center mr-4">
                        <input
                            type="radio"
                            className="form-radio"
                            name="collection"
                            value={collection.id}
                            checked={selectedCollection === collection.id}
                            onChange={handleCollectionChange}
                        />
                        <span className="ml-2">{collection.name}</span>
                    </label>
                ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                {messages.map((message, index) => (
                    <ChatMessage key={index} message={message.text} isUser={message.isUser} />
                ))}
            </div>
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
                <div className="flex">
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-l-lg p-2 text-gray-800"
                        placeholder="Ask a Cheese question..."
                    />
                    <button
                        type="submit"
                        className={styles.chatButton}
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChatComponent;