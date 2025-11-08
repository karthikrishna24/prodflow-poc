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
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            background-attachment: fixed;
            margin: 0;
            padding: 20px;
            line-height: 1.6;
          }
          .email-wrapper {
            max-width: 600px;
            margin: 0 auto;
          }
          .container {
            background-color: #ffffff;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          }
          .header {
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%);
            color: white;
            padding: 50px 30px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none"><path d="M0,0 C150,80 350,80 600,40 C850,0 1050,0 1200,40 L1200,120 L0,120 Z" fill="rgba(255,255,255,0.1)"/></svg>') no-repeat bottom;
            background-size: cover;
            opacity: 0.3;
          }
          .header-content {
            position: relative;
            z-index: 1;
          }
          .ship-icon {
            font-size: 64px;
            margin-bottom: 15px;
            display: block;
            animation: float 3s ease-in-out infinite;
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          .header h1 {
            margin: 0;
            font-size: 36px;
            font-weight: 700;
            letter-spacing: -0.5px;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
          }
          .header .subtitle {
            margin: 15px 0 0 0;
            font-size: 18px;
            opacity: 0.95;
            font-weight: 500;
          }
          .wave-divider {
            height: 60px;
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%);
            position: relative;
            overflow: hidden;
          }
          .wave-divider::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 30px;
            background: white;
            border-radius: 50% 50% 0 0 / 100% 100% 0 0;
            transform: scaleX(1.2);
          }
          .content {
            padding: 50px 40px;
            background: white;
          }
          .journey-section {
            text-align: center;
            margin-bottom: 40px;
          }
          .journey-title {
            font-size: 28px;
            font-weight: 700;
            color: #1e3a8a;
            margin-bottom: 15px;
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .journey-text {
            font-size: 18px;
            color: #475569;
            line-height: 1.8;
            margin-bottom: 10px;
          }
          .inviter-highlight {
            color: #1e3a8a;
            font-weight: 600;
          }
          .workspace-highlight {
            color: #3b82f6;
            font-weight: 600;
          }
          .info-box {
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border: 2px solid #3b82f6;
            border-radius: 16px;
            padding: 25px;
            margin: 30px 0;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
          }
          .info-box-title {
            font-size: 14px;
            font-weight: 600;
            color: #1e40af;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
          }
          .info-box-content {
            font-size: 16px;
            color: #1e40af;
            font-weight: 500;
          }
          .role-badge {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            margin-top: 8px;
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
          }
          .features {
            margin: 40px 0;
            padding: 30px;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-radius: 16px;
          }
          .features-title {
            font-size: 20px;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 20px;
            text-align: center;
          }
          .feature-item {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            padding: 12px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          }
          .feature-icon {
            font-size: 24px;
            margin-right: 15px;
            width: 40px;
            text-align: center;
          }
          .feature-text {
            font-size: 15px;
            color: #475569;
            flex: 1;
          }
          .cta-section {
            text-align: center;
            margin: 40px 0;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            text-decoration: none;
            padding: 18px 48px;
            border-radius: 50px;
            font-weight: 700;
            font-size: 18px;
            margin: 20px 0;
            box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
            transition: all 0.3s ease;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            position: relative;
            overflow: hidden;
          }
          .button::before {
            content: '🚢';
            margin-right: 8px;
          }
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 28px rgba(59, 130, 246, 0.5);
          }
          .expiry-notice {
            text-align: center;
            font-size: 14px;
            color: #64748b;
            margin-top: 30px;
            padding: 20px;
            background: #f8fafc;
            border-radius: 12px;
            border-left: 4px solid #94a3b8;
          }
          .footer {
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          .footer-logo {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
          .footer-tagline {
            font-size: 16px;
            opacity: 0.9;
            margin-bottom: 20px;
          }
          .footer-message {
            font-size: 14px;
            opacity: 0.7;
            font-style: italic;
          }
          .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            margin: 30px 0;
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            <div class="header">
              <div class="header-content">
                <span class="ship-icon">🚢</span>
                <h1>Welcome Aboard, Sailor!</h1>
                <p class="subtitle">Your Voyage Awaits on DockVoyage</p>
              </div>
            </div>
            
            <div class="wave-divider"></div>
            
            <div class="content">
              <div class="journey-section">
                <h2 class="journey-title">⚓ Embark on an Epic Journey</h2>
                <p class="journey-text">
                  Ahoy there! <span class="inviter-highlight">${inviterName}</span> has extended an invitation for you to join the crew of <span class="workspace-highlight">${workspaceName}</span> and set sail on an incredible voyage with DockVoyage.
                </p>
                <p class="journey-text" style="font-size: 16px; margin-top: 15px;">
                  Together, we'll navigate the seas of software releases, chart courses through deployment environments, and ensure smooth sailing from development to production. 🌊
                </p>
              </div>
              
              <div class="info-box">
                <div class="info-box-title">Your Role on This Voyage</div>
                <div class="info-box-content">
                  ${role === 'admin' 
                    ? 'As an <strong>Admin</strong>, you\'ll have full command of the ship - managing the workspace, inviting crew members, and steering the course of all releases.' 
                    : 'As a <strong>Developer</strong>, you\'ll be an essential part of the crew - managing releases, tracking deployments, and keeping the voyage on course.'}
                </div>
                <div class="role-badge">${role === 'admin' ? '⚡ Captain (Admin)' : '👨‍💻 Crew Member (Developer)'}</div>
              </div>
              
              <div class="features">
                <div class="features-title">What Awaits You on This Journey</div>
                <div class="feature-item">
                  <div class="feature-icon">🗺️</div>
                  <div class="feature-text"><strong>Track Releases</strong> - Monitor your deployments across all environments in real-time</div>
                </div>
                <div class="feature-item">
                  <div class="feature-icon">⚓</div>
                  <div class="feature-text"><strong>Manage Flows</strong> - Create visual workflows for your deployment pipeline</div>
                </div>
                <div class="feature-item">
                  <div class="feature-icon">🚨</div>
                  <div class="feature-text"><strong>Resolve Blockers</strong> - Track and resolve issues to keep your releases on course</div>
                </div>
                <div class="feature-item">
                  <div class="feature-icon">👥</div>
                  <div class="feature-text"><strong>Team Collaboration</strong> - Work seamlessly with your crew members</div>
                </div>
              </div>
              
              <div class="cta-section">
                <a href="${acceptUrl}" class="button">Accept Invitation & Set Sail</a>
              </div>
              
              <div class="expiry-notice">
                ⏰ <strong>Important:</strong> This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this message.
              </div>
            </div>
            
            <div class="footer">
              <div class="footer-logo">
                <span>⚓</span>
                <span>DockVoyage</span>
              </div>
              <div class="footer-tagline">See your releases clearly</div>
              <div class="divider"></div>
              <div class="footer-message">
                "The best way to predict the future is to ship it." ⛵<br>
                Setting sail for smoother deployments, one release at a time.
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  await client.emails.send({
    from: fromEmail,
    to: toEmail,
    subject: `🚢 Embark on a Journey: Join ${workspaceName} on DockVoyage`,
    html,
  });
}
