from langchain.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.chains import RetrievalQA

def build_pipeline(pdf_path: str, chunk_strategy="recursive"):
    loader = PyPDFLoader(pdf_path)
    docs = loader.load()
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=512, chunk_overlap=64
    )
    chunks = splitter.split_documents(docs)
    vectordb = Chroma.from_documents(chunks,
        OpenAIEmbeddings(),
        persist_directory="./chroma_db"
    )
    return RetrievalQA.from_chain_type(
        llm=ChatOpenAI(model="gpt-4o-mini"),
        retriever=vectordb.as_retriever(search_kwargs={"k": 4}),
        return_source_documents=True
    )