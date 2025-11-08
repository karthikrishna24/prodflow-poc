import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return {apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email};
}

async function getUncachableResendClient() {
  const {apiKey, fromEmail} = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

export async function sendInvitationEmail(
  toEmail: string,
  inviterName: string,
  workspaceName: string,
  role: string,
  invitationToken: string,
  baseUrl?: string
) {
  const { client, fromEmail } = await getUncachableResendClient();
  
  // Use provided baseUrl or construct from environment
  const host = baseUrl || process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(',')[0];
  if (!host) {
    throw new Error("No valid host URL available for invitation email. Please configure REPLIT_DEV_DOMAIN or REPLIT_DOMAINS.");
  }
  const acceptUrl = `https://${host}/invite/${invitationToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background-color: #f8fafc;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          .anchor-icon {
            font-size: 48px;
            margin-bottom: 10px;
          }
          .content {
            padding: 40px 30px;
          }
          .button {
            display: inline-block;
            background-color: #2563eb;
            color: white;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
          }
          .footer {
            background-color: #f1f5f9;
            padding: 20px 30px;
            text-align: center;
            color: #64748b;
            font-size: 14px;
          }
          .info-box {
            background-color: #f0f9ff;
            border-left: 4px solid #2563eb;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="anchor-icon">⚓</div>
            <h1 style="margin: 0; font-size: 28px;">Welcome Aboard!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">You've been invited to join DockVoyage</p>
          </div>
          
          <div class="content">
            <p style="font-size: 16px; color: #1e293b; line-height: 1.6;">
              Ahoy! <strong>${inviterName}</strong> has invited you to embark on a journey with <strong>${workspaceName}</strong> on DockVoyage.
            </p>
            
            <div class="info-box">
              <p style="margin: 0; color: #1e40af;">
                <strong>Your Role:</strong> ${role === 'admin' ? 'Admin (Full access to manage the workspace)' : 'Developer (Access to manage releases)'}
              </p>
            </div>
            
            <p style="font-size: 16px; color: #1e293b; line-height: 1.6;">
              DockVoyage helps teams track releases across environments, manage deployment flows, and keep everyone informed about the voyage from development to production.
            </p>
            
            <div style="text-align: center;">
              <a href="${acceptUrl}" class="button">Accept Invitation</a>
            </div>
            
            <p style="font-size: 14px; color: #64748b; margin-top: 30px;">
              This invitation link will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
          
          <div class="footer">
            <p style="margin: 0;">
              <strong>DockVoyage</strong> - See your releases clearly
            </p>
            <p style="margin: 10px 0 0 0;">
              Setting sail for smoother deployments ⚓
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  await client.emails.send({
    from: fromEmail,
    to: toEmail,
    subject: `⚓ You've been invited to join ${workspaceName} on DockVoyage`,
    html,
  });
}
