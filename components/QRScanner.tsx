import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Guest } from '../types';
import { Check, AlertCircle, X, Camera, Scan, Loader2, RefreshCw } from 'lucide-react';

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
      // 1. Ensure element exists
      if (!document.getElementById(elementId)) {
        console.error("Scanner element not found");
        return;
      }

      // 2. Instantiate
      try {
        scanner = new Html5Qrcode(elementId);
        scannerRef.current = scanner;
      } catch (e) {
        console.error("Failed to create scanner instance", e);
        if (mountedRef.current) setError("Failed to initialize camera interface.");
        return;
      }

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false,
      };

      const onScanSuccess = (decodedText: string) => {
        if (!mountedRef.current) return;
        
        // Pause immediately to prevent multiple scans
        scanner?.pause(true);
        setScanning(false);
        
        const result = onScan(decodedText);
        setLastResult(result);
      };

      try {
        // 3. Try Environment Camera first
        await scanner.start(
          { facingMode: "environment" },
          config,
          onScanSuccess,
          () => {} // Ignore frame failures
        );
      } catch (envError) {
        console.warn("Environment camera failed, attempting user camera...", envError);
        
        // 4. Fallback to User Camera
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
          console.error("All camera attempts failed", userError);
          if (mountedRef.current) {
            setError("Camera access denied or unavailable. Please check permissions.");
            setScanning(false);
          }
        }
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(initializeScanner, 100);

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
      
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => {
            scannerRef.current?.clear();
        }).catch(err => {
            console.warn("Scanner stop failed during cleanup", err);
        });
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
    window.location.reload(); // Simple way to reset permissions state if totally borked
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6 backdrop-blur-md">
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 text-zinc-400 hover:text-white p-2 z-50 bg-black/20 rounded-full backdrop-blur-sm"
      >
        <X size={24} />
      </button>

      <div className="max-w-md w-full space-y-8 text-center relative z-10">
        <header>
          <h2 className="serif text-3xl font-bold gold-text">Guest Check-In</h2>
          <p className="text-zinc-400 mt-2">Scan the QR code on the guest's pass</p>
        </header>

        <div className="relative aspect-square w-full max-w-[320px] mx-auto overflow-hidden rounded-3xl border-4 border-zinc-800 bg-zinc-900 shadow-2xl flex flex-col">
          {/* The Scanner Element */}
          <div id="qr-reader" className="w-full h-full flex-1 bg-black rounded-2xl overflow-hidden"></div>
          
          {/* Loading State */}
          {scanning && !error && (
             <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50 pointer-events-none">
                <Loader2 className="animate-spin text-yellow-500/50" size={48} />
             </div>
          )}

          {/* Error State */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 p-8 text-red-500 text-center z-30">
               <AlertCircle size={48} className="mb-4" />
               <p className="text-sm font-medium mb-6">{error}</p>
               <button 
                 onClick={handleRetry}
                 className="flex items-center gap-2 bg-zinc-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-zinc-700 transition-colors"
               >
                 <RefreshCw size={14} /> Retry Camera
               </button>
            </div>
          )}
          
          {/* Scanning Overlay Animation */}
          {scanning && !error && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
               <div className="w-[200px] h-[200px] border-2 border-yellow-500/30 rounded-2xl relative">
                  <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-yellow-500 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-yellow-500 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-yellow-500 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-yellow-500 rounded-br-lg"></div>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-0.5 bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,1)] animate-[scan_2s_ease-in-out_infinite]"></div>
               </div>
            </div>
          )}

          {/* Result Overlay */}
          {lastResult && (
            <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center p-8 transition-all animate-in fade-in duration-300 ${
              lastResult.success ? 'bg-green-950/95' : 'bg-red-950/95'
            }`}>
              {lastResult.success ? (
                <div className="bg-green-500 text-black rounded-full p-4 mb-4 shadow-[0_0_20px_rgba(34,197,94,0.5)]">
                  <Check size={48} strokeWidth={3} />
                </div>
              ) : (
                <div className="bg-red-500 text-white rounded-full p-4 mb-4 shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                  <AlertCircle size={48} strokeWidth={3} />
                </div>
              )}
              <h3 className="text-2xl font-bold mb-2">{lastResult.success ? 'Success!' : 'Failed'}</h3>
              <p className="text-zinc-200 mb-6">{lastResult.message}</p>
              
              {lastResult.guest && (
                <div className="bg-black/40 backdrop-blur-sm w-full rounded-xl p-4 mb-8 text-left border border-white/10">
                  <div className="font-bold text-lg text-white">{lastResult.guest.name}</div>
                  <div className="text-zinc-300 text-sm">{lastResult.guest.organization}</div>
                  {lastResult.guest.awardCategory !== 'Not an Award Recipient' && (
                    <div className="mt-2 text-[10px] text-yellow-500 font-bold uppercase tracking-widest bg-yellow-900/30 border border-yellow-500/20 px-2 py-1 inline-block rounded">
                      Nominee: {lastResult.guest.awardCategory}
                    </div>
                  )}
                </div>
              )}

              <button 
                onClick={handleNext}
                className="w-full bg-white text-black font-bold py-4 rounded-2xl active:scale-[0.98] transition-transform hover:bg-zinc-200"
              >
                Scan Next Guest
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-8 text-zinc-500">
           <div className="flex flex-col items-center gap-1">
              <Camera size={20} />
              <span className="text-[10px] uppercase font-bold tracking-widest">Active Cam</span>
           </div>
           <div className="flex flex-col items-center gap-1">
              <Scan size={20} />
              <span className="text-[10px] uppercase font-bold tracking-widest">Auto Detect</span>
           </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          50% { top: 100%; opacity: 1; }
          90% { opacity: 1; }
        }
        #qr-reader video { object-fit: cover; width: 100%; height: 100%; border-radius: 1rem; }
      `}</style>
    </div>
  );
};

export default QRScanner;
