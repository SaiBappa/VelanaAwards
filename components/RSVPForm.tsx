
import React, { useState } from 'react';
import { Guest } from '../types';
import { NOMINEE_ORGANIZATIONS } from '../constants';
import { sendGuestConfirmationEmail } from '../services/emailService';
import { createGuest } from '../services/dataService';
import { User, Mail, Building, Briefcase, Phone, Loader2, AlertCircle } from 'lucide-react';

interface RSVPFormProps {
  onSuccess: (guest: Guest) => void;
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

const RSVPForm: React.FC<RSVPFormProps> = ({ onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    countryCode: '+960',
    mobile: '',
    organization: '',
    designation: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Auto-categorize based on Organization name
      const isNominee = NOMINEE_ORGANIZATIONS.some(org => 
        formData.organization.toLowerCase().includes(org.toLowerCase()) || 
        org.toLowerCase().includes(formData.organization.toLowerCase())
      );

      const newGuest: Guest = {
        ...formData,
        id: generateId(),
        awardCategory: isNominee ? "Nominee / Partner" : "Not an Award Recipient",
        rsvpDate: new Date().toISOString(),
        checkedIn: false
      };

      // 1. Create in Database
      await createGuest(newGuest);

      // 2. Trigger Email Service (Async, don't block UI if it's slow)
      sendGuestConfirmationEmail(newGuest).catch(console.error);

      // 3. Success
      onSuccess(newGuest);
    } catch (err: any) {
      console.error(err);
      setError("Failed to register. Please try again later. " + (err.message || ""));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-zinc-900/50 p-8 rounded-2xl border border-zinc-800 backdrop-blur-sm shadow-xl">
      <h2 className="serif text-3xl font-semibold mb-2 text-center gold-text">Confirm Your Attendance</h2>
      <p className="text-zinc-400 text-center mb-8 text-sm">
        Confirm your presence at Velana Awards 2026 and receive your digital pass instantly via email.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm text-zinc-400 flex items-center gap-2 font-medium">
            <User size={14} className="text-yellow-500" /> Full Name
          </label>
          <input
            required
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-yellow-600 outline-none transition-all placeholder:text-zinc-600"
            placeholder="e.g. Aishath Ahmed"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-sm text-zinc-400 flex items-center gap-2 font-medium">
              <Mail size={14} className="text-yellow-500" /> Email Address
            </label>
            <input
              required
              type="email"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-yellow-600 outline-none transition-all placeholder:text-zinc-600"
              placeholder="name@company.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-400 flex items-center gap-2 font-medium">
              <Phone size={14} className="text-yellow-500" /> Mobile Number
            </label>
            <div className="flex gap-2">
              <select 
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-3 focus:ring-2 focus:ring-yellow-600 outline-none transition-all"
                value={formData.countryCode}
                onChange={(e) => setFormData({...formData, countryCode: e.target.value})}
              >
                {COUNTRY_CODES.map(code => <option key={code} value={code}>{code}</option>)}
              </select>
              <input
                required
                type="tel"
                className="flex-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-yellow-600 outline-none transition-all placeholder:text-zinc-600"
                placeholder="7771234"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-zinc-400 flex items-center gap-2 font-medium">
            <Building size={14} className="text-yellow-500" /> Organization Name
          </label>
          <input
            required
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-yellow-600 outline-none transition-all placeholder:text-zinc-600"
            placeholder="e.g. Maldivian"
            value={formData.organization}
            onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-zinc-400 flex items-center gap-2 font-medium">
            <Briefcase size={14} className="text-yellow-500" /> Designation
          </label>
          <input
            required
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-yellow-600 outline-none transition-all placeholder:text-zinc-600"
            placeholder="e.g. Chief Executive Officer"
            value={formData.designation}
            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
          />
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-900/50 p-4 rounded-lg flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full gold-gradient text-black font-bold py-4 rounded-xl mt-8 hover:opacity-90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-yellow-900/20 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={20} /> Processing...
            </>
          ) : (
            "Confirm Attendance"
          )}
        </button>
      </form>
    </div>
  );
};

export default RSVPForm;
