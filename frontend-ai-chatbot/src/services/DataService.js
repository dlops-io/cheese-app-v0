import { BASE_API_URL } from "./Common";
import axios from 'axios';


const DataService = {
    Init: function () {
        // Any application initialization logic comes here
    },
    GenerateEmbeddings: async function (text) {
        return await axios.get(BASE_API_URL + "/rag/embedding?text=" + encodeURIComponent(text));
    },
    ChatWithLLM: async function (chat_data) {
        return await axios.post(BASE_API_URL + "/rag/llm-response", chat_data);
    },
    ChatWithFinetunedLLM: async function (chat_data) {
        return await axios.post(BASE_API_URL + "/rag/fine-tune-llm-response", chat_data);
    },
    RetrieveCollections: async function (url, tenant, database) {
        //return await axios.get(url + "/api/v1/collections?tenant=" + tenant + "&database=" + database);

        // api/v2/tenants/default_tenant/databases/default_database/collections
        return await axios.get(url + "/api/v2/tenants/" + tenant + "/databases/" + database + "/collections");
    },
    RetrieveChunks: async function (url, collection, embedding, tenant, database) {
        // var query = {
        //     "where": {},
        //     "where_document": {},
        //     "query_embeddings": [embedding],
        //     "n_results": 10,
        //     "include": [
        //         "documents"
        //     ]
        // }
        var query = {
            "query_embeddings": [embedding],
            "n_results": 10,
            "include": [
                "documents",
                "metadatas",
                "distances"
            ]
        }
        return await axios.post(url + "/api/v2/tenants/" + tenant + "/databases/" + database + "/collections/" + collection + "/query", query);
    },
    RetrieveBookChunks: async function (url, collection, embedding, author, tenant, database) {
        var query = {
            "where": { "author": author },
            "query_embeddings": [embedding],
            "n_results": 10,
            "include": [
                "documents",
                "metadatas",
                "distances"
            ]
        }
        return await axios.post(url + "/api/v2/tenants/" + tenant + "/databases/" + database + "/collections/" + collection + "/query", query);
    },
    GetAgentCall: async function (text) {
        return await axios.get(BASE_API_URL + "/rag/agent_call?query=" + encodeURIComponent(text));
    },
    ChatWithLLMAgent: async function (chat_data) {
        return await axios.post(BASE_API_URL + "/rag/llm-agent-response", chat_data);
    },
}

export default DataService;