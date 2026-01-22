
import React, { useState, useEffect } from 'react';
import { Guest, ViewState } from './types';
import { EVENT_DETAILS, STORAGE_KEY, AWARD_SECTIONS } from './constants';
import RSVPForm from './components/RSVPForm';
import TicketView from './components/TicketView';
import AdminDashboard from './components/AdminDashboard';
import QRScanner from './components/QRScanner';
import { Calendar, UserCheck, ShieldCheck, Home, ArrowRight, Menu, X, Sparkles, Plane, MapPin, Award, Box, Coffee, Trophy, ExternalLink } from 'lucide-react';

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
            <NavItem target="CATEGORIES" icon={Award} label="Awards" />
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
            <NavItem target="CATEGORIES" icon={Award} label="Awards" />
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
                <button 
                  onClick={() => setView('CATEGORIES')}
                  className="w-full sm:w-auto px-8 py-4 bg-zinc-800 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-zinc-700 transition-colors"
                >
                  View Categories
                </button>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-zinc-500 font-medium pt-2">
                 <MapPin size={16} /> {EVENT_DETAILS.location}
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

            {/* Venue Card */}
            <div className="w-full min-h-[400px] md:aspect-[21/9] rounded-[40px] overflow-hidden relative group bg-zinc-900 border border-zinc-800 shadow-2xl isolate">
               {/* Background Image - Using a bright, high-quality Maldives resort image */}
               <img 
                 src="https://images.unsplash.com/photo-1540206351-d6465b3ac5c1?q=80&w=2832&auto=format&fit=crop" 
                 alt="Crossroads Maldives Venue" 
                 className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-1000" 
               />
               
               {/* Gradient Overlays for text readability */}
               <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
               <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent md:via-black/20"></div>

               <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 flex flex-col md:flex-row justify-between items-end gap-8">
                  <div className="space-y-4 max-w-2xl relative z-10">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-yellow-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-yellow-500/20">
                          <MapPin size={12} /> Official Venue
                        </span>
                        <a 
                          href="https://www.google.com/maps/search/Crossroads+Maldives" 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-zinc-300 text-xs font-bold uppercase tracking-widest flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/20 transition-colors"
                        >
                          View on Map <ExternalLink size={12} />
                        </a>
                    </div>
                    
                    <div>
                        <h4 className="serif text-4xl md:text-6xl font-bold text-white leading-tight mb-2 drop-shadow-lg">
                        {EVENT_DETAILS.location}
                        </h4>
                        <p className="text-zinc-200 text-base md:text-lg max-w-lg font-light leading-relaxed drop-shadow-md">
                        The Maldives' first extraordinary multi-island leisure destination. Join us for a night of celebration under the stars.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                        <div className="flex items-center gap-3 text-sm text-zinc-100 border-l-2 border-yellow-500 pl-4 bg-black/30 p-2 rounded-r-lg backdrop-blur-sm">
                            <span className="font-medium">{EVENT_DETAILS.subLocation}</span>
                        </div>
                    </div>
                  </div>
                  
                  {/* Date/Time Badge */}
                  <div className="text-left md:text-right bg-zinc-900/80 backdrop-blur-xl p-6 rounded-2xl border border-white/10 min-w-[160px] shadow-2xl relative z-10">
                    <div className="flex flex-row md:flex-col items-baseline md:items-end gap-2 md:gap-0">
                       <p className="text-yellow-500 text-5xl md:text-6xl font-bold serif leading-none">12</p>
                       <p className="text-white text-xl md:text-2xl font-medium">Feb '26</p>
                    </div>
                    <div className="mt-3 space-y-1 text-right">
                       <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Thursday</p>
                       <p className="text-white text-xs font-bold uppercase tracking-widest bg-yellow-600/20 text-yellow-500 px-2 py-1 rounded inline-block">19:15 HRS</p>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        )}

        {view === 'CATEGORIES' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
             <header className="text-center space-y-4 py-8">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  <Trophy size={14} className="text-yellow-500" /> Honors & Recognition
                </div>
                <h2 className="serif text-4xl md:text-5xl font-bold">Award Categories</h2>
                <p className="text-zinc-400 max-w-2xl mx-auto">
                  Recognizing the outstanding contributions of our partners in enhancing connectivity and services at Velana International Airport.
                </p>
             </header>

             <div className="grid grid-cols-1 gap-8">
                {AWARD_SECTIONS.map((section, idx) => (
                   <div key={idx} className="bg-zinc-900/40 rounded-3xl border border-zinc-800 overflow-hidden relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-transparent z-10"></div>
                      <div className="relative z-20 p-8 md:p-12 flex flex-col md:flex-row gap-12">
                         <div className="flex-shrink-0 space-y-4 md:w-1/3">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/5 border border-yellow-500/30 flex items-center justify-center text-yellow-500">
                               {section.id === 'passenger' && <Plane size={32} strokeWidth={1.5} />}
                               {section.id === 'cargo' && <Box size={32} strokeWidth={1.5} />}
                               {section.id === 'lounge' && <Coffee size={32} strokeWidth={1.5} />}
                            </div>
                            <div>
                               <h3 className="serif text-3xl font-bold text-white mb-2">{section.title}</h3>
                               <p className="text-zinc-400 text-sm leading-relaxed">{section.description}</p>
                            </div>
                         </div>
                         
                         <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {section.categories.map((cat, i) => (
                               <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-black/20 border border-white/5 hover:border-yellow-500/30 transition-colors">
                                  <div className="mt-1 w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]"></div>
                                  <span className="text-zinc-200 font-medium">{cat}</span>
                               </div>
                            ))}
                         </div>
                      </div>
                   </div>
                ))}
             </div>
             
             <div className="text-center pt-8">
                <button 
                  onClick={() => setView('RSVP')}
                  className="inline-flex items-center gap-2 text-yellow-500 hover:text-yellow-400 transition-colors font-bold uppercase tracking-widest text-sm"
                >
                  Join the Celebration <ArrowRight size={16} />
                </button>
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
