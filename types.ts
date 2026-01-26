
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
  invitationSent?: boolean;
  invitationSentAt?: string;
}

export type ViewState = 'HOME' | 'TICKET' | 'ADMIN' | 'SCANNER' | 'CATEGORIES' | 'LOGIN';

export interface EventStats {
  totalRSVPs: number;
  totalCheckedIn: number;
  awardRecipientsCount: number;
}

export interface EmailTemplate {
  subject: string;
  imageUrl: string;
  body: string;
}

export interface MicrosoftConfig {
  clientId: string;
  tenantId?: string;
}
