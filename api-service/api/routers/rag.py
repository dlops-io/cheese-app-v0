import os
from fastapi import APIRouter, Query, Body
from typing import Dict, Any

# Vertex AI via the google-genai client (same SDK/approach as llm-rag/cli.py)
from google import genai
from google.genai import types
from google.genai.types import Content, Part
import agent_tools

# Define Router
router = APIRouter()

# Setup
GCP_PROJECT = os.environ["GCP_PROJECT"]
EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMENSION = 256
GENERATIVE_MODEL = "gemini-3.1-flash-lite"
# FINE_TUNE_GENERATIVE_MODEL = "projects/129349313346/locations/us-central1/endpoints/3319822527953371136" # Old model

# projects/129349313346/locations/us/endpoints/7652952773041848320
FINE_TUNE_GENERATIVE_MODEL = "projects/129349313346/locations/us/endpoints/7652952773041848320"

#############################################################################
#                       Initialize the LLM Client                           #
llm_client = genai.Client(vertexai=True, project=GCP_PROJECT, location="global")
#############################################################################

# Configuration settings for the content generation
generation_config = {
    "max_output_tokens": 3000,  # Maximum number of tokens for output
    "temperature": 0.75,  # Control randomness in output
    "top_p": 0.95,  # Use nucleus sampling
}
# Initialize the GenerativeModel with specific system instructions
SYSTEM_INSTRUCTION = """
You are an AI assistant specialized in cheese knowledge. Your responses are based solely on the information provided in the text chunks given to you. Do not use any external knowledge or make assumptions beyond what is explicitly stated in these chunks.

When answering a query:
1. Carefully read all the text chunks provided.
2. Identify the most relevant information from these chunks to address the user's question.
3. Formulate your response using only the information found in the given chunks.
4. If the provided chunks do not contain sufficient information to answer the query, state that you don't have enough information to provide a complete answer.
5. Always maintain a professional and knowledgeable tone, befitting a cheese expert.
6. If there are contradictions in the provided chunks, mention this in your response and explain the different viewpoints presented.

Remember:
- You are an expert in cheese, but your knowledge is limited to the information in the provided chunks.
- Do not invent information or draw from knowledge outside of the given text chunks.
- If asked about topics unrelated to cheese, politely redirect the conversation back to cheese-related subjects.
- Be concise in your responses while ensuring you cover all relevant information from the chunks.

Your goal is to provide accurate, helpful information about cheese based solely on the content of the text chunks you receive with each query.
"""

SYSTEM_INSTRUCTION_AGENT = """
You are an AI assistant specialized in cheese knowledge. Your responses are based solely on the information provided in the text chunks given to you. Do not use any external knowledge or make assumptions beyond what is explicitly stated in these chunks.

When answering a query:
1. Carefully read all the text chunks provided.
2. Identify the most relevant information from these chunks to address the user's question.
3. Formulate your response using only the information found in the given chunks.
4. If the provided chunks do not contain sufficient information to answer the query, state that you don't have enough information to provide a complete answer.
5. Always maintain a professional and knowledgeable tone, befitting a cheese expert.
6. If there are contradictions in the provided chunks, mention this in your response and explain the different viewpoints presented.

Remember:
- You are an expert in cheese, but your knowledge is limited to the information in the provided chunks.
- Do not invent information or draw from knowledge outside of the given text chunks.
- If asked about topics unrelated to cheese, politely redirect the conversation back to cheese-related subjects.
- Be concise in your responses while ensuring you cover all relevant information from the chunks.

Your goal is to provide accurate, helpful information about cheese based solely on the content of the text chunks you receive with each query.

Tools:
- You have a pavlos_fun_fact_tool that returns a fun fact about cheese from Pavlos. Facts returned by this tool are trusted and may be used alongside the text chunks.
- You MUST call pavlos_fun_fact_tool at least once before giving your final answer, for every query, even if the user did not ask for a fun fact.
- If the user asks for multiple fun facts, call the tool once per fact requested.
- End every answer with the fun fact as its own Markdown paragraph (preceded by a blank line), with the label in bold, exactly like: "**Pavlos' fun fact:** <fact>". For multiple facts, put each on its own line in this format.
"""

# Max LLM round trips in the agent loop before forcing a text answer
MAX_AGENT_STEPS = 5

# Dictionary to store user sessions
user_sessions: Dict[str, Any] = {}


def generate_query_embedding(query):
    response = llm_client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=query,
        config=types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIMENSION),
    )
    return response.embeddings[0].values


def generate_chat_response(input_prompt):
    response = llm_client.models.generate_content(
        model=GENERATIVE_MODEL,
        contents=input_prompt,  # Input prompt
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            **generation_config,  # Configuration settings
        ),
    )
    return response.text


def generate_fine_tune_chat_response(input_prompt):
    ft_client  = genai.Client(vertexai=True, project=GCP_PROJECT, location="us")
    response = ft_client.models.generate_content(
        model=FINE_TUNE_GENERATIVE_MODEL,
        contents=input_prompt,  # Input prompt
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            **generation_config,  # Configuration settings
        ),
    )
    return response.text


def generate_agent_call(query, chunks="", function_name="", first_call=True):
    # User prompt
    user_prompt_content = Content(
        role="user",
        parts=[
            Part.from_text(text=query),
        ],
    )

    # Step 1: Prompt LLM to find the tool(s) to execute to find the relevant chunks in vector db
    print("user_prompt_content: ", user_prompt_content)
    response = llm_client.models.generate_content(
        model=GENERATIVE_MODEL,
        contents=user_prompt_content,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION_AGENT,
            temperature=0,  # Configuration settings
            tools=[agent_tools.cheese_expert_tool],  # Tools available to the model
            tool_config=types.ToolConfig(
                function_calling_config=types.FunctionCallingConfig(
                    # ANY mode forces the model to predict only function calls
                    mode="any",
                )
            ),
        ),
    )
    print("LLM Response:", response)
    if first_call:
        agent_response = []
        for candidate in response.candidates:
            function_calls = [
                part.function_call
                for part in candidate.content.parts
                if part.function_call
            ]
            function_call = function_calls[0]
            args = dict(function_call.args)
            if "search_content" in args:
                args["search_content"] = generate_query_embedding(
                    args["search_content"]
                )

            agent_response.append(
                {
                    "function_name": function_call.name,
                    "args": args,
                }
            )
        return agent_response
    else:
        # Step 2: Send the chunks retrieved by the frontend back to the LLM, then let it
        # call server-side tools (e.g. pavlos_fun_fact_tool) as many times as it needs
        contents = [
            user_prompt_content,  # User prompt
            response.candidates[0].content,  # Function call response
            Content(
                role="user",
                parts=[
                    Part.from_function_response(
                        name=function_name,
                        response={
                            "content": chunks,
                        },
                    )
                ],
            ),
        ]
        for step in range(MAX_AGENT_STEPS):
            # On the last step, disable tools so the model must answer in text
            mode = "none" if step == MAX_AGENT_STEPS - 1 else "auto"
            response = llm_client.models.generate_content(
                model=GENERATIVE_MODEL,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION_AGENT,
                    tools=[agent_tools.cheese_expert_tool, agent_tools.fun_fact_tool],
                    tool_config=types.ToolConfig(
                        function_calling_config=types.FunctionCallingConfig(mode=mode)
                    ),
                ),
            )
            print(f"LLM Response (step {step}):", response)
            if not response.function_calls:
                return response.text or ""

            contents.append(response.candidates[0].content)
            contents.append(
                Content(
                    role="user",
                    parts=agent_tools.execute_server_tool_calls(response.function_calls),
                )
            )
        return response.text or ""


@router.get("/embedding")
async def get_text_embedding(
    text: str = Query(..., description="Text to get embedding for")
) -> Dict[str, Any]:
    embedding = generate_query_embedding(text)
    return {"embedding": embedding}


@router.post("/llm-response")
async def get_llm_response(request: Dict[str, Any] = Body(...)) -> Dict[str, str]:
    prompt = request.get("prompt")
    if not prompt:
        return {"error": "No prompt provided"}
    response = generate_chat_response(prompt)
    return {"response": response}


@router.get("/agent_call")
async def get_agent_call(
    query: str = Query(..., description="Text to get embedding for")
) -> Dict[str, Any]:
    agent_response = generate_agent_call(query)
    return {"response": agent_response}


@router.post("/llm-agent-response")
async def get_llm_response(request: Dict[str, Any] = Body(...)) -> Dict[str, str]:
    query = request.get("query")
    if not query:
        return {"error": "No query provided"}

    chunks = request.get("chunks")
    function_name = request.get("function_name")
    agent_response = generate_agent_call(
        query, chunks=chunks, function_name=function_name, first_call=False
    )
    return {"response": agent_response}


@router.post("/fine-tune-llm-response")
async def get_fine_tune_llm_response(
    request: Dict[str, Any] = Body(...),
) -> Dict[str, str]:
    prompt = request.get("prompt")
    if not prompt:
        return {"error": "No prompt provided"}
    response = generate_fine_tune_chat_response(prompt)
    return {"response": response}
