
import { PublicClientApplication } from "@azure/msal-browser";

let msalInstance: PublicClientApplication | null = null;
let currentClientId: string | null = null;
let currentAuthority: string | null = null;

export const initializeMsal = async (clientId: string, tenantId?: string) => {
  // Construct authority URL
  const authority = tenantId 
    ? `https://login.microsoftonline.com/${tenantId}` 
    : 'https://login.microsoftonline.com/common';

  // If an instance exists, check if the configuration matches the requested one.
  // If it matches, reuse it. If not, we need a new instance.
  if (msalInstance && currentClientId === clientId && currentAuthority === authority) {
    return msalInstance;
  }

  // Create new instance
  console.log(`[MS Graph] Initializing MSAL with ClientID: ${clientId} and Authority: ${authority}`);
  
  msalInstance = await PublicClientApplication.createPublicClientApplication({
    auth: {
      clientId: clientId,
      redirectUri: window.location.origin,
      authority: authority
    },
    cache: {
      cacheLocation: "localStorage",
      storeAuthStateInCookie: false,
    }
  });
  
  // Update current config tracking
  currentClientId = clientId;
  currentAuthority = authority;
  
  return msalInstance;
};

export const signInWithMicrosoft = async (clientId: string, tenantId?: string) => {
  if (!clientId) throw new Error("Client ID is missing");
  
  const msal = await initializeMsal(clientId, tenantId);
  try {
    const loginResponse = await msal.loginPopup({
      scopes: ["Mail.Send", "User.Read"],
      prompt: "select_account"
    });
    return loginResponse.account;
  } catch (err: any) {
    console.error("Microsoft Login Failed:", err);
    throw new Error(err.errorMessage || err.message || "Login failed");
  }
};

export const getGraphAccessToken = async (clientId: string, tenantId?: string) => {
   const msal = await initializeMsal(clientId, tenantId);
   const accounts = msal.getAllAccounts();
   if (accounts.length === 0) return null;

   try {
     const response = await msal.acquireTokenSilent({
       scopes: ["Mail.Send", "User.Read"],
       account: accounts[0]
     });
     return response.accessToken;
   } catch (err) {
     console.warn("Silent token acquisition failed", err);
     return null;
   }
};

export const getActiveAccount = async (clientId: string, tenantId?: string) => {
    const msal = await initializeMsal(clientId, tenantId);
    const accounts = msal.getAllAccounts();
    return accounts.length > 0 ? accounts[0] : null;
};

export const logoutMicrosoft = async (clientId: string, tenantId?: string) => {
    const msal = await initializeMsal(clientId, tenantId);
    await msal.logoutPopup();
    // Clear local cache variables to force re-init next time if needed
    msalInstance = null;
    currentClientId = null;
    currentAuthority = null;
};

export const sendEmailViaGraph = async (accessToken: string, emailData: {
    to: string;
    subject: string;
    htmlBody: string;
}) => {
  const message = {
    message: {
      subject: emailData.subject,
      body: {
        contentType: "HTML",
        content: emailData.htmlBody
      },
      toRecipients: [
        {
          emailAddress: {
            address: emailData.to
          }
        }
      ]
    },
    saveToSentItems: "true"
  };

  const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(message)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to send email via Microsoft Graph");
  }
  return true;
};
