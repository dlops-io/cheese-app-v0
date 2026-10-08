'use client'

import React, { useEffect, useState } from 'react';
import Chat, { Bubble, useMessages } from '@chatui/core';
import { Image } from "@chatui/core";
import { RichText } from '@chatui/core';
import { useLocalStorage } from '@mantine/hooks';
import '@chatui/core/dist/index.css';
import { uuid } from "../../services/Common";
import DataService from "../../services/DataService";

import './chatui-theme.css';
// Import the styles
import styles from "./styles.module.css";

function ChatComponent({

}) {

    // Component States
    const { messages, appendMsg, setTyping } = useMessages([]);
    const [sessionId, setSessionId] = useState(uuid());
    const [tenant, setTenant] = useLocalStorage({ key: 'tenant' });
    const [dbname, setDbName] = useLocalStorage({ key: 'dbname' });

    // Setup Component
    useEffect(() => {

    }, []);

    function handleSend(type, val) {
        if (type === "text" && val.trim()) {
            appendMsg({
                type: "text",
                content: { text: val },
                position: "right",
            });

            setTyping(true);

            let chat_data = {
                "session_id": sessionId,
                "input": val
            }

            // Generate query embeddings
            DataService.GenerateEmbeddings(val)
                .then(function (response) {
                    console.log(response.data);
                    return DataService.RetrieveChunks(response.data["embedding"], tenant, dbname);
                }).then(function (response) {
                    console.log(response.data);

                    chat_data = {
                        "session_id": sessionId,
                        "prompt": val + '\n' + response.data["documents"][0].join('\n')
                    }
                    return DataService.ChatWithLLM(chat_data);
                }).then(function (response) {
                    console.log(response.data);
                    appendMsg({
                        type: "html",
                        content: { text: response.data["response"] },
                    });
                })
            // Retrieve top 10 chunks

            // Chat with backend API
            // DataService.ChatWithLLM(chat_data)
            //     .then(function (response) {
            //         console.log(response.data);
            //         appendMsg({
            //             type: "html",
            //             content: { text: response.data["response"] },
            //         });
            //     })

            // Testing
            // setTimeout(() => {
            //     appendMsg({
            //         type: 'text',
            //         content: { text: 'Bala bala' },
            //     });
            // }, 1000);
        }
    }

    function renderMessageContent(msg) {
        const { content, type } = msg;
        if (type === "text") {
            return <Bubble content={content.text} />;
        }
        if (type === "image") {
            return (
                <Image
                    src="//gw.alicdn.com/tfs/TB1GRW3voY1gK0jSZFMXXaWcVXa-620-320.jpg"
                    width="299"
                    height="200"
                    alt="image"
                />
            );
        }
        if (type === "html") {
            return (
                <Bubble type="image" >
                    <RichText className={styles.richText} content={content.text} />
                </Bubble>
            );
        }
    }

    return (
        <div>
            <Chat
                locale="en-US"
                placeholder="Type here..."
                messages={messages}
                renderMessageContent={renderMessageContent}
                onSend={handleSend}
            />
        </div>
    );
}

export default ChatComponent;