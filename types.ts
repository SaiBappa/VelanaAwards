
export interface Guest {
  id: string;
  name: string;
  email: string;
  countryCode: string;
  mobile: string;
  organization: string;
  designation: string;
  awardCategory?: string;
  rsvpDate: string;
  checkedIn: boolean;
  checkInTime?: string;
}

export type ViewState = 'HOME' | 'RSVP' | 'TICKET' | 'ADMIN' | 'SCANNER' | 'CATEGORIES';

export interface EventStats {
  totalRSVPs: number;
  totalCheckedIn: number;
  awardRecipientsCount: number;
}
