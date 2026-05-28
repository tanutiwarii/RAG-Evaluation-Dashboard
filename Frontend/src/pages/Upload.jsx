import { useEffect, useState } from "react";
import axios from "axios";

function Upload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/documents");
      setDocuments(response.data.documents);
    } catch (error) {
      console.error(error);
    }
  };

  const uploadPdf = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      setUploadMessage("");

      const response = await axios.post(
        "http://127.0.0.1:8000/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setUploadMessage(response.data.message);
      setFile(null);
      await fetchDocuments();
    } catch (error) {
      console.error(error);
      setUploadMessage("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeDocument = async (sourceName) => {
    try {
      await axios.delete(`http://127.0.0.1:8000/documents/${sourceName}`);
      await fetchDocuments();
    } catch (error) {
      console.error(error);
    }
  };

  const clearKnowledgeBase = async () => {
    try {
      await axios.delete("http://127.0.0.1:8000/documents");
      await fetchDocuments();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <h1 className="text-5xl font-bold mb-4">Upload Documents</h1>

      <p className="text-slate-400 mb-8">
        Upload PDFs and manage your RAG knowledge base.
      </p>

      <div className="bg-slate-800 p-6 rounded-xl shadow-lg mb-8">
        <h2 className="text-2xl font-semibold mb-4">
          Upload Knowledge Base PDF
        </h2>

        <div className="flex gap-4 items-center">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files[0])}
            className="block w-full text-sm text-slate-300"
          />

          <button
            onClick={uploadPdf}
            className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>

        {uploadMessage && (
          <p className="mt-4 text-green-400">{uploadMessage}</p>
        )}
      </div>

      <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Knowledge Base</h2>

          <button
            onClick={clearKnowledgeBase}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm"
          >
            Clear All
          </button>
        </div>

        <div className="space-y-3">
          {documents.length === 0 && (
            <p className="text-slate-400">No documents loaded.</p>
          )}

          {documents.map((doc, index) => (
            <div
              key={index}
              className="flex justify-between items-center bg-slate-700 p-4 rounded-lg"
            >
              <span>{doc}</span>

              <button
                onClick={() => removeDocument(doc)}
                className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Upload;