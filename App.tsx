
import React, { useState, useEffect } from 'react';
import { Guest, ViewState } from './types';
import { EVENT_DETAILS, STORAGE_KEY } from './constants';
import RSVPForm from './components/RSVPForm';
import TicketView from './components/TicketView';
import AdminDashboard from './components/AdminDashboard';
import QRScanner from './components/QRScanner';
import { Calendar, UserCheck, ShieldCheck, Home, ArrowRight, Menu, X, Sparkles, Plane, MapPin } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('HOME');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [currentGuest, setCurrentGuest] = useState<Guest | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Load data from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setGuests(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved guests");
      }
    }
  }, []);

  // Save data to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(guests));
  }, [guests]);

  const handleRSVPSuccess = (newGuest: Guest) => {
    setGuests(prev => [...prev, newGuest]);
    setCurrentGuest(newGuest);
    setView('TICKET');
  };

  const handleScan = (id: string) => {
    const guestIdx = guests.findIndex(g => g.id === id);
    
    if (guestIdx === -1) {
      return { success: false, message: "Invalid Pass ID. Guest not found in records." };
    }

    const guest = guests[guestIdx];
    if (guest.checkedIn) {
      return { success: false, guest, message: "This pass has already been used for check-in." };
    }

    // Mark as checked in
    const updatedGuests = [...guests];
    updatedGuests[guestIdx] = { 
      ...guest, 
      checkedIn: true, 
      checkInTime: new Date().toISOString() 
    };
    setGuests(updatedGuests);

    return { 
      success: true, 
      guest: updatedGuests[guestIdx], 
      message: `${guest.name} successfully checked in.` 
    };
  };

  const deleteGuest = (id: string) => {
    if (confirm("Are you sure you want to remove this guest?")) {
      setGuests(prev => prev.filter(g => g.id !== id));
    }
  };

  const NavItem = ({ target, icon: Icon, label }: { target: ViewState; icon: any; label: string }) => (
    <button
      onClick={() => { setView(target); setIsMenuOpen(false); }}
      className={`flex items-center gap-3 px-6 py-4 w-full md:w-auto md:px-3 md:py-1 rounded-xl transition-all ${
        view === target 
        ? 'bg-yellow-600/10 text-yellow-500 font-bold' 
        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
      }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col selection:bg-yellow-500/30">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => setView('HOME')}
          >
            <div className="w-10 h-10 bg-zinc-900 rounded-lg border border-zinc-700 flex items-center justify-center group-hover:border-yellow-600 transition-colors">
              <span className="serif text-xl font-bold gold-text">V</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="serif font-bold text-lg leading-none">Velana</h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Awards 2026</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <NavItem target="HOME" icon={Home} label="Home" />
            <NavItem target="RSVP" icon={Calendar} label="RSVP" />
            <NavItem target="ADMIN" icon={ShieldCheck} label="Admin" />
          </div>

          <div className="flex items-center gap-4">
             <button 
              onClick={() => setView('SCANNER')}
              className="gold-gradient text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm hover:scale-105 transition-transform"
            >
              <UserCheck size={16} /> 
              <span className="hidden sm:inline">Check-In</span>
            </button>
            <button 
              className="md:hidden text-zinc-400"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-zinc-900 border-b border-zinc-800 py-4 animate-in slide-in-from-top duration-300">
            <NavItem target="HOME" icon={Home} label="Home" />
            <NavItem target="RSVP" icon={Calendar} label="RSVP" />
            <NavItem target="ADMIN" icon={ShieldCheck} label="Admin" />
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full">
        {view === 'HOME' && (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <section className="text-center space-y-6 pt-12">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                <Plane size={14} className="text-yellow-500" /> Excellence in Aviation
              </div>
              <h2 className="serif text-5xl md:text-7xl font-bold max-w-4xl mx-auto leading-tight">
                {EVENT_DETAILS.name} <br />
                <span className="gold-text">Grand Gala Night</span>
              </h2>
              <p className="text-zinc-400 max-w-xl mx-auto text-lg leading-relaxed">
                 Celebrating excellence across the aviation industry, recognizing our partners for their outstanding contributions in passenger and cargo operations at Velana International Airport.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                <button 
                  onClick={() => setView('RSVP')}
                  className="w-full sm:w-auto px-8 py-4 gold-gradient text-black font-bold rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity active:scale-[0.98]"
                >
                  Confirm Your Attendance <ArrowRight size={20} />
                </button>
                <div className="flex items-center gap-2 text-sm text-zinc-500 font-medium">
                  <MapPin size={16} /> {EVENT_DETAILS.location}
                </div>
              </div>
            </section>

            <section className="grid md:grid-cols-3 gap-8">
               <div className="bg-zinc-900/40 p-8 rounded-3xl border border-zinc-800/50 space-y-4">
                  <div className="w-12 h-12 bg-yellow-600/20 rounded-2xl flex items-center justify-center text-yellow-500">
                    <Calendar size={24} />
                  </div>
                  <h3 className="serif text-2xl font-bold">Fast RSVP</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Confirm your presence in seconds. Get your digital pass instantly sent to your email and accessible here.
                  </p>
               </div>
               <div className="bg-zinc-900/40 p-8 rounded-3xl border border-zinc-800/50 space-y-4">
                  <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-500">
                    <UserCheck size={24} />
                  </div>
                  <h3 className="serif text-2xl font-bold">Digital Pass</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Personalized QR codes for every guest ensuring high security and seamless entry without manual paperwork.
                  </p>
               </div>
               <div className="bg-zinc-900/40 p-8 rounded-3xl border border-zinc-800/50 space-y-4">
                  <div className="w-12 h-12 bg-green-600/20 rounded-2xl flex items-center justify-center text-green-500">
                    <ShieldCheck size={24} />
                  </div>
                  <h3 className="serif text-2xl font-bold">Agenda</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Full agenda will be available soon. Meanwhile, secure your spot for the industry's most prestigious night.
                  </p>
               </div>
            </section>

            {/* Event Countdown or Preview image would go here */}
            <div className="w-full aspect-[21/9] rounded-[40px] overflow-hidden relative group">
               <img src="https://picsum.photos/1200/600?grayscale" alt="Event Venue" className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-1000" />
               <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
               <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Upcoming Venue</p>
                    <h4 className="serif text-3xl font-bold">{EVENT_DETAILS.location}</h4>
                  </div>
                  <div className="text-right">
                    <p className="text-yellow-500 text-4xl font-bold serif leading-none">12.02</p>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">February 2026</p>
                  </div>
               </div>
            </div>
          </div>
        )}

        {view === 'RSVP' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <RSVPForm onSuccess={handleRSVPSuccess} />
          </div>
        )}

        {view === 'TICKET' && currentGuest && (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            <div className="flex justify-between items-center max-w-md mx-auto mb-8">
               <h2 className="serif text-3xl font-bold">Your Invite</h2>
               <button onClick={() => setView('RSVP')} className="text-xs text-zinc-500 hover:text-white transition-colors">Register Another</button>
            </div>
            <TicketView guest={currentGuest} />
          </div>
        )}

        {view === 'ADMIN' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <AdminDashboard guests={guests} onDeleteGuest={deleteGuest} />
          </div>
        )}

        {view === 'SCANNER' && (
          <QRScanner 
            onScan={handleScan} 
            onClose={() => setView('HOME')} 
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-2 opacity-50">
              <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                <span className="serif text-sm font-bold gold-text">V</span>
              </div>
              <span className="text-sm font-medium">© 2026 Velana Group. All rights reserved.</span>
           </div>
           <div className="flex gap-8 text-sm text-zinc-500">
              <a href="#" className="hover:text-yellow-500 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-yellow-500 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-yellow-500 transition-colors">Event Guidelines</a>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
