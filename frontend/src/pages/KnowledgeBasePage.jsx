import { useEffect, useRef, useState } from "react";
import { LinearProgress, Alert } from "@mui/material";
import { UploadFileOutlined, DeleteOutlineOutlined, DescriptionOutlined } from "@mui/icons-material";
import Topbar from "../components/Topbar";
import { knowledgeApi } from "../api/endpoints";

export default function KnowledgeBasePage() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  function load() {
    setLoading(true);
    knowledgeApi.list().then((res) => setDocs(res.data)).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleFiles(fileList) {
    const files = Array.from(fileList);
    setError("");
    for (const file of files) {
      const ext = file.name.split(".").pop().toLowerCase();
      if (!["pdf", "docx", "txt"].includes(ext)) {
        setError(`${file.name}: unsupported file type. Use PDF, DOCX, or TXT.`);
        continue;
      }
      try {
        setUploadProgress(0);
        await knowledgeApi.upload(file, (evt) => {
          setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
        });
      } catch (err) {
        setError(err.response?.data?.detail || `Couldn't upload ${file.name}.`);
      } finally {
        setUploadProgress(null);
      }
    }
    load();
  }

  async function handleDelete(id) {
    await knowledgeApi.remove(id);
    load();
  }

  return (
    <>
      <Topbar title="Knowledge Base" subtitle="Documents here are chunked, embedded, and retrieved for every AI reply." />
      <main className="p-8 space-y-6">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-card p-10 text-center cursor-pointer transition-colors ${
            dragOver ? "border-teal bg-teal-light" : "border-white/40 bg-white/40 hover:bg-white/60 backdrop-blur-xl shadow-glass"
          }`}
        >
          <UploadFileOutlined sx={{ fontSize: 32 }} className="text-ink-muted" />
          <p className="font-display text-ink mt-2">Drop files here, or click to browse</p>
          <p className="text-xs text-ink-muted mt-1">PDF, DOCX, or TXT -- chunked at 500 chars / 100 overlap</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {uploadProgress !== null && (
          <div>
            <LinearProgress variant="determinate" value={uploadProgress} sx={{ borderRadius: 2, height: 6 }} />
            <p className="text-xs text-ink-muted mt-1 font-mono">Uploading & embedding… {uploadProgress}%</p>
          </div>
        )}
        {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}

        <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-[2rem] shadow-glass transition-all duration-300 hover:shadow-glass-hover overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-ink-muted text-xs font-mono uppercase">
                <th className="px-5 py-3 font-medium">Document</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Chunks</th>
                <th className="px-5 py-3 font-medium">Uploaded</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-ink-muted font-mono text-xs">Loading…</td></tr>
              ) : docs.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-ink-muted">
                  No documents yet -- upload your first policy doc or FAQ above.
                </td></tr>
              ) : (
                docs.map((d) => (
                  <tr key={d.id} className="border-b border-border last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-3 flex items-center gap-2 text-ink">
                      <DescriptionOutlined sx={{ fontSize: 18 }} className="text-ink-muted" />
                      {d.filename}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs uppercase text-ink-muted">{d.file_type}</td>
                    <td className="px-5 py-3 font-mono text-xs text-ink-muted">{d.chunk_count}</td>
                    <td className="px-5 py-3 font-mono text-xs text-ink-muted">
                      {new Date(d.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => handleDelete(d.id)} className="text-ink-muted hover:text-rose-dark">
                        <DeleteOutlineOutlined fontSize="small" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
