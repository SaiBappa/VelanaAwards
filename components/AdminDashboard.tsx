
// ... existing imports
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Guest, EmailTemplate, MicrosoftConfig } from '../types';
import { INVITED_ORGANIZATIONS, DEFAULT_GUEST_CATEGORIES } from '../constants';
import { getAdminInsights } from '../services/geminiService';
import { createGuest, bulkCreateGuests, updateGuestInvitationStatus, updateGuest, fetchCategories, createCategory, deleteCategory, seedCategories, fetchEmailTemplate, saveEmailTemplate as saveEmailTemplateToDb } from '../services/dataService';
import { sendInvitationEmail, sendGuestConfirmationEmail } from '../services/emailService';
import { signInWithMicrosoft, getActiveAccount, logoutMicrosoft, getGraphAccessToken, sendEmailViaGraph } from '../services/msGraphService';
import { supabase } from '../services/supabaseClient';
import { Users, CheckCircle, Sparkles, Search, Trash2, Download, PieChart as PieIcon, ListX, Plus, Upload, FileSpreadsheet, X, Save, AlertCircle, Mail, Send, Settings, CheckSquare, Square, RefreshCcw, MinusCircle, LayoutList, RotateCcw, QrCode, Link as LinkIcon, LogOut, ExternalLink, ArrowRight, Check, PlayCircle, HelpCircle, Edit, TrendingUp, Calendar, UserCheck, Activity, Building, BarChart2, Bold, Italic, Underline, Type, AlignLeft, List, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, Legend } from 'recharts';
import * as XLSX from 'xlsx';
import TicketView from './TicketView';

interface AdminDashboardProps {
  guests: Guest[];
  onDeleteGuest: (id: string) => void;
}

const COUNTRY_CODES = ["+960", "+1", "+44", "+971", "+65", "+91", "+60", "+94"];

// Robust ID Generator (UUID compatible)
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const COLORS = ['#d4af37', '#10b981', '#3b82f6', '#8b5cf6', '#f43f5e', '#f97316'];

const DEFAULT_EMAIL_TEMPLATE: EmailTemplate = {
  subject: "You are invited: Velana Awards 2026",
  imageUrl: "https://images.unsplash.com/photo-1540206351-d6465b3ac5c1?q=80&w=2832",
  body: "<p>Dear {name},</p><p>We are honored to invite you to the Velana Awards 2026. Join us for a night of celebration at Crossroads Maldives.</p><p>Please confirm your attendance by clicking the button below.</p>"
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ guests: initialGuests, onDeleteGuest }) => {
  const [guests, setGuests] = useState<Guest[]>(initialGuests);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'GUESTS' | 'STATS'>('OVERVIEW');
  const [insights, setInsights] = useState<string>('Generating attendance insights...');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Import/Add Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMode, setImportMode] = useState<'MANUAL' | 'FILE'>('MANUAL');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedGuests, setParsedGuests] = useState<Guest[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Edit State
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Settings / Email / Categories State
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'CATEGORIES' | 'TEMPLATE' | 'INTEGRATIONS'>('CATEGORIES');
  
  // Email Sending State
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [pendingRecipientIds, setPendingRecipientIds] = useState<string[]>([]);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Ticket Viewer State
  const [viewTicketGuest, setViewTicketGuest] = useState<Guest | null>(null);

  // Notification State
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // Microsoft Config State
  const [msConfig, setMsConfig] = useState<MicrosoftConfig>(() => {
    const saved = localStorage.getItem('velana_ms_config');
    // Default to provided credentials if no local storage found
    return saved ? JSON.parse(saved) : { 
      clientId: 'cf3f88f0-299e-4c15-8a46-322f422aea79',
      tenantId: '535fef1c-582f-4349-a92a-62d1f8311719'
    };
  });
  const [msAccount, setMsAccount] = useState<any>(null);
  const [testEmailTarget, setTestEmailTarget] = useState('cto@macl.aero');
  const [sendingTest, setSendingTest] = useState(false);

  // Dynamic Categories (Managed via Database)
  const [guestCategories, setGuestCategories] = useState<string[]>(DEFAULT_GUEST_CATEGORIES);
  const [newCategory, setNewCategory] = useState('');

  const [emailTemplate, setEmailTemplate] = useState<EmailTemplate>(DEFAULT_EMAIL_TEMPLATE);

  // Editor Ref for WYSIWYG
  const editorRef = useRef<HTMLDivElement>(null);
  
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
    // Check for active MS session
    if (msConfig.clientId) {
        getActiveAccount(msConfig.clientId, msConfig.tenantId).then(account => {
            setMsAccount(account);
        });
    }
  }, [msConfig.clientId, msConfig.tenantId]);

  // Load Categories & Email Template from DB
  const loadInitialData = async () => {
    // 1. Categories
    const cats = await fetchCategories();
    if (cats.length > 0) {
      setGuestCategories(cats);
    } else {
      setGuestCategories(DEFAULT_GUEST_CATEGORIES);
    }

    // 2. Email Template
    try {
      const template = await fetchEmailTemplate();
      if (template) {
        setEmailTemplate(template);
      }
    } catch (e) {
      console.error("Failed to load email template", e);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

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

  // --- Rich Text Editor Initialization ---
  useEffect(() => {
    if (settingsTab === 'TEMPLATE' && editorRef.current) {
        // Initialize editor content when tab opens
        // Check if content is different to avoid cursor jumping if we were editing
        if (editorRef.current.innerHTML !== emailTemplate.body) {
            editorRef.current.innerHTML = emailTemplate.body;
        }
    }
  }, [settingsTab, emailTemplate.body]); 
  // Dependency on emailTemplate.body might be tricky with contentEditable loops, 
  // but since we only update state onBlur or save, it's safer. 
  // However, for the initial load, it's crucial.

  const execCmd = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    if (editorRef.current) {
        // Update state immediately for preview responsiveness
        setEmailTemplate(prev => ({ ...prev, body: editorRef.current!.innerHTML }));
        editorRef.current.focus();
    }
  };

  // --- Statistics & Chart Data Calculations ---
  
  const stats = useMemo(() => {
    const total = guests.length;
    const invited = guests.filter(g => g.invitationSent).length;
    const rsvp = guests.filter(g => g.rsvpConfirmed).length;
    const checkedIn = guests.filter(g => g.checkedIn).length;
    
    return { total, invited, rsvp, checkedIn };
  }, [guests]);

  const timelineData = useMemo(() => {
    const dateMap = new Map<string, { date: string; rsvp: number; invited: number }>();
    
    guests.forEach(g => {
        // RSVP Date Grouping
        const rsvpDate = g.rsvpDate ? g.rsvpDate.split('T')[0] : 'Unknown';
        if (rsvpDate !== 'Unknown') {
            if (!dateMap.has(rsvpDate)) dateMap.set(rsvpDate, { date: rsvpDate, rsvp: 0, invited: 0 });
            dateMap.get(rsvpDate)!.rsvp += 1;
        }

        // Invitation Date Grouping
        if (g.invitationSentAt) {
            const inviteDate = g.invitationSentAt.split('T')[0];
            if (!dateMap.has(inviteDate)) dateMap.set(inviteDate, { date: inviteDate, rsvp: 0, invited: 0 });
            dateMap.get(inviteDate)!.invited += 1;
        }
    });

    return Array.from(dateMap.values())
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14); // Last 14 days of activity
  }, [guests]);

  const orgChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    guests.forEach(g => {
        const org = g.organization || 'Unknown';
        counts[org] = (counts[org] || 0) + 1;
    });
    
    return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 7); // Top 7 Organizations
  }, [guests]);

  // Detailed Stats for STATS tab
  const detailedOrgStats = useMemo(() => {
    const stats: Record<string, { name: string, total: number, invited: number, rsvp: number, checkedIn: number }> = {};
    
    guests.forEach(g => {
        // Normalize organization name
        const org = g.organization ? g.organization.trim() : 'Unknown';
        if (!stats[org]) {
            stats[org] = { name: org, total: 0, invited: 0, rsvp: 0, checkedIn: 0 };
        }
        stats[org].total++;
        if (g.invitationSent) stats[org].invited++;
        if (g.rsvpConfirmed) stats[org].rsvp++;
        if (g.checkedIn) stats[org].checkedIn++;
    });

    return Object.values(stats).sort((a, b) => b.total - a.total);
  }, [guests]);

  const recentActivity = useMemo(() => {
      // Combine RSVPs and Check-ins into a unified timeline
      const activities = [];
      guests.forEach(g => {
          if (g.rsvpConfirmed) activities.push({ type: 'RSVP', guest: g, time: g.rsvpDate });
          if (g.checkedIn && g.checkInTime) activities.push({ type: 'CHECKIN', guest: g, time: g.checkInTime });
      });
      return activities
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 5);
  }, [guests]);

  // Auto-dismiss notification
  useEffect(() => {
    if (notification) {
      // Longer timeout for errors so user can read them
      const timeout = notification.type === 'error' ? 8000 : 4000;
      const timer = setTimeout(() => setNotification(null), timeout);
      return () => clearTimeout(timer);
    }
  }, [notification]);
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const saveTemplate = async () => {
    setIsSavingTemplate(true);
    try {
      await saveEmailTemplateToDb(emailTemplate);
      setNotification({ type: 'success', message: 'Email template saved to database.' });
    } catch (e) {
      console.error(e);
      setNotification({ type: 'error', message: 'Failed to save email template.' });
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const saveMsConfig = () => {
    localStorage.setItem('velana_ms_config', JSON.stringify(msConfig));
    setNotification({ type: 'success', message: 'Microsoft configuration saved.' });
  };

  const handleMsLogin = async () => {
    if (!msConfig.clientId) {
        setNotification({ type: 'error', message: 'Please enter a Client ID first.' });
        return;
    }
    try {
        const account = await signInWithMicrosoft(msConfig.clientId, msConfig.tenantId);
        setMsAccount(account);
        setNotification({ type: 'success', message: `Connected as ${account.username}` });
        saveMsConfig();
    } catch (e: any) {
        console.error(e);
        let errorMsg = e.message || "Unknown error";
        
        // Detect specific SPA configuration error
        if (errorMsg.includes("AADSTS9002326") || errorMsg.includes("Cross-origin")) {
            errorMsg = "Azure Config Error: Please switch your App Platform from 'Web' to 'Single-Page Application' in Azure Portal.";
        }
        
        setNotification({ type: 'error', message: errorMsg });
    }
  };

  const handleMsLogout = async () => {
      if (msConfig.clientId) {
          await logoutMicrosoft(msConfig.clientId, msConfig.tenantId);
          setMsAccount(null);
      }
  };

  const handleSendTestEmail = async () => {
    if (!msConfig.clientId || !msAccount) {
      setNotification({ type: 'error', message: 'Please connect Microsoft 365 first.' });
      return;
    }
    setSendingTest(true);
    try {
      const token = await getGraphAccessToken(msConfig.clientId, msConfig.tenantId);
      if (!token) throw new Error("Could not acquire token. Please reconnect Microsoft 365.");

      await sendEmailViaGraph(token, {
        to: testEmailTarget,
        subject: "Test Email - Velana Awards System",
        htmlBody: `<h3>System Test</h3><p>This is a test email sent from the Velana Awards Admin Dashboard.</p><p>Sent by: ${msAccount.username}</p>`
      });

      setNotification({ type: 'success', message: `Test email sent to ${testEmailTarget}` });
    } catch (e: any) {
      console.error(e);
      setNotification({ type: 'error', message: 'Failed to send test email: ' + e.message });
    } finally {
      setSendingTest(false);
    }
  };

  const handleAddCategory = async () => {
    if (newCategory.trim()) {
      try {
         await createCategory(newCategory.trim());
         setNewCategory('');
         const cats = await fetchCategories();
         setGuestCategories(cats.length ? cats : DEFAULT_GUEST_CATEGORIES);
         setNotification({ type: 'success', message: 'Category added to database.' });
      } catch (e: any) {
         console.error(e);
         setNotification({ type: 'error', message: 'Failed to add category. Please check if table exists.' });
      }
    }
  };

  const handleRemoveCategory = async (cat: string) => {
    if (cat === "Not an Award Recipient") {
      alert("Cannot remove the default system category.");
      return;
    }
    if (confirm(`Delete category "${cat}" from database?`)) {
      try {
        await deleteCategory(cat);
        const cats = await fetchCategories();
        setGuestCategories(cats.length ? cats : DEFAULT_GUEST_CATEGORIES);
        setNotification({ type: 'success', message: 'Category removed.' });
      } catch (e: any) {
        console.error(e);
        setNotification({ type: 'error', message: 'Failed to delete category.' });
      }
    }
  };

  const handleResetCategories = async () => {
    if (confirm("Populate database with default system categories? Existing custom categories will remain.")) {
       try {
          await seedCategories();
          const cats = await fetchCategories();
          setGuestCategories(cats.length ? cats : DEFAULT_GUEST_CATEGORIES);
          setNotification({ type: 'success', message: 'Default categories seeded.' });
       } catch (e: any) {
          console.error(e);
          setNotification({ type: 'error', message: 'Failed to seed categories.' });
       }
    }
  };
  
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

  // --- Invitation Logic Start ---

  // 1. Trigger the Modal
  const initiateEmailSending = (targetIds: string[] = []) => {
    const idsToProcess = targetIds.length > 0 ? targetIds : Array.from(selectedGuestIds);
    if (idsToProcess.length === 0) return;

    setPendingRecipientIds(idsToProcess);
    setShowEmailPreview(true);
  };

  // 2. Actually Send (Called from Modal)
  const processEmailSending = async () => {
    setSendingEmail(true);
    let successCount = 0;

    for (const id of pendingRecipientIds) {
      const guest = guests.find(g => g.id === id);
      if (guest) {
        try {
          await sendInvitationEmail(guest, emailTemplate, msConfig);
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
    setShowEmailPreview(false);
    setNotification({ type: 'success', message: `Invitation successfully sent to ${successCount} guest(s).` });
    
    // Clear selection if it was a bulk action
    if (selectedGuestIds.size === pendingRecipientIds.length) {
        setSelectedGuestIds(new Set()); 
    }
    setPendingRecipientIds([]);
  };

  // --- Invitation Logic End ---

  const handleSendPassEmail = async (guest: Guest) => {
    try {
      setNotification({ type: 'success', message: 'Sending pass...' });
      await sendGuestConfirmationEmail(guest, msConfig);
      setNotification({ type: 'success', message: `QR Pass email sent to ${guest.name}` });
    } catch (e) {
      console.error(e);
      setNotification({ type: 'error', message: 'Failed to send pass.' });
    }
  };

  const handleUpdateGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuest) return;
    setIsUpdating(true);
    try {
      await updateGuest(editingGuest);
      setGuests(prev => prev.map(g => g.id === editingGuest.id ? editingGuest : g));
      setNotification({ type: 'success', message: "Guest updated successfully" });
      setEditingGuest(null);
    } catch (err: any) {
      setNotification({ type: 'error', message: "Failed to update guest: " + (err.message || "") });
    } finally {
      setIsUpdating(false);
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
          id: generateId(),
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
          rsvpConfirmed: false // Imported guests default to not confirmed
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
    } catch (err: any) {
      setNotification({ type: 'error', message: "Failed to save guests: " + (err.message || "Unknown DB Error") });
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
        id: generateId(),
        rsvpDate: new Date().toISOString(),
        checkedIn: false,
        invitationSent: false,
        rsvpConfirmed: false // Manually added guests default to not confirmed
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
    } catch (err: any) {
      console.error(err);
      setNotification({ type: 'error', message: "Failed to add guest: " + (err.message || err.error_description || "Database error") });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredGuests = guests.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.organization.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper for preview
  const sampleGuestForPreview = pendingRecipientIds.length > 0 
    ? guests.find(g => g.id === pendingRecipientIds[0]) 
    : null;

  const previewBody = sampleGuestForPreview 
    ? emailTemplate.body
        .replace('{name}', sampleGuestForPreview.name)
        .replace('{organization}', sampleGuestForPreview.organization)
    : '';

  return (
    <div className="space-y-8 pb-20 relative">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="serif text-3xl font-bold gold-text">Event Control Center</h2>
          <p className="text-zinc-400">Live guest tracking for Velana Awards</p>
        </div>
        <div className="flex gap-2">
          {['OVERVIEW', 'GUESTS', 'STATS'].map((tab) => (
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

      {/* Email Preview Modal */}
      {showEmailPreview && sampleGuestForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
           <div className="bg-zinc-900 border border-zinc-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                 <div>
                    <h3 className="serif text-xl font-bold text-white flex items-center gap-2">
                      <Send className="text-yellow-500" size={20} /> Send Invitations
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      You are about to email <strong className="text-white">{pendingRecipientIds.length}</strong> guest(s).
                    </p>
                 </div>
                 <button onClick={() => setShowEmailPreview(false)} className="text-zinc-400 hover:text-white"><X size={20}/></button>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                 <div className="bg-white rounded-xl overflow-hidden text-black shadow-lg">
                    {emailTemplate.imageUrl && (
                      <div className="h-32 w-full overflow-hidden">
                        <img src={emailTemplate.imageUrl} alt="Banner" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-6 space-y-4">
                       <div>
                          <p className="text-xs font-bold text-zinc-400 uppercase">Subject</p>
                          <p className="font-serif text-lg font-bold">{emailTemplate.subject}</p>
                       </div>
                       <hr className="border-zinc-100" />
                       <div 
                         className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 email-body-content"
                         dangerouslySetInnerHTML={{ __html: previewBody }}
                       />
                       <div className="flex justify-center pt-4">
                          <button disabled className="bg-yellow-600 text-black font-bold px-6 py-3 rounded-md uppercase text-xs tracking-widest opacity-80 cursor-not-allowed">
                             RSVP
                          </button>
                       </div>
                       <p className="text-center text-[10px] text-zinc-400 mt-2">*This is a preview of the email guest will receive. The button above is disabled here.</p>
                    </div>
                 </div>
                 
                 {/* Integration Status in Preview */}
                 <div className="text-center text-xs text-zinc-500">
                    Sending via: <span className={msAccount ? "text-green-500 font-bold" : "text-yellow-500 font-bold"}>
                        {msAccount ? `Microsoft 365 (${msAccount.username})` : 'Simulation Mode'}
                    </span>
                 </div>
              </div>

              <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3">
                 <button 
                   onClick={() => setShowEmailPreview(false)}
                   className="px-6 py-3 rounded-xl font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={processEmailSending}
                   disabled={sendingEmail}
                   className="px-6 py-3 rounded-xl font-bold bg-yellow-600 text-black hover:bg-yellow-500 transition-colors flex items-center gap-2"
                 >
                   {sendingEmail ? <span className="animate-pulse">Sending...</span> : <>Confirm & Send <ArrowRight size={16} /></>}
                 </button>
              </div>
           </div>
        </div>
      )}

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
                onClick={() => setSettingsTab('INTEGRATIONS')}
                className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 ${settingsTab === 'INTEGRATIONS' ? 'text-yellow-500 border-b-2 border-yellow-500 bg-yellow-500/10' : 'text-zinc-400 hover:bg-zinc-800'}`}
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
                           <RotateCcw size={12} /> Seed Defaults
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
                    
                    <div className="border border-zinc-700 rounded-lg overflow-hidden bg-zinc-800">
                        {/* Formatting Toolbar */}
                        <div className="flex items-center gap-1 p-2 border-b border-zinc-700 bg-zinc-900/50">
                            <button onClick={() => execCmd('bold')} className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white transition-colors" title="Bold"><Bold size={16}/></button>
                            <button onClick={() => execCmd('italic')} className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white transition-colors" title="Italic"><Italic size={16}/></button>
                            <button onClick={() => execCmd('underline')} className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white transition-colors" title="Underline"><Underline size={16}/></button>
                            <div className="w-px bg-zinc-700 mx-1 h-4"></div>
                            <button onClick={() => execCmd('formatBlock', 'P')} className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white transition-colors" title="Paragraph"><Type size={16}/></button>
                            <button onClick={() => execCmd('insertUnorderedList')} className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white transition-colors" title="List"><List size={16}/></button>
                            <div className="w-px bg-zinc-700 mx-1 h-4"></div>
                        </div>

                        {/* WYSIWYG Editor Area */}
                        <div 
                            ref={editorRef}
                            contentEditable
                            suppressContentEditableWarning
                            className="p-4 min-h-[200px] outline-none text-sm font-sans text-white leading-relaxed focus:bg-zinc-800/80 transition-colors"
                            onInput={(e) => setEmailTemplate({ ...emailTemplate, body: e.currentTarget.innerHTML })}
                            style={{ whiteSpace: 'pre-wrap' }}
                        />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                     <button onClick={saveTemplate} disabled={isSavingTemplate} className="bg-yellow-600 text-black font-bold px-6 py-2 rounded-lg hover:bg-yellow-500 transition-colors flex items-center gap-2">
                       {isSavingTemplate ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save Changes
                     </button>
                  </div>
                </div>
              )}

              {settingsTab === 'INTEGRATIONS' && (
                  <div className="space-y-6">
                      {/* Microsoft 365 Section */}
                      <div className="bg-zinc-800/50 p-6 rounded-xl border border-zinc-700 space-y-4">
                          <h4 className="font-bold text-white flex items-center gap-2">
                             <div className="w-6 h-6 bg-blue-500 text-white flex items-center justify-center rounded-md text-xs">MS</div> Microsoft 365
                          </h4>
                          <p className="text-xs text-zinc-400">
                             Send invitations directly from your Outlook/Office 365 account. Requires an App Registration in Azure AD with <code>Mail.Send</code> permissions.
                          </p>
                          <div className="bg-blue-900/20 border border-blue-900/40 p-4 rounded-lg">
                            <h5 className="text-xs font-bold text-blue-400 flex items-center gap-2 mb-2">
                              <HelpCircle size={14} /> Setup Instructions
                            </h5>
                            <ol className="text-[11px] text-zinc-300 list-decimal pl-4 space-y-1">
                                <li>Go to <strong>Azure Portal</strong> {'>'} <strong>App Registrations</strong> {'>'} Select your App.</li>
                                <li>Click <strong>Authentication</strong> in the left menu.</li>
                                <li>If you see "Web", delete it or add a new platform.</li>
                                <li>Click <strong>Add a platform</strong> and select <strong>Single-page application</strong>.</li>
                                <li>Add this exact Redirect URI: <code className="bg-black/30 px-1 rounded select-all">{window.location.origin}</code></li>
                                <li>Save changes and try connecting again.</li>
                            </ol>
                          </div>
                          
                          <div className="text-xs bg-black/30 p-3 rounded border border-zinc-700 font-mono text-zinc-500">
                              Current Redirect URI: <span className="text-white select-all">{window.location.origin}</span>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Application (Client) ID</label>
                            <input 
                                className="w-full bg-zinc-900 border border-zinc-700 p-3 rounded-lg text-white mb-2" 
                                value={msConfig.clientId} 
                                onChange={e => setMsConfig({...msConfig, clientId: e.target.value})}
                                placeholder="e.g. 00000000-0000-0000-0000-000000000000" 
                            />
                             <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Directory (Tenant) ID</label>
                            <input 
                                className="w-full bg-zinc-900 border border-zinc-700 p-3 rounded-lg text-white mb-2" 
                                value={msConfig.tenantId || ''} 
                                onChange={e => setMsConfig({...msConfig, tenantId: e.target.value})}
                                placeholder="e.g. 535fef1c-582f-4349-a92a-62d1f8311719" 
                            />
                            <button onClick={saveMsConfig} className="text-xs text-yellow-500 hover:underline">Save Config</button>
                          </div>

                          <div className="pt-2 border-t border-zinc-700">
                              {msAccount ? (
                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between bg-green-900/20 border border-green-900/50 p-3 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-xs">
                                                {msAccount.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm text-white font-medium">Connected</p>
                                                <p className="text-xs text-zinc-400">{msAccount.username}</p>
                                            </div>
                                        </div>
                                        <button onClick={handleMsLogout} className="text-xs text-red-400 hover:text-red-300">Disconnect</button>
                                    </div>
                                    
                                    {/* Test Email Section */}
                                    <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                                       <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Test Configuration</label>
                                       <div className="flex gap-2">
                                          <input 
                                            className="flex-1 bg-zinc-800 border border-zinc-700 p-2 rounded text-sm text-white" 
                                            value={testEmailTarget}
                                            onChange={(e) => setTestEmailTarget(e.target.value)}
                                            placeholder="cto@macl.aero"
                                          />
                                          <button 
                                            onClick={handleSendTestEmail}
                                            disabled={sendingTest}
                                            className="bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-2 rounded text-xs font-bold flex items-center gap-1"
                                          >
                                            {sendingTest ? <PlayCircle size={14} className="animate-pulse" /> : <PlayCircle size={14} />} 
                                            Send Test
                                          </button>
                                       </div>
                                    </div>
                                  </div>
                              ) : (
                                  <button 
                                    onClick={handleMsLogin}
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                                  >
                                    Connect Microsoft 365
                                  </button>
                              )}
                          </div>
                      </div>

                      {/* NEW Supabase/Domain Section */}
                      <div className="bg-zinc-800/50 p-6 rounded-xl border border-zinc-700 space-y-4">
                          <h4 className="font-bold text-white flex items-center gap-2">
                              <div className="w-6 h-6 bg-emerald-600 text-white flex items-center justify-center rounded-md text-xs">SB</div> 
                              Supabase & Domain Setup
                          </h4>
                          <p className="text-xs text-zinc-400">
                              When switching to a custom domain (like <strong>events.macl.aero</strong>), you must update your Supabase Auth settings to prevent login errors.
                          </p>
                          <div className="bg-emerald-900/20 border border-emerald-900/40 p-4 rounded-lg">
                              <h5 className="text-xs font-bold text-emerald-400 flex items-center gap-2 mb-2">
                                  <CheckCircle size={14} /> Required Action
                              </h5>
                              <ol className="text-[11px] text-zinc-300 list-decimal pl-4 space-y-1">
                                  <li>Go to <strong>Supabase Dashboard</strong> {'>'} Authentication {'>'} URL Configuration.</li>
                                  <li>Add <code className="bg-black/30 px-1 rounded select-all">{window.location.origin}</code> to <strong>Redirect URLs</strong>.</li>
                                  <li>Ensure <strong>Site URL</strong> is set to your primary domain.</li>
                              </ol>
                          </div>
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
                      <Send size={16} /> Send/Resend Pass Email
                  </button>
              </div>
          </div>
        </div>
      )}

      {/* Edit Guest Modal */}
      {editingGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800">
              <h3 className="serif text-2xl font-bold text-white">Edit Guest</h3>
              <button onClick={() => setEditingGuest(null)} className="text-zinc-400 hover:text-white"><X size={24} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
                <form onSubmit={handleUpdateGuest} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Full Name</label>
                      <input required className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-lg text-white" value={editingGuest.name} onChange={e => setEditingGuest({...editingGuest, name: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Email</label>
                      <input required type="email" className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-lg text-white" value={editingGuest.email} onChange={e => setEditingGuest({...editingGuest, email: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Organization</label>
                      <input required className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-lg text-white" value={editingGuest.organization} onChange={e => setEditingGuest({...editingGuest, organization: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Designation</label>
                      <input required className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-lg text-white" value={editingGuest.designation} onChange={e => setEditingGuest({...editingGuest, designation: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Mobile</label>
                      <div className="flex gap-2">
                        <select 
                          className="bg-zinc-800 border border-zinc-700 p-3 rounded-lg text-white outline-none"
                          value={editingGuest.countryCode}
                          onChange={(e) => setEditingGuest({...editingGuest, countryCode: e.target.value})}
                        >
                          {COUNTRY_CODES.map(code => <option key={code} value={code}>{code}</option>)}
                        </select>
                        <input className="flex-1 bg-zinc-800 border border-zinc-700 p-3 rounded-lg text-white" value={editingGuest.mobile} onChange={e => setEditingGuest({...editingGuest, mobile: e.target.value})} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Category</label>
                      <select 
                        className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-lg text-white" 
                        value={editingGuest.awardCategory} 
                        onChange={e => setEditingGuest({...editingGuest, awardCategory: e.target.value})}
                      >
                         {guestCategories.map(cat => (
                           <option key={cat} value={cat}>{cat}</option>
                         ))}
                      </select>
                    </div>
                  </div>
                  <button type="submit" disabled={isUpdating} className="w-full bg-yellow-600 text-black font-bold py-3 rounded-lg hover:bg-yellow-500 transition-colors mt-4">
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
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
           {/* Detailed KPIs */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             <div className="bg-zinc-900/80 p-6 rounded-2xl border border-zinc-800 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                   <Users size={64} className="text-zinc-500" />
                </div>
                <div className="relative z-10">
                   <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Total Guests</p>
                   <div className="flex items-baseline gap-2">
                     <span className="text-4xl font-bold text-white">{stats.total}</span>
                     <span className="text-xs text-green-500 bg-green-900/20 px-1.5 py-0.5 rounded font-bold">+100%</span>
                   </div>
                   <p className="text-[10px] text-zinc-400 mt-2">Registered in system</p>
                </div>
             </div>

             <div className="bg-zinc-900/80 p-6 rounded-2xl border border-zinc-800 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                   <Mail size={64} className="text-blue-500" />
                </div>
                <div className="relative z-10">
                   <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">Invitations Sent</p>
                   <div className="flex items-baseline gap-2">
                     <span className="text-4xl font-bold text-white">{stats.invited}</span>
                     <span className="text-xs text-zinc-500">of {stats.total}</span>
                   </div>
                   <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full" style={{ width: `${(stats.invited / Math.max(stats.total, 1)) * 100}%` }}></div>
                   </div>
                </div>
             </div>

             <div className="bg-zinc-900/80 p-6 rounded-2xl border border-zinc-800 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                   <CheckCircle size={64} className="text-yellow-500" />
                </div>
                <div className="relative z-10">
                   <p className="text-xs font-bold text-yellow-500 uppercase tracking-widest mb-1">RSVP Confirmed</p>
                   <div className="flex items-baseline gap-2">
                     <span className="text-4xl font-bold text-white">{stats.rsvp}</span>
                     <span className="text-xs text-zinc-500">{((stats.rsvp / Math.max(stats.invited, 1)) * 100).toFixed(0)}% Rate</span>
                   </div>
                   <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${(stats.rsvp / Math.max(stats.invited, 1)) * 100}%` }}></div>
                   </div>
                </div>
             </div>

             <div className="bg-zinc-900/80 p-6 rounded-2xl border border-zinc-800 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                   <UserCheck size={64} className="text-green-500" />
                </div>
                <div className="relative z-10">
                   <p className="text-xs font-bold text-green-500 uppercase tracking-widest mb-1">Total Arrived</p>
                   <div className="flex items-baseline gap-2">
                     <span className="text-4xl font-bold text-white">{stats.checkedIn}</span>
                   </div>
                   <p className="text-[10px] text-zinc-400 mt-2">Checked in at venue</p>
                   <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div className="bg-green-600 h-full rounded-full" style={{ width: `${(stats.checkedIn / Math.max(stats.rsvp, 1)) * 100}%` }}></div>
                   </div>
                </div>
             </div>
           </div>

           {/* Charts Row 1: Timeline & Distribution */}
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 shadow-lg">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-white flex items-center gap-2">
                       <TrendingUp size={18} className="text-yellow-500"/> Activity Timeline
                    </h3>
                    <div className="flex gap-2 text-xs">
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500"></div> RSVP</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Invited</div>
                    </div>
                 </div>
                 <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={timelineData}>
                            <defs>
                                <linearGradient id="colorRsvp" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#d4af37" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#d4af37" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorInvited" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                            <XAxis dataKey="date" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }}
                                itemStyle={{ fontSize: '12px' }}
                            />
                            <Area type="monotone" dataKey="invited" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorInvited)" name="Invited" />
                            <Area type="monotone" dataKey="rsvp" stroke="#d4af37" strokeWidth={2} fillOpacity={1} fill="url(#colorRsvp)" name="RSVP" />
                        </AreaChart>
                    </ResponsiveContainer>
                 </div>
              </div>

              <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 shadow-lg flex flex-col">
                 <h3 className="font-bold text-white flex items-center gap-2 mb-6">
                    <Activity size={18} className="text-green-500"/> Guest Funnel
                 </h3>
                 <div className="flex-1 flex flex-col justify-center space-y-6">
                    <div className="relative pt-6">
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-zinc-800"></div>
                        
                        <div className="relative pl-10 space-y-1 mb-8">
                             <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-zinc-600 border-2 border-zinc-900 -translate-x-1/2"></div>
                             <p className="text-xs text-zinc-500 uppercase font-bold">Total Guests</p>
                             <p className="text-xl font-bold text-white">{stats.total}</p>
                        </div>
                        
                        <div className="relative pl-10 space-y-1 mb-8">
                             <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-zinc-900 -translate-x-1/2"></div>
                             <p className="text-xs text-blue-500 uppercase font-bold">Invitations Sent</p>
                             <p className="text-xl font-bold text-white">{stats.invited}</p>
                             <p className="text-[10px] text-zinc-500">{(stats.invited/stats.total*100).toFixed(0)}% Coverage</p>
                        </div>

                        <div className="relative pl-10 space-y-1 mb-8">
                             <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-yellow-500 border-2 border-zinc-900 -translate-x-1/2"></div>
                             <p className="text-xs text-yellow-500 uppercase font-bold">Confirmed RSVP</p>
                             <p className="text-xl font-bold text-white">{stats.rsvp}</p>
                             <p className="text-[10px] text-zinc-500">{(stats.rsvp/stats.invited*100).toFixed(0)}% Response Rate</p>
                        </div>

                        <div className="relative pl-10 space-y-1">
                             <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-green-500 border-2 border-zinc-900 -translate-x-1/2"></div>
                             <p className="text-xs text-green-500 uppercase font-bold">Arrived</p>
                             <p className="text-xl font-bold text-white">{stats.checkedIn}</p>
                        </div>
                    </div>
                 </div>
              </div>
           </div>

           {/* Charts Row 2: Organization Stats & AI Insights */}
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 shadow-lg">
                 <h3 className="font-bold text-white flex items-center gap-2 mb-6">
                    <Building size={18} className="text-purple-500"/> Top Organizations
                 </h3>
                 <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={orgChartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={true} vertical={false} />
                            <XAxis type="number" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} hide />
                            <YAxis dataKey="name" type="category" width={120} stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                            <Tooltip 
                                cursor={{fill: '#27272a', opacity: 0.4}}
                                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }}
                            />
                            <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} name="Guests" />
                        </BarChart>
                    </ResponsiveContainer>
                 </div>
              </div>

              <div className="space-y-6">
                 {/* Live Feed */}
                 <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 shadow-lg">
                     <h3 className="font-bold text-white flex items-center gap-2 mb-4">
                        <Activity size={18} className="text-red-500 animate-pulse"/> Live Activity
                     </h3>
                     <div className="space-y-4">
                        {recentActivity.length === 0 ? (
                            <p className="text-sm text-zinc-500 italic">No recent activity.</p>
                        ) : (
                            recentActivity.map((act, i) => (
                                <div key={i} className="flex items-start gap-3 text-sm">
                                    <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${act.type === 'CHECKIN' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white truncate">
                                            <span className="font-bold">{act.guest.name}</span>
                                            <span className="text-zinc-500"> • {act.type === 'CHECKIN' ? 'Checked In' : 'RSVP Confirmed'}</span>
                                        </p>
                                        <p className="text-[10px] text-zinc-500">{new Date(act.time).toLocaleTimeString()}</p>
                                    </div>
                                </div>
                            ))
                        )}
                     </div>
                 </div>

                 {/* AI Insights (Compact) */}
                 <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 p-6 rounded-2xl border border-zinc-700 shadow-lg">
                    <div className="flex items-center gap-2 text-yellow-500 text-sm font-bold uppercase tracking-widest mb-3">
                        <Sparkles size={14} /> AI Analysis
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed italic border-l-2 border-yellow-500/30 pl-3">
                        {insights}
                    </p>
                 </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'STATS' && (
        <div className="space-y-6 animate-in fade-in">
            {/* Chart Section */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 shadow-xl">
                <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                    <Building size={20} className="text-yellow-500" /> Organization Engagement
                </h3>
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={detailedOrgStats.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                            <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip 
                                cursor={{fill: '#27272a', opacity: 0.4}}
                                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }}
                            />
                            <Legend />
                            <Bar dataKey="invited" name="Invited" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="rsvp" name="RSVP" fill="#eab308" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="checkedIn" name="Checked In" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-xl">
                <div className="p-6 border-b border-zinc-800">
                    <h3 className="font-bold text-white">Detailed Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-800/50 text-zinc-400 font-medium">
                            <tr>
                                <th className="px-6 py-4">Organization</th>
                                <th className="px-6 py-4 text-center">Total Guests</th>
                                <th className="px-6 py-4 text-center text-blue-500">Invited</th>
                                <th className="px-6 py-4 text-center text-yellow-500">RSVP</th>
                                <th className="px-6 py-4 text-center text-green-500">Checked In</th>
                                <th className="px-6 py-4 text-right">Yield</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {detailedOrgStats.map((stat, i) => (
                                <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-white">{stat.name}</td>
                                    <td className="px-6 py-4 text-center">{stat.total}</td>
                                    <td className="px-6 py-4 text-center text-zinc-300">{stat.invited}</td>
                                    <td className="px-6 py-4 text-center text-zinc-300">{stat.rsvp}</td>
                                    <td className="px-6 py-4 text-center text-zinc-300">{stat.checkedIn}</td>
                                    <td className="px-6 py-4 text-right text-zinc-400">
                                        {stat.invited > 0 ? ((stat.checkedIn / stat.invited) * 100).toFixed(0) : 0}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
                  onClick={() => initiateEmailSending()}
                  disabled={selectedGuestIds.size === 0 || sendingEmail}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase transition-colors ${selectedGuestIds.size > 0 ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
                >
                  <Send size={14} /> Send Email ({selectedGuestIds.size})
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
                  <th className="px-6 py-4">RSVP Status</th>
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
                              <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-900/20 px-2 py-0.5 rounded-md border border-green-900/30 font-bold uppercase tracking-wider">
                                  <CheckCircle size={12} /> INVITED
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                  <Mail size={12} /> Pending
                              </span>
                            )}
                          </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       {guest.rsvpConfirmed ? (
                          <span className="flex items-center gap-1.5 text-xs text-green-500 font-bold uppercase tracking-wider">
                             <CheckCircle size={14} /> Confirmed
                          </span>
                       ) : (
                          <span className="flex items-center gap-1.5 text-xs text-zinc-500 uppercase tracking-wider">
                             Pending
                          </span>
                       )}
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
                         {/* Specific Resend Button */}
                         {guest.invitationSent && (
                           <button 
                             onClick={() => initiateEmailSending([guest.id])}
                             title="Resend Invitation Email"
                             className="text-zinc-400 hover:text-blue-400 transition-colors p-1.5 hover:bg-blue-900/10 rounded-lg"
                           >
                             <RefreshCcw size={18} />
                           </button>
                         )}
                         {/* First Time Send Button (if singular action preferred over bulk) */}
                         {!guest.invitationSent && (
                           <button 
                             onClick={() => initiateEmailSending([guest.id])}
                             title="Send Invitation"
                             className="text-zinc-400 hover:text-green-400 transition-colors p-1.5 hover:bg-green-900/10 rounded-lg"
                           >
                             <Send size={18} />
                           </button>
                         )}

                         <button 
                           onClick={() => setViewTicketGuest(guest)}
                           title="View & Send QR Pass"
                           className="text-zinc-400 hover:text-yellow-500 transition-colors p-1.5 hover:bg-yellow-900/10 rounded-lg"
                         >
                           <QrCode size={18} />
                         </button>
                         
                         <button 
                           onClick={() => setEditingGuest(guest)}
                           title="Edit Guest"
                           className="text-zinc-400 hover:text-blue-400 transition-colors p-1.5 hover:bg-blue-900/10 rounded-lg"
                         >
                           <Edit size={18} />
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

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300 ${notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {notification.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
          <span className="font-bold text-sm max-w-xs">{notification.message}</span>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
