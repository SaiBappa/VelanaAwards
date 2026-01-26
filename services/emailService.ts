
import { Guest, EmailTemplate, BirdConfig } from "../types";

const BIRD_API_BASE = "https://api.bird.com";

// Helper to get config from local storage if not provided (for RSVP form usage)
const getStoredConfig = (): BirdConfig | null => {
  const saved = localStorage.getItem('velana_bird_config');
  return saved ? JSON.parse(saved) : null;
};

const sendBirdEmail = async (
  toEmail: string, 
  subject: string, 
  htmlBody: string, 
  textBody: string,
  config?: BirdConfig
): Promise<void> => {
  const finalConfig = config || getStoredConfig();

  if (!finalConfig || !finalConfig.apiKey || !finalConfig.workspaceId || !finalConfig.emailChannelId) {
    console.warn("Bird Email Configuration missing. Falling back to console log.");
    console.log(`[Mock Email] To: ${toEmail}, Subject: ${subject}`);
    return;
  }

  const url = `${BIRD_API_BASE}/workspaces/${finalConfig.workspaceId}/channels/${finalConfig.emailChannelId}/messages`;

  const payload = {
    receiver: {
      contacts: [
        {
          identifierValue: toEmail,
          identifierKey: "emailaddress"
        }
      ]
    },
    body: {
      type: "html",
      html: {
        html: htmlBody,
        text: textBody
      }
    },
    subject: subject,
    sender: {
        name: finalConfig.emailFromName || "Velana Awards",
        address: finalConfig.emailFromAddress // Optional, depends on channel config
    }
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `AccessKey ${finalConfig.apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("Bird Email API Error:", errData);
      throw new Error(`Email API failed: ${response.status} ${response.statusText}`);
    }

    console.log(`Email sent successfully via Bird to ${toEmail}`);
  } catch (error) {
    console.error("Failed to send email via Bird:", error);
    throw error;
  }
};

export const sendGuestConfirmationEmail = async (guest: Guest, config?: BirdConfig): Promise<boolean> => {
  const subject = `Your Digital Pass - Velana Awards 2026`;
  const passLink = `${window.location.origin}?guestId=${guest.id}`;
  
  const textBody = `Dear ${guest.name},\n\nThank you for confirming your attendance.\n\nYour Guest ID is: ${guest.id}\n\nView your digital pass here: ${passLink}\n\nSee you at the event!`;
  
  const htmlBody = `
    <div style="font-family: sans-serif; color: #333;">
      <h2>Velana Awards 2026</h2>
      <p>Dear ${guest.name},</p>
      <p>Thank you for confirming your attendance. We are excited to welcome you.</p>
      <div style="background: #f4f4f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
         <p style="font-size: 12px; text-transform: uppercase; color: #666;">Guest ID</p>
         <h1 style="margin: 5px 0; color: #d4af37;">${guest.id}</h1>
         <a href="${passLink}" style="display: inline-block; background: #000; color: #d4af37; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">View Digital Pass</a>
      </div>
      <p>Please present your digital pass upon arrival at Crossroads Maldives.</p>
    </div>
  `;

  await sendBirdEmail(guest.email, subject, htmlBody, textBody, config);
  return true;
};

export const sendInvitationEmail = async (guest: Guest, template: EmailTemplate, config?: BirdConfig): Promise<boolean> => {
  const rsvpLink = `${window.location.origin}?rsvp=true&guestId=${guest.id}`; // In a real app this might be an RSVP specific page
  
  const personalizedBody = template.body
    .replace('{name}', guest.name)
    .replace('{organization}', guest.organization)
    .replace(/\n/g, '<br/>');

  const textBody = template.body
    .replace('{name}', guest.name)
    .replace('{organization}', guest.organization);

  const htmlBody = `
    <div style="font-family: 'Times New Roman', serif; color: #000; max-width: 600px; margin: 0 auto;">
      ${template.imageUrl ? `<img src="${template.imageUrl}" style="width: 100%; border-radius: 8px; margin-bottom: 20px;" />` : ''}
      <h2 style="color: #d4af37; text-transform: uppercase;">${template.subject}</h2>
      <div style="font-size: 16px; line-height: 1.6;">
        ${personalizedBody}
      </div>
      <div style="text-align: center; margin-top: 30px;">
        <a href="${rsvpLink}" style="background: #d4af37; color: #000; padding: 15px 30px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; border-radius: 4px;">Confirm Attendance</a>
      </div>
    </div>
  `;

  await sendBirdEmail(guest.email, template.subject, htmlBody, textBody, config);
  return true;
};
