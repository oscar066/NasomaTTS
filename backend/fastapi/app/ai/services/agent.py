"""
LangGraph ReAct agent for document chat.

Graph:  chatbot ──(tool call?)──► tools ──► chatbot
                └──(final answer)──► END

The LLM decides when to call the RAG tool — it is not hardwired on every turn.
Conversation memory is maintained per thread_id via InMemorySaver.
"""
import json
import uuid
from typing import Annotated, AsyncIterator

from langchain_core.messages import AIMessageChunk, SystemMessage
from langchain_core.prompts import ChatPromptTemplate
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from typing_extensions import TypedDict

from ...utils.logger import setup_logger
from .initializers import get_llm
from .tools.rag_tool import make_rag_tool

logger = setup_logger("nasoma.ai.agent")

SYSTEM_PROMPT = (
    "You are a helpful reading assistant. Help the user understand and explore their document. "
    "When the user asks about specific content, characters, events, or details from the document, "
    "always use the get_rag_answer tool to retrieve the relevant passages before answering. "
    "For general conversation or greetings, you can answer directly without the tool. "
    "Be concise, friendly, and accurate. Never make up content that isn't in the document."
)

# One InMemorySaver shared across all compiled agents
_memory = InMemorySaver()

# Cache compiled agents per document_id to avoid rebuilding the graph on every request
_agents: dict[str, object] = {}


def _get_agent(document_id: str):
    """Returns a compiled LangGraph agent scoped to the given document."""
    if document_id in _agents:
        return _agents[document_id]

    rag_tool = make_rag_tool(document_id)
    all_tools = [rag_tool]

    llm = get_llm()
    llm_with_tools = llm.bind_tools(all_tools)

    class State(TypedDict):
        messages: Annotated[list, add_messages]

    prompt = ChatPromptTemplate.from_messages(
        [("system", SYSTEM_PROMPT), ("placeholder", "{messages}")]
    )
    agent_chain = prompt | llm_with_tools

    async def chatbot_node(state: State):
        logger.info("Agent: chatbot node invoked")
        result = await agent_chain.ainvoke({"messages": state["messages"]})
        return {"messages": [result]}

    graph = (
        StateGraph(State)
        .add_node("chatbot", chatbot_node)
        .add_node("tools", ToolNode(tools=all_tools))
        .set_entry_point("chatbot")
        .add_conditional_edges("chatbot", tools_condition)
        .add_edge("tools", "chatbot")
        .compile(checkpointer=_memory)
    )

    _agents[document_id] = graph
    logger.info("Compiled agent for document %s", document_id)
    return graph


async def stream_chat(
    document_id: str,
    question: str,
    thread_id: str,
) -> AsyncIterator[str]:
    """Stream answer tokens from the ReAct agent for a given thread."""
    agent = _get_agent(document_id)
    graph_config = {"configurable": {"thread_id": thread_id}}

    async for event in agent.astream(
        {"messages": [("user", question)]},
        config=graph_config,
        stream_mode="messages",
    ):
        msg, metadata = event
        if metadata.get("langgraph_node") == "chatbot" and isinstance(msg, AIMessageChunk):
            if msg.content:
                yield msg.content
