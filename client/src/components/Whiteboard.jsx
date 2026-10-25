import React, { useRef, useState, useEffect } from 'react';
import { Pen, Eraser, Trash2, Download, X, Maximize2, Minimize2 } from 'lucide-react';

export default function Whiteboard({ isOpen, onClose }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#2563eb');
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState('pen'); // 'pen' | 'highlighter' | 'eraser'
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Resize canvas based on container
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      // preserve drawing on resize
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = rect.width;
      canvas.height = rect.height;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      try {
        ctx.putImageData(imgData, 0, 0);
      } catch (e) {}
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [isOpen, isFullScreen]);

  if (!isOpen) return null;

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 20;
    } else if (tool === 'highlighter') {
      ctx.strokeStyle = color + '66'; // semi-transparent
      ctx.lineWidth = 14;
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `nexvora-whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const colors = ['#0f172a', '#dc2626', '#2563eb', '#16a34a', '#d97706', '#9333ea'];

  return (
    <div className={`fixed z-50 transition-all ${
      isFullScreen 
        ? 'inset-0 bg-black/80 flex items-center justify-center p-3' 
        : 'bottom-20 right-6 w-full max-w-xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden'
    }`}>
      <div className={`flex flex-col bg-white dark:bg-slate-900 ${isFullScreen ? 'w-full h-full rounded-2xl overflow-hidden border border-slate-700' : 'h-[480px]'}`}>
        
        {/* Whiteboard Toolbar Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Interactive Whiteboard
            </span>
            <div className="h-4 w-px bg-slate-300 dark:bg-slate-600 mx-1" />
            
            {/* Tools */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTool('pen')}
                className={`p-1.5 rounded-lg text-xs flex items-center gap-1 font-medium transition-colors ${
                  tool === 'pen' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                title="Pen"
              >
                <Pen className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setTool('highlighter')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tool === 'highlighter' ? 'bg-amber-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                title="Highlighter"
              >
                Marker
              </button>

              <button
                type="button"
                onClick={() => setTool('eraser')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tool === 'eraser' ? 'bg-rose-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                title="Eraser"
              >
                <Eraser className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Color Palette */}
            {tool !== 'eraser' && (
              <div className="flex items-center gap-1 ml-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-5 h-5 rounded-full transition-transform ${
                      color === c ? 'scale-125 ring-2 ring-blue-400 ring-offset-1' : 'opacity-80 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={clearCanvas}
              title="Clear Whiteboard"
              className="p-1.5 text-slate-500 hover:text-rose-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={downloadCanvas}
              title="Save as Image"
              className="p-1.5 text-slate-500 hover:text-blue-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsFullScreen(!isFullScreen)}
              title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-rose-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 w-full bg-white relative cursor-crosshair">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-full block touch-none"
          />
        </div>
      </div>
    </div>
  );
}
