
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Guest } from '../types';
import { Check, AlertCircle, X, Scan, Loader2, RefreshCw, ChevronRight, User, Building, Clock, SwitchCamera } from 'lucide-react';

interface QRScannerProps {
  onScan: (id: string) => { success: boolean; guest?: Guest; message: string };
  onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ success: boolean; guest?: Guest; message: string } | null>(null);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const mountedRef = useRef(true);

  // Initialize Scanner
  useEffect(() => {
    mountedRef.current = true;
    const elementId = "qr-reader";

    const startScanner = async () => {
      // 1. Check DOM Element
      if (!document.getElementById(elementId)) {
        console.warn("Scanner element not found in DOM");
        return;
      }

      // 2. Cleanup previous instance if active
      if (scannerRef.current) {
        try {
            if (scannerRef.current.isScanning) {
              await scannerRef.current.stop();
            }
            scannerRef.current.clear();
        } catch (e) {
            console.warn("Cleanup warning:", e);
        }
      }

      try {
        // 3. Create new instance
        const scanner = new Html5Qrcode(elementId);
        scannerRef.current = scanner;

        // 4. Mobile-Optimized Config
        const config = {
          fps: 10,
          qrbox: undefined, // Disable qrbox to allow full-screen scanning
          aspectRatio: undefined, // Allow scanner to determine native aspect ratio
          disableFlip: false, // Auto-detect mirroring
        };

        const onScanSuccess = (decodedText: string) => {
          if (!mountedRef.current) return;
          
          try {
            scanner.pause(true);
          } catch(e) {
            console.warn("Pause warning:", e);
          }
          setScanning(false);
          
          const result = onScan(decodedText);
          setLastResult(result);
        };

        const onScanFailure = (errorMessage: string) => {
            // scan failure is common for every frame that doesn't have a QR code.
            // We ignore these to prevent log spam.
        };

        // 5. Start Camera
        try {
          await scanner.start(
            { facingMode: facingMode }, // Use state: environment (rear) or user (front)
            config,
            onScanSuccess,
            onScanFailure
          );
          
          if(mountedRef.current) {
            setCameraPermission(true);
            setError(null);
          }

        } catch (startError: any) {
          console.error("Camera start failed:", startError);
          
          // Auto-fallback logic: If environment camera fails, try user camera
          if (facingMode === "environment") {
             console.log("Attempting fallback to user camera...");
             try {
                await scanner.start(
                  { facingMode: "user" },
                  config,
                  onScanSuccess,
                  onScanFailure
                );
                if(mountedRef.current) {
                    setCameraPermission(true);
                    setFacingMode("user");
                    setError(null);
                }
             } catch (fallbackError: any) {
                if (mountedRef.current) {
                    // Show the specific error message to help debugging
                    setError(`Camera Error: ${fallbackError?.message || fallbackError}`);
                    setCameraPermission(false);
                }
             }
          } else {
             if (mountedRef.current) {
                 setError(`Camera Error: ${startError?.message || startError}`);
                 setCameraPermission(false);
             }
          }
        }
      } catch (e: any) {
        console.error("Scanner initialization critical error:", e);
        if (mountedRef.current) setError(`Init Error: ${e?.message || e}`);
      }
    };

    // Tiny delay to ensure layout is painted before scanner init
    const timer = setTimeout(startScanner, 500);

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        // Attempt clean stop
        try {
           if (scannerRef.current.isScanning) {
               scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(console.warn);
           } else {
               scannerRef.current.clear();
           }
        } catch(e) { console.warn("Unmount cleanup warning:", e); }
      }
    };
  }, [onScan, facingMode]); 

  const handleNext = () => {
    setLastResult(null);
    setScanning(true);
    if (scannerRef.current) {
        try {
            scannerRef.current.resume();
        } catch (e) {
            // If resume fails, hard reload the scanner
             window.location.reload();
        }
    }
  };

  const toggleCamera = () => {
    // Changing this state triggers the useEffect to restart the scanner with new mode
    setFacingMode(prev => prev === "environment" ? "user" : "environment");
    setScanning(true);
    setLastResult(null);
    setError(null);
    setCameraPermission(null);
  };

  const handleRetry = () => {
     window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col h-[100dvh]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 bg-zinc-900/90 backdrop-blur-md absolute top-0 left-0 right-0 z-30 border-b border-zinc-800">
         <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-yellow-600/20 flex items-center justify-center text-yellow-500">
                <Scan size={18} />
            </div>
            <div>
                <h2 className="font-bold text-sm text-white leading-none">Check-In Scanner</h2>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                   {facingMode === 'environment' ? 'Rear Camera' : 'Front Camera'}
                </p>
            </div>
         </div>
         <div className="flex items-center gap-2">
            <button 
                onClick={toggleCamera}
                className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors border border-zinc-700"
                title="Switch Camera"
            >
                <SwitchCamera size={20} />
            </button>
            <button 
                onClick={onClose}
                className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors border border-zinc-700"
            >
                <X size={20} />
            </button>
         </div>
      </div>

      {/* Main Scanner Viewport - Full Screen Mobile Friendly */}
      <div className="flex-1 relative bg-black overflow-hidden mt-16">
         {/* Container fills available space. Important: We don't force aspect ratios here, let the video fill. */}
         <div id="qr-reader" className="w-full h-full bg-black relative"></div>
         
         {/* Loading State */}
         {scanning && !error && !cameraPermission && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-zinc-900">
                <div className="text-center">
                    <Loader2 className="animate-spin text-yellow-500 mx-auto mb-4" size={48} />
                    <p className="text-sm text-zinc-400 font-medium">Starting Camera...</p>
                    <p className="text-xs text-zinc-600 mt-2">Please allow camera access</p>
                </div>
            </div>
         )}

         {/* Visual Feedback Overlay (Success/Failure) */}
         {lastResult && (
             <div className={`absolute inset-0 z-30 flex flex-col items-center justify-center pt-10 pb-40 ${
                lastResult.success ? 'bg-green-500/60' : 'bg-red-500/60'
             } backdrop-blur-sm animate-in fade-in duration-200`}>
                <div className={`w-32 h-32 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.5)] mb-8 border-4 border-white ${
                    lastResult.success ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                } animate-in zoom-in duration-300`}>
                    {lastResult.success ? <Check size={64} strokeWidth={4} /> : <X size={64} strokeWidth={4} />}
                </div>
                <h3 className="text-3xl font-bold text-white drop-shadow-lg text-center px-4">
                    {lastResult.success ? 'Verified' : 'Error'}
                </h3>
             </div>
         )}

         {/* Error State - CRITICAL for debugging */}
         {error && (
            <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center p-8 text-center z-50">
                <div className="bg-red-500/10 p-4 rounded-full mb-4">
                    <AlertCircle className="text-red-500" size={48} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Scanner Issue</h3>
                <p className="text-red-300 mb-6 font-mono text-xs break-all border border-red-900/50 bg-red-900/10 p-3 rounded-lg w-full">
                    {error}
                </p>
                <div className="flex gap-3">
                    <button onClick={handleRetry} className="bg-white text-black px-6 py-3 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-colors">
                        Reload Page
                    </button>
                    <button onClick={onClose} className="bg-zinc-800 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-zinc-700 transition-colors">
                        Close
                    </button>
                </div>
            </div>
         )}

         {/* Guidance Overlay - Minimal Design (Full Screen) */}
         {scanning && !error && !lastResult && (
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between z-20 p-8">
                {/* Top Markers */}
                <div className="flex justify-between">
                    <div className="w-12 h-12 border-l-4 border-t-4 border-yellow-500 rounded-tl-xl"></div>
                    <div className="w-12 h-12 border-r-4 border-t-4 border-yellow-500 rounded-tr-xl"></div>
                </div>

                {/* Scan Line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-75 shadow-[0_0_20px_rgba(234,179,8,0.8)] animate-[scan_2.5s_ease-in-out_infinite]"></div>

                {/* Bottom Markers */}
                <div className="flex justify-between items-end">
                    <div className="w-12 h-12 border-l-4 border-b-4 border-yellow-500 rounded-bl-xl"></div>
                    <div className="w-12 h-12 border-r-4 border-b-4 border-yellow-500 rounded-br-xl"></div>
                </div>

                {/* Center Text */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center opacity-70">
                    <p className="text-xs font-bold text-white uppercase tracking-[0.2em] drop-shadow-lg">
                        Scanning Area
                    </p>
                </div>
            </div>
         )}
      </div>

      {/* Result Bottom Sheet */}
      {lastResult && (
        <div className="absolute inset-0 z-40 flex flex-col justify-end pointer-events-none">
            {/* The Sheet itself - enable pointer events */}
            <div className="w-full bg-zinc-900/95 backdrop-blur-xl border-t border-white/10 rounded-t-3xl p-6 shadow-2xl pointer-events-auto animate-in slide-in-from-bottom-full duration-300 max-h-[70vh] flex flex-col">
                
                <div className="flex-1 overflow-y-auto custom-scrollbar mb-4">
                    {/* Status Header */}
                    <div className="flex items-center gap-4 mb-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                            lastResult.success ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                        }`}>
                            {lastResult.success ? <Check size={24} strokeWidth={3} /> : <X size={24} strokeWidth={3} />}
                        </div>
                        <div>
                            <h3 className={`text-xl font-bold leading-tight ${
                                lastResult.success ? 'text-white' : 'text-red-500'
                            }`}>
                                {lastResult.success ? 'Access Granted' : 'Check-In Failed'}
                            </h3>
                            <p className="text-xs text-zinc-400 font-mono mt-0.5">{new Date().toLocaleTimeString()}</p>
                        </div>
                    </div>

                    {/* Error Banner */}
                    {!lastResult.success && (
                         <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-3 mb-4 flex gap-3 items-start">
                             <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
                             <div className="space-y-1">
                                <p className="text-xs text-red-200/80 leading-relaxed">{lastResult.message}</p>
                             </div>
                        </div>
                    )}

                    {/* Guest Details Card */}
                    {lastResult.guest && (
                        <div className={`rounded-2xl p-4 border space-y-3 ${
                            lastResult.success ? 'bg-black/40 border-white/5' : 'bg-zinc-950/50 border-red-500/10 opacity-75'
                        }`}>
                            <div className="flex items-start gap-3">
                                <div className="mt-1"><User size={14} className="text-zinc-500" /></div>
                                <div>
                                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Guest Name</p>
                                    <p className="text-base font-bold text-white leading-tight">{lastResult.guest.name}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-1"><Building size={14} className="text-zinc-500" /></div>
                                <div>
                                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Organization</p>
                                    <p className="text-sm text-zinc-300">{lastResult.guest.organization}</p>
                                    <p className="text-xs text-zinc-500">{lastResult.guest.designation}</p>
                                </div>
                            </div>
                            
                            {!lastResult.success && lastResult.guest.checkInTime && (
                                <div className="pt-2 border-t border-white/5 mt-2 flex items-start gap-3">
                                    <div className="mt-1"><Clock size={14} className="text-zinc-500" /></div>
                                    <div>
                                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Scanned At</p>
                                        <p className="text-xs text-zinc-300 font-mono">
                                            {new Date(lastResult.guest.checkInTime).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {lastResult.guest.awardCategory !== 'Not an Award Recipient' && (
                                <div className="pt-2 border-t border-white/5 mt-2">
                                    <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest bg-yellow-900/20 px-2 py-1 rounded border border-yellow-500/20">
                                    {lastResult.guest.awardCategory}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                {/* Action Button */}
                <button 
                onClick={handleNext}
                className={`w-full font-bold text-lg py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg ${
                    lastResult.success 
                    ? 'bg-white hover:bg-zinc-200 text-black' 
                    : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
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
      )}

      {/* Global Style Override for html5-qrcode video element */}
      <style>{`
        #qr-reader {
           border: none !important;
        }
        #qr-reader video { 
            object-fit: cover; 
            width: 100% !important; 
            height: 100% !important; 
            border-radius: 0 !important;
        }
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default QRScanner;
