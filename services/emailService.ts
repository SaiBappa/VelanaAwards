
import { Guest, EmailTemplate, MicrosoftConfig } from "../types";
import { getGraphAccessToken, sendEmailViaGraph } from "./msGraphService";

// Helper to construct HTML email
const createHtmlEmail = (bodyContent: string, imageUrl?: string) => {
    const imageHtml = imageUrl 
        ? `<div style="margin-bottom: 20px;"><img src="${imageUrl}" alt="Event Banner" style="max-width: 100%; border-radius: 8px;" /></div>` 
        : '';
        
    return `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        ${imageHtml}
        <div style="white-space: pre-wrap; line-height: 1.6;">${bodyContent}</div>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="font-size: 12px; color: #888; text-align: center;">Velana Awards 2026</p>
    </div>
    `;
};

export const sendGuestConfirmationEmail = async (guest: Guest, msConfig?: MicrosoftConfig): Promise<boolean> => {
  const passUrl = `${window.location.origin}?guestId=${guest.id}`;
  
  if (msConfig && msConfig.clientId) {
      const token = await getGraphAccessToken(msConfig.clientId);
      if (token) {
          console.log(`[Email Service] 📧 Sending via Microsoft 365 to: ${guest.email}`);
          const htmlBody = createHtmlEmail(
              `<p>Dear ${guest.name},</p>
               <p>Thank you for confirming your attendance.</p>
               <p><strong>Your Digital Pass:</strong> <a href="${passUrl}">Click here to view your QR Code</a></p>
               <p>Please present this QR code at the entrance.</p>`
          );
          
          await sendEmailViaGraph(token, {
              to: guest.email,
              subject: "Your Velana Awards 2026 Digital Pass",
              htmlBody: htmlBody
          });
          return true;
      }
  }

  // Fallback Simulation
  console.log(`[Email Service] ⚠️ Simulation (No MS Config or Token)`);
  console.log(`[Email Service] 📧 Sending QR Pass to: ${guest.email}`);
  console.log(`[Email Service] Pass URL: ${passUrl}`);
  await new Promise(resolve => setTimeout(resolve, 800));
  return true;
};

export const sendInvitationEmail = async (guest: Guest, template: EmailTemplate, msConfig?: MicrosoftConfig): Promise<boolean> => {
  const personalizedBody = template.body
    .replace('{name}', guest.name)
    .replace('{organization}', guest.organization);

  if (msConfig && msConfig.clientId) {
      const token = await getGraphAccessToken(msConfig.clientId);
      if (token) {
          console.log(`[Email Service] 📧 Sending via Microsoft 365 to: ${guest.email}`);
          
          const htmlBody = createHtmlEmail(personalizedBody, template.imageUrl);
          
          await sendEmailViaGraph(token, {
              to: guest.email,
              subject: template.subject,
              htmlBody: htmlBody
          });
          return true;
      }
  }

  // Fallback Simulation
  console.log(`[Email Service] ⚠️ Simulation (No MS Config or Token)`);
  console.log(`[Email Service] 📧 Sending Invitation to: ${guest.email}`);
  console.log(`[Email Service] Subject: ${template.subject}`);
  console.log(`[Email Service] Body: ${personalizedBody}`);
  await new Promise(resolve => setTimeout(resolve, 800));
  return true;
};
