
import { supabase } from './supabaseClient';
import { Guest } from '../types';

// Map database snake_case columns to TypeScript camelCase properties
const mapToGuest = (row: any): Guest => ({
  id: row.id,
  name: row.name,
  email: row.email,
  countryCode: row.country_code,
  mobile: row.mobile,
  organization: row.organization,
  designation: row.designation,
  awardCategory: row.award_category,
  rsvpDate: row.rsvp_date,
  checkedIn: row.checked_in,
  checkInTime: row.check_in_time,
  invitationSent: row.invitation_sent,
  invitationSentAt: row.invitation_sent_at
});

export const fetchAllGuests = async (): Promise<Guest[]> => {
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .order('rsvp_date', { ascending: false });
  
  if (error) {
    console.error('Error fetching guests:', error);
    throw error;
  }
  
  return data ? data.map(mapToGuest) : [];
};

export const createGuest = async (guest: Guest): Promise<void> => {
  const { error } = await supabase
    .from('guests')
    .insert([{
      id: guest.id,
      name: guest.name,
      email: guest.email,
      country_code: guest.countryCode,
      mobile: guest.mobile,
      organization: guest.organization,
      designation: guest.designation,
      award_category: guest.awardCategory,
      rsvp_date: guest.rsvpDate,
      checked_in: guest.checkedIn,
      invitation_sent: false
    }]);

  if (error) {
    console.error('Error creating guest:', error);
    throw error;
  }
};

export const bulkCreateGuests = async (guests: Guest[]): Promise<void> => {
  const dbPayload = guests.map(guest => ({
    id: guest.id,
    name: guest.name,
    email: guest.email,
    country_code: guest.countryCode,
    mobile: guest.mobile,
    organization: guest.organization,
    designation: guest.designation,
    award_category: guest.awardCategory,
    rsvp_date: guest.rsvpDate,
    checked_in: guest.checkedIn,
    invitation_sent: false
  }));

  const { error } = await supabase
    .from('guests')
    .insert(dbPayload);

  if (error) {
    console.error('Error bulk creating guests:', error);
    throw error;
  }
};

export const updateGuestCheckIn = async (id: string): Promise<string> => {
  const timestamp = new Date().toISOString();
  const { error } = await supabase
    .from('guests')
    .update({ 
      checked_in: true, 
      check_in_time: timestamp 
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating check-in:', error);
    throw error;
  }
  return timestamp;
};

export const updateGuestInvitationStatus = async (id: string): Promise<string> => {
  const timestamp = new Date().toISOString();
  const { error } = await supabase
    .from('guests')
    .update({ 
      invitation_sent: true, 
      invitation_sent_at: timestamp 
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating invitation status:', error);
    throw error;
  }
  return timestamp;
};

export const removeGuest = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('guests')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting guest:', error);
    throw error;
  }
};
