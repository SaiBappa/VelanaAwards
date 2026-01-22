
import React, { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Guest } from '../types';
import { EVENT_DETAILS } from '../constants';
import { generatePersonalizedGreeting } from '../services/geminiService';
import { Download, Calendar, MapPin, Clock, Share2, Loader2 } from 'lucide-react';
import * as htmlToImage from 'html-to-image';

interface TicketViewProps {
  guest: Guest;
}

const TicketView: React.FC<TicketViewProps> = ({ guest }) => {
  const [greeting, setGreeting] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchGreeting = async () => {
      try {
        const msg = await generatePersonalizedGreeting(guest);
        setGreeting(msg);
      } catch (e) {
        setGreeting("We are delighted to welcome you to the Velana Awards 2026.");
      } finally {
        setLoading(false);
      }
    };
    fetchGreeting();
  }, [guest]);

  const handleDownload = async () => {
    if (!ticketRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await htmlToImage.toPng(ticketRef.current, { quality: 0.95, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `VelanaAwards2026-Pass-${guest.name.replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download pass', err);
      alert('Could not download image. Please screenshot this page.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Ticket Container to capture */}
      <div ref={ticketRef} className="bg-white text-black rounded-3xl overflow-hidden shadow-2xl relative pb-2">
        {/* Ticket Header */}
        <div className="bg-zinc-900 p-6 text-white text-center">
          <h2 className="serif text-2xl gold-text uppercase tracking-widest font-bold">Official Invitation</h2>
          <p className="text-xs text-zinc-400 mt-1">Velana Awards 2026</p>
        </div>

        {/* Perforation Line */}
        <div className="relative border-b-2 border-dashed border-zinc-200 py-4 flex justify-between px-[-10px]">
          <div className="absolute left-0 top-0 w-8 h-8 bg-[#050505] rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute right-0 top-0 w-8 h-8 bg-[#050505] rounded-full translate-x-1/2 -translate-y-1/2"></div>
        </div>

        <div className="p-8 text-center space-y-6">
          <div className="inline-block p-4 bg-zinc-50 rounded-2xl border-2 border-zinc-100">
            <QRCodeSVG 
              value={guest.id} 
              size={180} 
              level="H"
              includeMargin={false}
            />
          </div>

          <div className="space-y-1">
            <h3 className="serif text-2xl font-bold">{guest.name}</h3>
            <p className="text-zinc-500 font-bold uppercase text-sm tracking-wide">{guest.designation}</p>
            <p className="text-zinc-400 text-xs uppercase tracking-wider">{guest.organization}</p>
            {guest.awardCategory !== 'Not an Award Recipient' && (
              <span className="inline-block mt-3 px-3 py-1 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded-full uppercase border border-yellow-200">
                {guest.awardCategory}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-left border-t border-zinc-100 pt-6">
            <div className="space-y-2">
              <span className="text-[10px] text-zinc-400 font-bold uppercase block">Date & Time</span>
              <p className="text-xs flex items-center gap-1.5 font-medium"><Calendar size={12} className="text-yellow-600"/> {EVENT_DETAILS.date}</p>
              <p className="text-xs flex items-center gap-1.5 font-medium"><Clock size={12} className="text-yellow-600"/> {EVENT_DETAILS.time}</p>
            </div>
            <div className="space-y-2">
              <span className="text-[10px] text-zinc-400 font-bold uppercase block">Location</span>
              <p className="text-xs flex items-center gap-1.5 font-medium"><MapPin size={12} className="text-yellow-600"/> {EVENT_DETAILS.location}</p>
              <p className="text-[10px] text-zinc-500 leading-tight">{EVENT_DETAILS.subLocation}</p>
            </div>
          </div>

          <div className="pt-4 italic text-zinc-600 text-sm border-t border-zinc-100 px-4">
            {loading ? (
              <div className="animate-pulse h-4 bg-zinc-100 rounded w-3/4 mx-auto"></div>
            ) : (
              `"${greeting}"`
            )}
          </div>

          <div className="text-[10px] text-zinc-300 font-mono uppercase pt-2">
            Pass ID: {guest.id}
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/50 p-4 rounded-xl text-center text-xs text-zinc-400 border border-zinc-800">
        <p className="mb-2">A copy of this pass has been sent to <strong>{guest.email}</strong>.</p>
        <p>Please present this digital pass upon arrival for seamless check-in.</p>
      </div>

      <div className="flex gap-4">
        <button 
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {downloading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
          <span>Download Pass</span>
        </button>
      </div>
    </div>
  );
};

export default TicketView;
