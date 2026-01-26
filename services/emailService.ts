
import { Guest, EmailTemplate, MicrosoftConfig } from "../types";
import { getGraphAccessToken, sendEmailViaGraph } from "./msGraphService";

// Helper to construct HTML email with optional CTA button
const createHtmlEmail = (bodyContent: string, imageUrl?: string, ctaUrl?: string, ctaText: string = "View Details") => {
    const imageHtml = imageUrl 
        ? `<div style="margin-bottom: 24px;"><img src="${imageUrl}" alt="Event Banner" style="max-width: 100%; border-radius: 12px; display: block; margin: 0 auto;" /></div>` 
        : '';

    const buttonHtml = ctaUrl
        ? `
        <div style="text-align: center; margin-top: 32px; margin-bottom: 32px;">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${ctaUrl}" style="height:50px;v-text-anchor:middle;width:200px;" arcsize="10%" stroke="f" fillcolor="#d4af37">
            <w:anchorlock/>
            <center>
            <![endif]-->
                <a href="${ctaUrl}"
                style="background-color:#d4af37;background-image:linear-gradient(135deg, #d4af37 0%, #f9e29b 50%, #d4af37 100%);color:#000000;display:inline-block;font-family:sans-serif;font-size:16px;font-weight:bold;line-height:50px;text-align:center;text-decoration:none;width:200px;-webkit-text-size-adjust:none;border-radius:8px;">${ctaText}</a>
            <!--[if mso]>
            </center>
            </v:roundrect>
            <![endif]-->
        </div>
        `
        : '';
        
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f5;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td style="padding: 40px 10px;">
                    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #18181b; background-color: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                        ${imageHtml}
                        <div style="white-space: pre-wrap; line-height: 1.8; font-size: 16px; color: #3f3f46;">${bodyContent}</div>
                        ${buttonHtml}
                        <hr style="border: 0; border-top: 1px solid #e4e4e7; margin: 40px 0 20px 0;" />
                        <p style="font-size: 12px; color: #a1a1aa; text-align: center; margin: 0;">Velana Awards 2026</p>
                    </div>
                </td>
            </tr>
        </table>
    </body>
    </html>
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
               <p>Thank you for confirming your attendance at the Velana Awards 2026.</p>
               <p>Your digital pass is ready. Please click the button below to view and save your QR code. You will need to present this upon arrival.</p>
               <p>We look forward to welcoming you.</p>`,
               undefined,
               passUrl,
               "View Guest Pass"
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

  // The RSVP URL effectively acts as the pass URL for pre-registered guests
  const rsvpUrl = `${window.location.origin}?guestId=${guest.id}`;

  if (msConfig && msConfig.clientId) {
      const token = await getGraphAccessToken(msConfig.clientId);
      if (token) {
          console.log(`[Email Service] 📧 Sending via Microsoft 365 to: ${guest.email}`);
          
          const htmlBody = createHtmlEmail(personalizedBody, template.imageUrl, rsvpUrl, "Confirm Attendance");
          
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
  console.log(`[Email Service] RSVP Link: ${rsvpUrl}`);
  await new Promise(resolve => setTimeout(resolve, 800));
  return true;
};
