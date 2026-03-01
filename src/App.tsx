import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Upload, Send, Loader2, X, MessageSquare, ChevronRight, FileUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { analyzePdf, chatWithPdf } from './services/gemini';
import { cn } from './lib/utils';

interface Message {
  role: 'user' | 'model';
  text: string;
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setMessages([]);
      
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        setPdfBase64(base64);
      };
      reader.readAsDataURL(selectedFile);
    }
  }, []);

  const handleGenerate = async () => {
    if (!pdfBase64 || isAnalyzing) return;
    
    setIsAnalyzing(true);
    try {
      const summary = await analyzePdf(pdfBase64, "Please provide a comprehensive summary and key insights of this PDF document.");
      if (summary) {
        setMessages([{ role: 'model', text: summary }]);
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      setMessages([{ role: 'model', text: "Sorry, I couldn't analyze this PDF. Please try again." }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false
  });

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !pdfBase64 || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      const response = await chatWithPdf(pdfBase64, history, userMessage);
      if (response) {
        setMessages(prev => [...prev, { role: 'model', text: response }]);
      }
    } catch (error) {
      console.error("Chat failed:", error);
      setMessages(prev => [...prev, { role: 'model', text: "I encountered an error while processing your request." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPdfBase64(null);
    setMessages([]);
    setInput('');
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-slate-900 font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-bottom border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <FileText className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">PDF Insight Pro</h1>
        </div>
        {file && (
          <button 
            onClick={reset}
            className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
          >
            <X className="w-4 h-4" />
            Close Document
          </button>
        )}
      </header>

      <main className="max-w-5xl mx-auto p-6 h-[calc(100vh-72px)] flex flex-col">
        <AnimatePresence mode="wait">
          {!file ? (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col items-center justify-center"
            >
              <div 
                {...getRootProps()} 
                className={cn(
                  "w-full max-w-2xl aspect-video border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300",
                  isDragActive ? "border-indigo-500 bg-indigo-50/50 scale-[1.02]" : "border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50/50"
                )}
              >
                <input {...getInputProps()} />
                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-2">
                  <Upload className={cn("w-8 h-8 transition-colors", isDragActive ? "text-indigo-600" : "text-indigo-400")} />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-slate-900">
                    {isDragActive ? "Drop your PDF here" : "Click or drag PDF to upload"}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">Maximum file size: 10MB</p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col gap-6 overflow-hidden"
            >
              {/* Document Info Bar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                    <FileText className="text-indigo-600 w-6 h-6" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-medium text-slate-900 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB • PDF Document</p>
                  </div>
                </div>
                {isAnalyzing && (
                  <div className="flex items-center gap-2 text-indigo-600 text-sm font-medium">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </div>
                )}
              </div>

              {/* Chat Area */}
              <div className="flex-1 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {messages.length === 0 && !isAnalyzing && (
                    <div className="h-full flex flex-col items-center justify-center text-center gap-6">
                      <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center">
                        <FileText className="w-10 h-10 text-indigo-600" />
                      </div>
                      <div className="max-w-sm">
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">Ready to Analyze</h3>
                        <p className="text-slate-500 text-sm mb-8">
                          Click the button below to generate a comprehensive summary and extract key insights from your document.
                        </p>
                        <button 
                          onClick={handleGenerate}
                          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 group"
                        >
                          <Loader2 className={cn("w-5 h-5 animate-spin hidden", isAnalyzing && "block")} />
                          {!isAnalyzing && <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                          Generate Insights
                        </button>
                      </div>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex gap-4 max-w-[85%]",
                        msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                        msg.role === 'user' ? "bg-slate-800" : "bg-indigo-600"
                      )}>
                        {msg.role === 'user' ? <div className="text-[10px] text-white font-bold">ME</div> : <FileText className="text-white w-4 h-4" />}
                      </div>
                      <div className={cn(
                        "p-4 rounded-2xl text-sm leading-relaxed",
                        msg.role === 'user' ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-800 border border-slate-100"
                      )}>
                        <div className="prose max-w-none">
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                        <Loader2 className="text-white w-4 h-4 animate-spin" />
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                          <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                          <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                  <form onSubmit={handleSend} className="relative flex items-center gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask anything about the document..."
                      className="flex-1 bg-white border border-slate-200 rounded-2xl px-5 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                      disabled={isLoading}
                    />
                    <button 
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="absolute right-2 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-200"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                  <p className="text-[10px] text-center text-slate-400 mt-3 uppercase tracking-widest font-semibold">
                    Powered by Gemini 3 Flash
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
