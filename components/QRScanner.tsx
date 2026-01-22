
import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Guest } from '../types';
import { Check, AlertCircle, X, Camera, Scan } from 'lucide-react';

interface QRScannerProps {
  onScan: (id: string) => { success: boolean; guest?: Guest; message: string };
  onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const [lastResult, setLastResult] = useState<{ success: boolean; guest?: Guest; message: string } | null>(null);
  const [scanning, setScanning] = useState(true);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scannerRef.current.render(
      (decodedText) => {
        const result = onScan(decodedText);
        setLastResult(result);
        setScanning(false);
        // Temporarily stop scanning to show result
        if (scannerRef.current) {
          scannerRef.current.pause();
        }
      },
      (error) => {
        // Ignored during normal operation
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Scanner clear error", err));
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

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6 backdrop-blur-md">
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 text-zinc-400 hover:text-white p-2"
      >
        <X size={32} />
      </button>

      <div className="max-w-md w-full space-y-8 text-center">
        <header>
          <h2 className="serif text-3xl font-bold gold-text">Guest Check-In</h2>
          <p className="text-zinc-400 mt-2">Scan the QR code on the guest's pass</p>
        </header>

        <div className="relative aspect-square w-full max-w-[320px] mx-auto overflow-hidden rounded-3xl border-4 border-zinc-800 bg-zinc-900 shadow-2xl">
          <div id="qr-reader" className="w-full h-full"></div>
          
          {scanning && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
               <div className="w-[200px] h-[200px] border-2 border-yellow-500/50 rounded-2xl relative">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,1)] animate-[scan_2s_ease-in-out_infinite]"></div>
               </div>
            </div>
          )}

          {lastResult && (
            <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center p-8 transition-all ${
              lastResult.success ? 'bg-green-950/90' : 'bg-red-950/90'
            }`}>
              {lastResult.success ? (
                <div className="bg-green-500 text-black rounded-full p-4 mb-4">
                  <Check size={48} strokeWidth={3} />
                </div>
              ) : (
                <div className="bg-red-500 text-white rounded-full p-4 mb-4">
                  <AlertCircle size={48} strokeWidth={3} />
                </div>
              )}
              <h3 className="text-2xl font-bold mb-2">{lastResult.success ? 'Success!' : 'Failed'}</h3>
              <p className="text-zinc-200 mb-6">{lastResult.message}</p>
              
              {lastResult.guest && (
                <div className="bg-black/30 w-full rounded-xl p-4 mb-8 text-left border border-white/10">
                  <div className="font-bold text-lg">{lastResult.guest.name}</div>
                  <div className="text-zinc-400 text-sm">{lastResult.guest.organization}</div>
                  {lastResult.guest.awardCategory !== 'Not an Award Recipient' && (
                    <div className="mt-2 text-[10px] text-yellow-500 font-bold uppercase tracking-widest bg-yellow-900/40 px-2 py-1 inline-block rounded">
                      Nominee: {lastResult.guest.awardCategory}
                    </div>
                  )}
                </div>
              )}

              <button 
                onClick={handleNext}
                className="w-full bg-white text-black font-bold py-4 rounded-2xl active:scale-[0.98] transition-transform"
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
        #qr-reader__dashboard { display: none !important; }
        #qr-reader__status_span { display: none !important; }
        #qr-reader { border: none !important; padding: 0 !important; }
        #qr-reader video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
      `}</style>
    </div>
  );
};

export default QRScanner;
