
import React, { useEffect, useState } from 'react';
import { Guest, EmailTemplate, BirdConfig } from '../types';
import { INVITED_ORGANIZATIONS, DEFAULT_GUEST_CATEGORIES } from '../constants';
import { getAdminInsights } from '../services/geminiService';
import { createGuest, bulkCreateGuests, updateGuestInvitationStatus } from '../services/dataService';
import { sendInvitationEmail, sendGuestConfirmationEmail } from '../services/emailService';
import { supabase } from '../services/supabaseClient';
import { Users, CheckCircle, Sparkles, Search, Trash2, Download, PieChart as PieIcon, ListX, Plus, Upload, FileSpreadsheet, X, Save, AlertCircle, Mail, Send, Settings, CheckSquare, Square, RefreshCcw, MinusCircle, LayoutList, RotateCcw, QrCode, Link as LinkIcon, LogOut } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import * as XLSX from 'xlsx';
import TicketView from './TicketView';

interface AdminDashboardProps {
  guests: Guest[];
  onDeleteGuest: (id: string) => void;
}

const COUNTRY_CODES = ["+960", "+1", "+44", "+971", "+65", "+91", "+60", "+94"];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ guests: initialGuests, onDeleteGuest }) => {
  const [guests, setGuests] = useState<Guest[]>(initialGuests);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'GUESTS' | 'ORGS'>('OVERVIEW');
  const [insights, setInsights] = useState<string>('Generating attendance insights...');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Import/Add Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMode, setImportMode] = useState<'MANUAL' | 'FILE'>('MANUAL');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedGuests, setParsedGuests] = useState<Guest[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Settings / Email / Categories State
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'CATEGORIES' | 'TEMPLATE' | 'BIRD'>('CATEGORIES');
  const [sendingEmail, setSendingEmail] = useState(false);
  
  // Ticket Viewer State
  const [viewTicketGuest, setViewTicketGuest] = useState<Guest | null>(null);

  // Notification State
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // Dynamic Categories
  const [guestCategories, setGuestCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('velana_guest_categories');
    return saved ? JSON.parse(saved) : DEFAULT_GUEST_CATEGORIES;
  });
  const [newCategory, setNewCategory] = useState('');

  const [emailTemplate, setEmailTemplate] = useState<EmailTemplate>(() => {
    // Load from local storage if available
    const saved = localStorage.getItem('velana_email_template');
    return saved ? JSON.parse(saved) : {
      subject: "You are invited: Velana Awards 2026",
      imageUrl: "https://images.unsplash.com/photo-1540206351-d6465b3ac5c1?q=80&w=2832",
      body: "Dear {name},\n\nWe are honored to invite you to the Velana Awards 2026. Join us for a night of celebration at Crossroads Maldives.\n\nPlease confirm your attendance by clicking the button below."
    };
  });

  const [birdConfig, setBirdConfig] = useState<BirdConfig>(() => {
    const saved = localStorage.getItem('velana_bird_config');
    return saved ? JSON.parse(saved) : {
      apiKey: '34JpJbKMMidGy73R7sM9dFRpnHa5yfwNgKKl',
      workspaceId: '',
      emailChannelId: '',
      emailFromName: 'Velana Awards',
      emailFromAddress: ''
    };
  });
  
  // Manual Form State
  const [manualForm, setManualForm] = useState({
    name: '',
    email: '',
    organization: '',
    designation: '',
    countryCode: '+960',
    mobile: '',
    awardCategory: 'Not an Award Recipient'
  });

  useEffect(() => {
    setGuests(initialGuests);
  }, [initialGuests]);

  useEffect(() => {
    const fetchInsights = async () => {
      if (guests.length > 0) {
        const msg = await getAdminInsights(guests);
        setInsights(msg);
      } else {
        setInsights("No guests registered yet.");
      }
    };
    fetchInsights();
  }, [guests]);

  // Auto-dismiss notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const saveTemplate = () => {
    localStorage.setItem('velana_email_template', JSON.stringify(emailTemplate));
    setNotification({ type: 'success', message: 'Email template saved successfully.' });
  };

  const saveBirdConfig = () => {
    localStorage.setItem('velana_bird_config', JSON.stringify(birdConfig));
    setNotification({ type: 'success', message: 'Bird configuration saved.' });
  };

  const handleAddCategory = () => {
    if (newCategory.trim() && !guestCategories.includes(newCategory.trim())) {
      const updated = [...guestCategories, newCategory.trim()];
      setGuestCategories(updated);
      localStorage.setItem('velana_guest_categories', JSON.stringify(updated));
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (cat: string) => {
    if (cat === "Not an Award Recipient") {
      alert("Cannot remove the default system category.");
      return;
    }
    if (confirm(`Remove category "${cat}"?`)) {
      const updated = guestCategories.filter(c => c !== cat);
      setGuestCategories(updated);
      localStorage.setItem('velana_guest_categories', JSON.stringify(updated));
    }
  };

  const handleResetCategories = () => {
    if (confirm("Reset all categories to system defaults? This will remove custom categories.")) {
      setGuestCategories(DEFAULT_GUEST_CATEGORIES);
      localStorage.setItem('velana_guest_categories', JSON.stringify(DEFAULT_GUEST_CATEGORIES));
    }
  };

  const checkedInCount = guests.filter(g => g.checkedIn).length;
  
  // Selection Logic
  const toggleSelectAll = () => {
    if (selectedGuestIds.size === filteredGuests.length) {
      setSelectedGuestIds(new Set());
    } else {
      setSelectedGuestIds(new Set(filteredGuests.map(g => g.id)));
    }
  };

  const toggleSelectGuest = (id: string) => {
    const newSet = new Set(selectedGuestIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedGuestIds(newSet);
  };

  // Invitation Logic
  const handleSendInvitations = async (targetIds: string[] = []) => {
    const idsToProcess = targetIds.length > 0 ? targetIds : Array.from(selectedGuestIds);
    if (idsToProcess.length === 0) return;

    if (!window.confirm(`Send EMAIL invitations to ${idsToProcess.length} guest(s)?`)) return;

    setSendingEmail(true);
    let successCount = 0;

    for (const id of idsToProcess) {
      const guest = guests.find(g => g.id === id);
      if (guest) {
        try {
          await sendInvitationEmail(guest, emailTemplate, birdConfig);
          const timestamp = await updateGuestInvitationStatus(id as string);
          
          setGuests(prev => prev.map(g => 
            g.id === id ? { ...g, invitationSent: true, invitationSentAt: timestamp } : g
          ));
          successCount++;
        } catch (e: any) {
          console.error(`Failed to send to ${guest.email}`, e);
        }
      }
    }

    setSendingEmail(false);
    setNotification({ type: 'success', message: `Successfully emailed ${successCount} guests` });
    if (targetIds.length === 0) setSelectedGuestIds(new Set()); 
  };

  const handleSendPassEmail = async (guest: Guest) => {
    try {
      setNotification({ type: 'success', message: 'Sending pass...' });
      await sendGuestConfirmationEmail(guest, birdConfig);
      setNotification({ type: 'success', message: `QR Pass sent to ${guest.name}` });
    } catch (e) {
      console.error(e);
      setNotification({ type: 'error', message: 'Failed to send pass.' });
    }
  };

  // Export/Import Logic
  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(guests);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Guests");
    XLSX.writeFile(workbook, "Velana_Awards_Guests.xlsx");
  };

  const handleDownloadTemplate = () => {
    const headers = [
      { "Name": "John Doe", "Email": "john@example.com", "Organization": "Maldivian", "Designation": "CEO", "Country Code": "+960", "Mobile": "7771234", "Award Category": "Top Airline" }
    ];
    const worksheet = XLSX.utils.json_to_sheet(headers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "Guest_Import_Template.xlsx");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        if (typeof bstr !== 'string') {
          throw new Error("Failed to read file");
        }
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        // Map Excel data to Guest type
        const mappedData: Guest[] = data.map((row: any) => ({
          id: Math.random().toString(36).substr(2, 9).toUpperCase(),
          name: row['Name'] || row['name'] || 'Unknown',
          email: row['Email'] || row['email'] || '',
          organization: row['Organization'] || row['organization'] || '',
          designation: row['Designation'] || row['designation'] || '',
          mobile: row['Mobile'] || row['mobile'] || '',
          countryCode: row['Country Code'] || row['CountryCode'] || row['countryCode'] || '+960',
          awardCategory: row['Award Category'] || row['awardCategory'] || 'Not an Award Recipient',
          rsvpDate: new Date().toISOString(),
          checkedIn: false,
          invitationSent: false,
        })).filter(g => g.name !== 'Unknown' && g.email !== '');

        setParsedGuests(mappedData);
      } catch (err: any) {
        console.error("Error parsing file", err);
        setNotification({ type: 'error', message: "Error parsing file. Please check format." });
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const saveImportedGuests = async () => {
    setIsProcessing(true);
    try {
      await bulkCreateGuests(parsedGuests);
      setNotification({ type: 'success', message: `Successfully imported ${parsedGuests.length} guests.` });
      setGuests(prev => [...parsedGuests, ...prev]); 
      setShowImportModal(false);
      setParsedGuests([]);
      setImportFile(null);
    } catch (err) {
      setNotification({ type: 'error', message: "Failed to save guests to database." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const newGuest: Guest = {
        ...manualForm,
        id: Math.random().toString(36).substr(2, 9).toUpperCase(),
        rsvpDate: new Date().toISOString(),
        checkedIn: false,
        invitationSent: false,
      };
      await createGuest(newGuest);
      setGuests(prev => [newGuest, ...prev]);
      setManualForm({ 
        name: '', 
        email: '', 
        organization: '', 
        designation: '', 
        countryCode: '+960', 
        mobile: '', 
        awardCategory: 'Not an Award Recipient' 
      });
      setNotification({ type: 'success', message: "Guest added successfully" });
      setShowImportModal(false);
    } catch (err) {
      setNotification({ type: 'error', message: "Failed to add guest." });
    } finally {
      setIsProcessing(false);
    }
  };

  // Organization Analysis
  const orgStats = INVITED_ORGANIZATIONS.map(orgName => {
    const orgGuests = guests.filter(g => 
      g.organization.toLowerCase().includes(orgName.toLowerCase()) || 
      orgName.toLowerCase().includes(g.organization.toLowerCase())
    );
    return {
      name: orgName,
      rsvpCount: orgGuests.length,
      checkedInCount: orgGuests.filter(g => g.checkedIn).length,
      status: orgGuests.length > 0 ? 'Active' : 'No Response'
    };
  });

  const filteredGuests = guests.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.organization.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20 relative">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="serif text-3xl font-bold gold-text">Event Control Center</h2>
          <p className="text-zinc-400">Live guest tracking for Velana Awards</p>
        </div>
        <div className="flex gap-2">
          {['OVERVIEW', 'GUESTS', 'ORGS'].map((tab) => (
             <button 
             key={tab}
             onClick={() => setActiveTab(tab as any)}
             className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-yellow-600 text-black' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
          ))}
          <button 
             onClick={handleLogout}
             className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition-colors ml-2"
             title="Logout"
          >
             <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Configuration Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800">
              <h3 className="serif text-2xl font-bold text-white flex items-center gap-2">
                <Settings className="text-yellow-500" /> Settings
              </h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-zinc-400 hover:text-white"><X size={24} /></button>
            </div>
            
            <div className="flex border-b border-zinc-800">
               <button 
                onClick={() => setSettingsTab('CATEGORIES')}
                className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 ${settingsTab === 'CATEGORIES' ? 'text-yellow-500 border-b-2 border-yellow-500 bg-yellow-500/10' : 'text-zinc-400 hover:bg-zinc-800'}`}
               >
                 <LayoutList size={14} /> Categories
               </button>
               <button 
                onClick={() => setSettingsTab('TEMPLATE')}
                className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 ${settingsTab === 'TEMPLATE' ? 'text-yellow-500 border-b-2 border-yellow-500 bg-yellow-500/10' : 'text-zinc-400 hover:bg-zinc-800'}`}
               >
                 <Mail size={14} /> Email
               </button>
               <button 
                onClick={() => setSettingsTab('BIRD')}
                className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 ${settingsTab === 'BIRD' ? 'text-yellow-500 border-b-2 border-yellow-500 bg-yellow-500/10' : 'text-zinc-400 hover:bg-zinc-800'}`}
               >
                 <LinkIcon size={14} /> Integrations
               </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              {settingsTab === 'CATEGORIES' && (
                <div className="space-y-6">
                   <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700">
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Add New Category</label>
                      <div className="flex gap-2">
                         <input 
                           className="flex-1 bg-zinc-900 border border-zinc-700 p-2 rounded-lg text-white text-sm" 
                           placeholder="e.g. VIP, Media, Event Staff"
                           value={newCategory}
                           onChange={(e) => setNewCategory(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                         />
                         <button onClick={handleAddCategory} className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold px-4 rounded-lg text-sm">Add</button>
                      </div>
                   </div>

                   <div>
                      <div className="flex justify-between items-end mb-3">
                         <label className="block text-xs font-bold text-zinc-500 uppercase">Active Categories</label>
                         <button onClick={handleResetCategories} className="text-xs text-yellow-500 hover:text-yellow-400 flex items-center gap-1">
                           <RotateCcw size={12} /> Reset to Defaults
                         </button>
                      </div>
                      <div className="space-y-2">
                         {guestCategories.map((cat, i) => (
                           <div key={i} className="flex items-center justify-between bg-zinc-800 p-3 rounded-lg border border-zinc-700 group hover:border-zinc-600 transition-colors">
                              <span className="text-sm font-medium">{cat}</span>
                              {cat !== "Not an Award Recipient" && (
                                <button onClick={() => handleRemoveCategory(cat)} className="text-zinc-500 hover:text-red-500 transition-colors">
                                  <MinusCircle size={16} />
                                </button>
                              )}
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
              )}

              {settingsTab === 'TEMPLATE' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Email Subject</label>
                    <input 
                      className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-lg text-white focus:border-yellow-500 outline-none" 
                      value={emailTemplate.subject} 
                      onChange={e => setEmailTemplate({...emailTemplate, subject: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Banner Image URL</label>
                    <input 
                      className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-lg text-white focus:border-yellow-500 outline-none text-sm font-mono" 
                      value={emailTemplate.imageUrl} 
                      onChange={e => setEmailTemplate({...emailTemplate, imageUrl: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Message Body</label>
                    <div className="text-[10px] text-zinc-500 mb-2">Available variables: {'{name}'}, {'{organization}'}</div>
                    <textarea 
                      rows={6}
                      className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-lg text-white focus:border-yellow-500 outline-none" 
                      value={emailTemplate.body} 
                      onChange={e => setEmailTemplate({...emailTemplate, body: e.target.value})} 
                    />
                  </div>
                  <div className="flex justify-end pt-4">
                     <button onClick={saveTemplate} className="bg-yellow-600 text-black font-bold px-6 py-2 rounded-lg hover:bg-yellow-500 transition-colors">
                       Save Changes
                     </button>
                  </div>
                </div>
              )}

              {settingsTab === 'BIRD' && (
                <div className="space-y-6">
                  {/* API & Workspace */}
                  <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700 space-y-4">
                     <h4 className="text-sm font-bold text-white flex items-center gap-2"><LinkIcon size={14} className="text-yellow-500"/> General API Settings</h4>
                     <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Bird API Key (Access Key)</label>
                        <input type="password" className="w-full bg-zinc-900 border border-zinc-700 p-3 rounded-lg text-white" value={birdConfig.apiKey} onChange={e => setBirdConfig({...birdConfig, apiKey: e.target.value})} />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Workspace ID</label>
                        <input className="w-full bg-zinc-900 border border-zinc-700 p-3 rounded-lg text-white" value={birdConfig.workspaceId} onChange={e => setBirdConfig({...birdConfig, workspaceId: e.target.value})} placeholder="Found in Bird Dashboard URL" />
                     </div>
                  </div>

                  {/* Email Settings */}
                  <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700 space-y-4">
                     <h4 className="text-sm font-bold text-white flex items-center gap-2"><Mail size={14} className="text-yellow-500"/> Email Channel</h4>
                     <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Email Channel ID</label>
                        <input className="w-full bg-zinc-900 border border-zinc-700 p-3 rounded-lg text-white" value={birdConfig.emailChannelId} onChange={e => setBirdConfig({...birdConfig, emailChannelId: e.target.value})} placeholder="From Channels menu" />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Sender Name</label>
                            <input className="w-full bg-zinc-900 border border-zinc-700 p-3 rounded-lg text-white" value={birdConfig.emailFromName} onChange={e => setBirdConfig({...birdConfig, emailFromName: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Sender Address (Optional)</label>
                            <input className="w-full bg-zinc-900 border border-zinc-700 p-3 rounded-lg text-white" value={birdConfig.emailFromAddress} onChange={e => setBirdConfig({...birdConfig, emailFromAddress: e.target.value})} placeholder="events@velana.com" />
                        </div>
                     </div>
                  </div>

                  <div className="flex justify-end pt-2">
                     <button onClick={saveBirdConfig} className="bg-yellow-600 text-black font-bold px-6 py-3 rounded-lg hover:bg-yellow-500 transition-colors w-full sm:w-auto">
                       Save Integrations
                     </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ticket Viewer Modal */}
      {viewTicketGuest && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
                  <h3 className="serif text-xl font-bold text-white flex items-center gap-2"><QrCode className="text-yellow-500" size={20}/> Guest Pass</h3>
                  <button onClick={() => setViewTicketGuest(null)} className="text-zinc-400 hover:text-white p-2"><X size={20}/></button>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar bg-zinc-950/50">
                  <TicketView guest={viewTicketGuest} />
              </div>
              <div className="p-4 border-t border-zinc-800 bg-zinc-900 grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => handleSendPassEmail(viewTicketGuest)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                  >
                      <Send size={16} /> Email Pass
                  </button>
              </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800">
              <h3 className="serif text-2xl font-bold text-white">Add Guests</h3>
              <button onClick={() => setShowImportModal(false)} className="text-zinc-400 hover:text-white"><X size={24} /></button>
            </div>
            
            <div className="flex border-b border-zinc-800">
              <button onClick={() => setImportMode('MANUAL')} className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider ${importMode === 'MANUAL' ? 'text-yellow-500 border-b-2 border-yellow-500 bg-yellow-500/10' : 'text-zinc-400 hover:bg-zinc-800'}`}>Manual Entry</button>
              <button onClick={() => setImportMode('FILE')} className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider ${importMode === 'FILE' ? 'text-yellow-500 border-b-2 border-yellow-500 bg-yellow-500/10' : 'text-zinc-400 hover:bg-zinc-800'}`}>Bulk Import</button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
              {importMode === 'MANUAL' ? (
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Full Name</label>
                      <input required className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-lg text-white" value={manualForm.name} onChange={e => setManualForm({...manualForm, name: e.target.value})} placeholder="e.g. Ibrahim Ali" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Email</label>
                      <input required type="email" className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-lg text-white" value={manualForm.email} onChange={e => setManualForm({...manualForm, email: e.target.value})} placeholder="email@company.com" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Organization</label>
                      <input required className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-lg text-white" value={manualForm.organization} onChange={e => setManualForm({...manualForm, organization: e.target.value})} placeholder="e.g. MACL" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Designation</label>
                      <input required className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-lg text-white" value={manualForm.designation} onChange={e => setManualForm({...manualForm, designation: e.target.value})} placeholder="e.g. Director" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Mobile</label>
                      <div className="flex gap-2">
                        <select 
                          className="bg-zinc-800 border border-zinc-700 p-3 rounded-lg text-white outline-none"
                          value={manualForm.countryCode}
                          onChange={(e) => setManualForm({...manualForm, countryCode: e.target.value})}
                        >
                          {COUNTRY_CODES.map(code => <option key={code} value={code}>{code}</option>)}
                        </select>
                        <input className="flex-1 bg-zinc-800 border border-zinc-700 p-3 rounded-lg text-white" value={manualForm.mobile} onChange={e => setManualForm({...manualForm, mobile: e.target.value})} placeholder="7771234" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Category</label>
                      <select 
                        className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-lg text-white" 
                        value={manualForm.awardCategory} 
                        onChange={e => setManualForm({...manualForm, awardCategory: e.target.value})}
                      >
                         {guestCategories.map(cat => (
                           <option key={cat} value={cat}>{cat}</option>
                         ))}
                      </select>
                    </div>
                  </div>
                  <button type="submit" disabled={isProcessing} className="w-full bg-yellow-600 text-black font-bold py-3 rounded-lg hover:bg-yellow-500 transition-colors mt-4">
                    {isProcessing ? 'Adding...' : 'Add Guest'}
                  </button>
                </form>
              ) : (
                <div className="space-y-6">
                   {!importFile ? (
                     <div className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center bg-zinc-800/30">
                        <input type="file" accept=".xlsx, .xls, .csv" className="hidden" id="file-upload" onChange={handleFileUpload} />
                        <label htmlFor="file-upload" className="cursor-pointer bg-zinc-700 text-white px-6 py-2 rounded-lg inline-flex items-center gap-2"><Upload size={16}/> Select File</label>
                        <p className="text-zinc-500 text-xs mt-4">Headers: Name, Email, Organization, Designation, Country Code, Mobile, Award Category</p>
                        <button onClick={handleDownloadTemplate} className="text-yellow-500 text-sm mt-2 hover:underline flex items-center justify-center gap-1 w-full"><Download size={14}/> Download Template</button>
                     </div>
                   ) : (
                     <div className="space-y-4">
                       <div className="flex justify-between items-center bg-zinc-800 p-3 rounded-lg text-white">
                         <span>{importFile.name} ({parsedGuests.length} records)</span>
                         <button onClick={() => { setImportFile(null); setParsedGuests([]); }}><X size={16}/></button>
                       </div>
                       
                       <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden max-h-[200px] overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-zinc-800 text-zinc-400">
                             <tr>
                               <th className="p-2">Name</th>
                               <th className="p-2">Email</th>
                               <th className="p-2">Mobile</th>
                               <th className="p-2">Cat</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800">
                             {parsedGuests.map((g, i) => (
                               <tr key={i}>
                                 <td className="p-2">{g.name}</td>
                                 <td className="p-2 text-zinc-400">{g.email}</td>
                                 <td className="p-2">{g.countryCode} {g.mobile}</td>
                                 <td className="p-2 text-yellow-500/70">{g.awardCategory?.substring(0, 10)}...</td>
                               </tr>
                             ))}
                          </tbody>
                        </table>
                      </div>

                       <button onClick={saveImportedGuests} disabled={isProcessing} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-500">{isProcessing ? 'Importing...' : 'Confirm Import'}</button>
                     </div>
                   )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-400 text-sm">Total RSVPs</span>
                <Users className="text-zinc-600" size={20} />
              </div>
              <div className="text-4xl font-bold">{guests.length}</div>
            </div>
            
            <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-400 text-sm">Checked In</span>
                <CheckCircle className="text-green-600" size={20} />
              </div>
              <div className="text-4xl font-bold text-green-500">{checkedInCount}</div>
            </div>

            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800/50 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2 italic">
                <Sparkles size={14} className="text-yellow-500" /> AI Insights
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">{insights}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'GUESTS' && (
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden animate-in fade-in">
          <div className="p-6 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="font-semibold">Guest List & Invitations</h3>
            
            <div className="flex gap-3 items-center flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <input 
                  type="text" 
                  placeholder="Search..."
                  className="bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-1 focus:ring-yellow-600"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                 <button 
                  onClick={() => setShowSettingsModal(true)}
                  className="flex items-center gap-2 bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 px-3 py-2 rounded-lg text-xs font-bold uppercase transition-colors"
                >
                  <Settings size={14} /> Settings
                </button>
                <button 
                  onClick={() => handleSendInvitations()}
                  disabled={selectedGuestIds.size === 0 || sendingEmail}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase transition-colors ${selectedGuestIds.size > 0 ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
                >
                  {sendingEmail ? <span className="animate-pulse">Sending...</span> : <><Send size={14} /> Send Email ({selectedGuestIds.size})</>}
                </button>
                <button 
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2 bg-yellow-600 text-black font-bold px-3 py-2 rounded-lg text-xs uppercase transition-colors hover:bg-yellow-500"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-800/50 text-zinc-400 font-medium">
                <tr>
                  <th className="px-6 py-4 w-10">
                    <button onClick={toggleSelectAll} className="hover:text-white">
                      {selectedGuestIds.size > 0 && selectedGuestIds.size === filteredGuests.length ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                  </th>
                  <th className="px-6 py-4">Name / Designation</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Invitation Status</th>
                  <th className="px-6 py-4">Check-In</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredGuests.map(guest => (
                  <tr key={guest.id} className={`hover:bg-zinc-800/30 transition-colors ${selectedGuestIds.has(guest.id) ? 'bg-blue-900/10' : ''}`}>
                    <td className="px-6 py-4">
                      <button onClick={() => toggleSelectGuest(guest.id)} className={`transition-colors ${selectedGuestIds.has(guest.id) ? 'text-blue-500' : 'text-zinc-600 hover:text-zinc-400'}`}>
                        {selectedGuestIds.has(guest.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{guest.name}</div>
                      <div className="text-xs text-zinc-500">{guest.designation}, {guest.organization}</div>
                      {guest.awardCategory !== 'Not an Award Recipient' && (
                          <span className="text-[10px] text-yellow-500 font-bold uppercase mt-1 inline-block">{guest.awardCategory}</span>
                       )}
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      <div>{guest.email}</div>
                      <div className="text-xs">{guest.countryCode} {guest.mobile}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {guest.invitationSent ? (
                              <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-900/20 px-2 py-0.5 rounded-md border border-green-900/30">
                                  <CheckCircle size={10} /> Email
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-md">
                                  <Mail size={10} /> Email
                              </span>
                            )}
                          </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        guest.checkedIn ? 'bg-green-900/30 text-green-500' : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        {guest.checkedIn ? 'Arrived' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                         <button 
                           onClick={() => setViewTicketGuest(guest)}
                           title="View & Send QR Pass"
                           className="text-zinc-400 hover:text-yellow-500 transition-colors p-1.5 hover:bg-yellow-900/10 rounded-lg"
                         >
                           <QrCode size={18} />
                         </button>
                         <button 
                           onClick={() => {
                              if(confirm('Delete guest?')) {
                                onDeleteGuest(guest.id);
                                setGuests(prev => prev.filter(g => g.id !== guest.id));
                              }
                            }} 
                            title="Delete Guest"
                            className="text-zinc-600 hover:text-red-500 transition-colors p-1.5 hover:bg-red-900/10 rounded-lg"
                         >
                           <Trash2 size={18} />
                         </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'ORGS' && (
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden animate-in fade-in">
           <div className="p-6 border-b border-zinc-800">
             <h3 className="font-semibold">Organization Breakdown</h3>
           </div>
           <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-800/50 text-zinc-400 font-medium">
                <tr>
                  <th className="px-6 py-4">Organization Name</th>
                  <th className="px-6 py-4">Total Registered</th>
                  <th className="px-6 py-4">Arrived</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {orgStats.map(org => (
                  <tr key={org.name} className="hover:bg-zinc-800/30">
                    <td className="px-6 py-4 font-medium">{org.name}</td>
                    <td className="px-6 py-4">{org.rsvpCount}</td>
                    <td className="px-6 py-4">{org.checkedInCount}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold ${
                        org.status === 'Active' ? 'bg-green-900/30 text-green-500' : 'bg-red-900/30 text-red-500'
                      }`}>
                        {org.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300 ${notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {notification.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
          <span className="font-bold">{notification.message}</span>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
