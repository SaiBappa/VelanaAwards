
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Guest } from '../types';
import { Check, AlertCircle, X, Camera, Scan, Loader2, RefreshCw, ChevronRight, User, Building, Clock } from 'lucide-react';

interface QRScannerProps {
  onScan: (id: string) => { success: boolean; guest?: Guest; message: string };
  onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ success: boolean; guest?: Guest; message: string } | null>(null);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const elementId = "qr-reader";
    let scanner: Html5Qrcode | null = null;

    const initializeScanner = async () => {
      if (!document.getElementById(elementId)) {
        console.error("Scanner element not found");
        return;
      }

      try {
        scanner = new Html5Qrcode(elementId);
        scannerRef.current = scanner;
      } catch (e) {
        if (mountedRef.current) setError("Failed to initialize camera.");
        return;
      }

      // Responsive config
      const isMobile = window.innerWidth < 768;
      const config = {
        fps: 10,
        qrbox: isMobile ? { width: 250, height: 250 } : { width: 300, height: 300 },
        aspectRatio: 1.0, 
        disableFlip: false,
      };

      const onScanSuccess = (decodedText: string) => {
        if (!mountedRef.current) return;
        scanner?.pause(true);
        setScanning(false);
        const result = onScan(decodedText);
        setLastResult(result);
      };

      try {
        await scanner.start(
          { facingMode: "environment" },
          config,
          onScanSuccess,
          () => {}
        );
      } catch (envError) {
        try {
          if (mountedRef.current && scanner) {
             await scanner.start(
              { facingMode: "user" },
              config,
              onScanSuccess,
              () => {}
            );
          }
        } catch (userError) {
          if (mountedRef.current) {
            setError("Camera access denied.");
            setScanning(false);
          }
        }
      }
    };

    const timer = setTimeout(initializeScanner, 100);

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(console.warn);
      }
    };
  }, [onScan]);

  const handleNext = () => {
    setLastResult(null);
    setScanning(true);
    if (scannerRef.current) {
        scannerRef.current.resume();
    }
  };

  const handleRetry = () => {
    window.location.reload(); 
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col h-[100dvh]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-black/60 backdrop-blur-md absolute top-0 left-0 right-0 z-30 border-b border-white/10">
         <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-yellow-600/20 flex items-center justify-center text-yellow-500">
                <Scan size={18} />
            </div>
            <div>
                <h2 className="font-bold text-sm text-white leading-none">Check-In Scanner</h2>
                <p className="text-[10px] text-zinc-400 mt-0.5">Ready to scan</p>
            </div>
         </div>
         <button 
           onClick={onClose}
           className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
         >
           <X size={20} />
         </button>
      </div>

      {/* Main Scanner Viewport */}
      <div className="flex-1 relative flex flex-col items-center justify-center bg-black overflow-hidden">
         {/* The Camera Container */}
         <div className="w-full max-w-md aspect-square relative rounded-3xl overflow-hidden shadow-2xl border-2 border-zinc-800/50 bg-zinc-900 mx-4">
             <div id="qr-reader" className="w-full h-full object-cover"></div>
             
             {/* Loading State */}
             {scanning && !error && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Loader2 className="animate-spin text-yellow-500/80" size={48} />
                </div>
             )}

             {/* Error State */}
             {error && (
                <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center p-6 text-center">
                    <AlertCircle className="text-red-500 mb-4" size={48} />
                    <p className="text-zinc-300 mb-6">{error}</p>
                    <button onClick={handleRetry} className="bg-zinc-800 px-6 py-3 rounded-xl font-bold text-sm">Retry</button>
                </div>
             )}

             {/* Guidance Overlay */}
             {scanning && !error && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-[70%] h-[70%] border-2 border-yellow-500/50 rounded-2xl relative shadow-[0_0_0_1000px_rgba(0,0,0,0.6)]">
                         <div className="absolute top-0 left-0 w-4 h-4 border-l-4 border-t-4 border-yellow-500 -ml-0.5 -mt-0.5 rounded-tl-md"></div>
                         <div className="absolute top-0 right-0 w-4 h-4 border-r-4 border-t-4 border-yellow-500 -mr-0.5 -mt-0.5 rounded-tr-md"></div>
                         <div className="absolute bottom-0 left-0 w-4 h-4 border-l-4 border-b-4 border-yellow-500 -ml-0.5 -mb-0.5 rounded-bl-md"></div>
                         <div className="absolute bottom-0 right-0 w-4 h-4 border-r-4 border-b-4 border-yellow-500 -mr-0.5 -mb-0.5 rounded-br-md"></div>
                         <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
                    </div>
                    <p className="absolute bottom-8 text-xs font-bold text-white/80 uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">Align QR Code</p>
                </div>
             )}
         </div>
      </div>

      {/* Result Bottom Sheet / Overlay */}
      {lastResult && (
        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-xl flex flex-col justify-end md:items-center md:justify-center p-0 md:p-4 animate-in fade-in duration-300">
            <div className="w-full md:max-w-sm bg-zinc-900 border-t md:border border-zinc-700 rounded-t-3xl md:rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-10 duration-300">
                
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* Status Header */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
                            lastResult.success ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                        }`}>
                            {lastResult.success ? <Check size={28} strokeWidth={3} /> : <X size={28} strokeWidth={3} />}
                        </div>
                        <div>
                            <h3 className={`text-2xl font-bold leading-tight ${
                                lastResult.success ? 'text-white' : 'text-red-500'
                            }`}>
                                {lastResult.success ? 'Access Granted' : 'Check-In Failed'}
                            </h3>
                            <p className="text-xs text-zinc-400 font-mono mt-1">{new Date().toLocaleTimeString()}</p>
                        </div>
                    </div>

                    {/* Error Banner */}
                    {!lastResult.success && (
                         <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-6 flex gap-3 items-start">
                             <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                             <div className="space-y-1">
                                <p className="text-sm font-bold text-red-400">Entry Denied</p>
                                <p className="text-xs text-red-200/80 leading-relaxed">{lastResult.message}</p>
                             </div>
                        </div>
                    )}

                    {/* Guest Details Card */}
                    {lastResult.guest && (
                        <div className={`rounded-2xl p-5 border space-y-4 mb-6 ${
                            lastResult.success ? 'bg-black/40 border-white/5' : 'bg-zinc-950/50 border-red-500/10 opacity-75'
                        }`}>
                            <div className="flex items-start gap-3">
                                <div className="mt-1"><User size={16} className="text-zinc-500" /></div>
                                <div>
                                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Guest Name</p>
                                    <p className="text-lg font-bold text-white leading-tight">{lastResult.guest.name}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-1"><Building size={16} className="text-zinc-500" /></div>
                                <div>
                                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Organization</p>
                                    <p className="text-sm text-zinc-300">{lastResult.guest.organization}</p>
                                    <p className="text-xs text-zinc-500">{lastResult.guest.designation}</p>
                                </div>
                            </div>
                            
                            {/* Check-in timestamp if failure due to duplicate */}
                            {!lastResult.success && lastResult.guest.checkInTime && (
                                <div className="pt-3 border-t border-white/5 mt-2 flex items-start gap-3">
                                    <div className="mt-1"><Clock size={16} className="text-zinc-500" /></div>
                                    <div>
                                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Previously Scanned At</p>
                                        <p className="text-xs text-zinc-300 font-mono">
                                            {new Date(lastResult.guest.checkInTime).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {lastResult.guest.awardCategory !== 'Not an Award Recipient' && (
                                <div className="pt-2 border-t border-white/5 mt-2">
                                    <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest bg-yellow-900/20 px-2 py-1 rounded border border-yellow-500/20">
                                    Nominee: {lastResult.guest.awardCategory}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                {/* Action Button */}
                <div className="pt-4 bg-zinc-900 border-t border-zinc-800 md:border-t-0 md:bg-transparent pb-6 md:pb-0">
                    <button 
                    onClick={handleNext}
                    className={`w-full font-bold text-lg py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all ${
                        lastResult.success 
                        ? 'bg-white hover:bg-zinc-200 text-black' 
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                    }`}
                    >
                        {lastResult.success ? (
                            <><span>Scan Next Guest</span><ChevronRight size={20} /></>
                        ) : (
                             <><span>Dismiss & Scan Next</span><RefreshCw size={18} /></>
                        )}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Helper Styles for Video Fit & Animation */}
      <style>{`
        #qr-reader video { 
            object-fit: cover; 
            width: 100%; 
            height: 100%; 
            border-radius: 1.5rem;
        }
        @keyframes scan {
          0%, 100% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          50% { top: 90%; opacity: 1; }
          90% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default QRScanner;
