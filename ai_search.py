import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings


# 📥 تحميل ملفات PDF
def load_docs():
    docs = []

    for file in os.listdir("data"):
        if file.endswith(".pdf"):
            file_path = os.path.join("data", file)
            loader = PyPDFLoader(file_path)
            docs.extend(loader.load())

    return docs


# ✂️ تقسيم النصوص
def split_docs(docs):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=150
    )
    return splitter.split_documents(docs)


# 🧠 بناء قاعدة البيانات
def build_rag():
    docs = load_docs()
    chunks = split_docs(docs)

    embeddings = HuggingFaceEmbeddings()

    Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory="chroma_db"
    )

    print("✔ RAG جاهز")


# 🔍 البحث داخل الملفات
def search_docs(query):
    embeddings = HuggingFaceEmbeddings()

    db = Chroma(
        persist_directory="chroma_db",
        embedding_function=embeddings
    )

    results = db.similarity_search(query, k=2)

    if not results:
        return None

    best = results[0]

    return f"""
📄 المصدر: {best.metadata.get('source', 'غير معروف')}
📌 الصفحة: {best.metadata.get('page', 'غير معروف')}

{best.page_content}
"""