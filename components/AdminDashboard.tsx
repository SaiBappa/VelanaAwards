
import React, { useEffect, useState } from 'react';
import { Guest } from '../types';
import { INVITED_ORGANIZATIONS } from '../constants';
import { getAdminInsights } from '../services/geminiService';
import { Users, CheckCircle, Sparkles, Search, Trash2, Download, Table, PieChart as PieIcon, ListX } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import * as XLSX from 'xlsx';

interface AdminDashboardProps {
  guests: Guest[];
  onDeleteGuest: (id: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ guests, onDeleteGuest }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'GUESTS' | 'ORGS'>('OVERVIEW');
  const [insights, setInsights] = useState<string>('Generating attendance insights...');
  const [searchQuery, setSearchQuery] = useState('');

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

  const checkedInCount = guests.filter(g => g.checkedIn).length;
  
  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(guests);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Guests");
    XLSX.writeFile(workbook, "Velana_Awards_Guests.xlsx");
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

  const chartData = [
    { name: 'Checked In', value: checkedInCount, color: '#22c55e' },
    { name: 'Pending', value: guests.length - checkedInCount, color: '#3f3f46' }
  ];

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="serif text-3xl font-bold gold-text">Event Control Center</h2>
          <p className="text-zinc-400">Live guest tracking for Velana Awards</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'OVERVIEW' ? 'bg-yellow-600 text-black' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
          >
            Overview
          </button>
          <button 
             onClick={() => setActiveTab('GUESTS')}
             className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'GUESTS' ? 'bg-yellow-600 text-black' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
          >
            Guests
          </button>
           <button 
             onClick={() => setActiveTab('ORGS')}
             className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'ORGS' ? 'bg-yellow-600 text-black' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
          >
            Organizations
          </button>
        </div>
      </header>

      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-400 text-sm">Total RSVPs</span>
                <Users className="text-zinc-600" size={20} />
              </div>
              <div className="text-4xl font-bold">{guests.length}</div>
              <p className="text-xs text-zinc-500 mt-2">Guests registered</p>
            </div>
            
            <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-400 text-sm">Checked In</span>
                <CheckCircle className="text-green-600" size={20} />
              </div>
              <div className="text-4xl font-bold text-green-500">{checkedInCount}</div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-4 overflow-hidden">
                <div 
                  className="bg-green-600 h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${guests.length > 0 ? (checkedInCount / guests.length) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800/50 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2 italic">
                <Sparkles size={14} className="text-yellow-500" /> AI Insights
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {insights}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 h-[300px]">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><PieIcon size={16}/> Attendance Ratio</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
             </div>
             <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><ListX size={16}/> Non-Responding Organizations</h3>
                <div className="overflow-y-auto h-[220px] pr-2 space-y-2">
                   {orgStats.filter(o => o.status === 'No Response').map(org => (
                     <div key={org.name} className="flex justify-between items-center p-3 bg-zinc-800/50 rounded-lg">
                        <span className="text-sm text-zinc-300">{org.name}</span>
                        <span className="text-[10px] bg-red-900/30 text-red-400 px-2 py-1 rounded">No RSVP</span>
                     </div>
                   ))}
                   {orgStats.filter(o => o.status === 'No Response').length === 0 && (
                     <div className="text-center text-zinc-500 py-8">All invited organizations have responded!</div>
                   )}
                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'GUESTS' && (
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden animate-in fade-in">
          <div className="p-6 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="font-semibold">Full Guest List</h3>
            <div className="flex gap-3">
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
              <button 
                onClick={handleExport}
                className="flex items-center gap-2 bg-green-700/20 text-green-500 border border-green-700/50 hover:bg-green-700/30 px-4 py-2 rounded-lg text-sm transition-colors"
              >
                <Download size={16} /> Export Excel
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-800/50 text-zinc-400 font-medium">
                <tr>
                  <th className="px-6 py-4">Name / Designation</th>
                  <th className="px-6 py-4">Organization</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Check-In</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredGuests.map(guest => (
                  <tr key={guest.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium">{guest.name}</div>
                      <div className="text-xs text-zinc-500">{guest.designation}</div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="text-zinc-300">{guest.organization}</div>
                       {guest.awardCategory !== 'Not an Award Recipient' && (
                          <span className="text-[10px] text-yellow-500 font-bold uppercase">{guest.awardCategory}</span>
                       )}
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      <div>{guest.email}</div>
                      <div className="text-xs">{guest.countryCode} {guest.mobile}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        guest.checkedIn ? 'bg-green-900/30 text-green-500' : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        {guest.checkedIn ? 'Checked In' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => onDeleteGuest(guest.id)} className="text-zinc-600 hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
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
    </div>
  );
};

export default AdminDashboard;
