import json
import random
import time
from google.genai import types

# Specify a function declaration and parameters for an API request
get_book_by_author_func = types.FunctionDeclaration(
    name="get_book_by_author",
    description="Get the book chunks filtered by author name",
    # Function parameters are specified in OpenAPI JSON schema format
    parameters={
        "type": "object",
        "properties": {
            "author": {"type": "string", "description": "The author name","enum":["C. F. Langworthy and Caroline Louisa Hunt", "J. Twamley", "George E. Newell", "T. D. Curtis", "Charles Thom and W. W. Fisk", "Thomas Wilson Reid","Bob Brown", "Charles S. Brooks", "Pavlos Protopapas"]},
            "search_content": {"type": "string", "description": "The search text to filter content from books. The search term is compared against the book text based on cosine similarity. Expand the search term to a a sentence or two to get better matches"},
        },
        "required": ["author","search_content"],
    },
)
def get_book_by_author(author, search_content, collection, embed_func):

    query_embedding = embed_func(search_content)

    # Query based on embedding value 
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=10,
        where={"author":author}
    )
    return "\n".join(results["documents"][0])


get_book_by_search_content_func = types.FunctionDeclaration(
    name="get_book_by_search_content",
    description="Get the book chunks filtered by search terms",
    # Function parameters are specified in OpenAPI JSON schema format
    parameters={
        "type": "object",
        "properties": {
            "search_content": {"type": "string", "description": "The search text to filter content from books. The search term is compared against the book text based on cosine similarity. Expand the search term to a a sentence or two to get better matches"},
        },
        "required": ["search_content"],
    },
)
def get_book_by_search_content(search_content, collection, embed_func):

    query_embedding = embed_func(search_content)

    # Query based on embedding value 
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=10
    )
    return "\n".join(results["documents"][0])

# Define all functions available to the cheese expert
cheese_expert_tool = types.Tool(function_declarations=[get_book_by_author_func,get_book_by_search_content_func])


def execute_function_calls(function_calls,collection, embed_func):
    parts = []
    for function_call in function_calls:
        print("Function:",function_call.name)
        if function_call.name == "get_book_by_author":
            print("Calling function with args:", function_call.args["author"], function_call.args["search_content"])
            response = get_book_by_author(function_call.args["author"], function_call.args["search_content"],collection, embed_func)
            print("Response:", response)
            #function_responses.append({"function_name":function_call.name, "response": response})
            parts.append(
					types.Part.from_function_response(
						name=function_call.name,
						response={
							"content": response,
						},
					),
			)

    
    return parts

# --- Fun Facts data ---
PAVLOS_FUN_FACTS = [
    "Mozzarella is the most consumed cheese in the U.S., largely due to pizza.",
    "Gruyère and Emmental are classics for fondue thanks to their smooth melt.",
    "Aging boosts sharpness; 12-month cheddar has nuttier, deeper flavors.",
    "High-moisture cheeses (young gouda, fontina, jack) melt especially evenly.",
    "Rind-on bries are edible; the rind adds mushroomy, earthy notes.",
    "Salt helps control moisture and rind formation during cheesemaking.",
    "Browned spots on grilled cheese = Maillard reaction (not caramelization).",
    "American slices are engineered to melt at lower temperatures.",
    "Fresh cheeses (ricotta, chèvre) soften but don’t stretch like mozzarella.",
    "Taleggio’s washed rind brings savory depth and melts well.",
]

def pavlos_fun_fact():
  return {
      "fact": random.choice(PAVLOS_FUN_FACTS),
      "generated_at": int(time.time())
  }

# ✅ Define a Tool
def pavlos_fun_fact_tool() -> dict:
  """Return one random fun fact from Pavlos about cheese. Call multiple times if you want several facts."""
  return pavlos_fun_fact()

# No parameters: Vertex rejects an object schema with empty properties, so omit it
pavlos_fun_fact_func = types.FunctionDeclaration(
    name="pavlos_fun_fact_tool",
    description="Return one random fun fact from Pavlos about cheese. Call multiple times if you want several facts.",
)

# Tools the API server can execute itself (the book retrieval tools run in the frontend against ChromaDB)
fun_fact_tool = types.Tool(function_declarations=[pavlos_fun_fact_func])

SERVER_TOOLS = {
    "pavlos_fun_fact_tool": lambda args: pavlos_fun_fact_tool(),
}


def execute_server_tool_calls(function_calls):
    parts = []
    for function_call in function_calls:
        print("Function:", function_call.name, "args:", function_call.args)
        tool = SERVER_TOOLS.get(function_call.name)
        if tool:
            response = tool(dict(function_call.args or {}))
        else:
            response = {"error": f"{function_call.name} is not available at this step. Answer using the chunks already provided."}
        print("Response:", response)
        parts.append(
            types.Part.from_function_response(
                name=function_call.name,
                response=response,
            )
        )
    return parts
