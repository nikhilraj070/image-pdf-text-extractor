import React, { useState } from "react";
import { createWorker } from "tesseract.js";
import * as pdfjslib from "pdfjs-dist";

pdfjslib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).toString();

function files() {
  const [files, setFiles] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  const handlefiles = (e) => {
    const file = e.target.files[0];

    if (file) {
      setFiles(file);
      setText("");
      setProgress("");
    }
  };

  const textScan = async () => {
    if (!files) {
      alert("Please select an files or PDF");
      return;
    }

    setLoading(true);
    setText("");

    let worker;

    try {

      worker = await createWorker("eng+hin");

      if (files.type.startsWith("image/")) {
        setProgress("Scanning images");
        const result = await worker.recognize(files);
        const extractedText = result.data.text.trim();
        setText(extractedText || "Image has no text");
      }
      
      
      else if (files.type === "application/pdf") {
        setProgress("Loading PDF");
        const buffer = await files.arrayBuffer();
        const pdf = await pdfjslib.getDocument({
          data: buffer,
        }).promise;
        let extractedText = "";
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          setProgress(`Scanning page ${pageNum} of ${pdf.numPages}...`);
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;
          const result = await worker.recognize(canvas);
          extractedText += `\n Page-${pageNum}\n` + result.data.text + "\n";
          page.cleanup();
          canvas.width = 0;
          canvas.height = 0;
        }
        setText(extractedText.trim() || "PDF has no text");
      } 
      
      else {
        alert("select  image or PDF");
      }
    } 
    
    catch (error) {
      console.error(error);
      alert("Text extraction failed");
    } 
    finally {
      if (worker) {
        await worker.terminate();
      }
      setLoading(false);
      setProgress("");
    }
  };
  return (
    <div className="w-screen min-h-screen p-6">
      <h1 className="text-2xl font-bold">files to Text Converter</h1>

      <input
        type="file"
        onChange={handlefiles}
        accept="image/*,.pdf"
        className="mt-4"
      />

      {files && files.type.startsWith("image/") && (
        <div className="mt-4">
          <img
            src={URL.createObjectURL(files)}
            alt="Selected files"
            width="300"
          />
        </div>
      )}

      {files && files.type === "application/pdf" && (
        <p className="mt-4">Selected PDF: {files.name}</p>
      )}

      <div className="mt-4">
        <button
          onClick={textScan}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          {loading ? "Scanning..." : "Scan the text"}
        </button>
      </div>

      {loading && <p className="mt-3">{progress}</p>}

      <h2 className="text-xl font-semibold mt-6">Extracted Text</h2>

      <textarea
        rows="12"
        className="w-full border p-3 mt-2"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Text will appear hrer"
      />
    </div>
  );
}

export default files;
