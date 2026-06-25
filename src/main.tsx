import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined' && window.location.pathname.startsWith('/auth/callback')) {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const error = params.get('error');

  if (code && typeof window.opener !== 'undefined' && window.opener) {
    window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', code }, window.location.origin);
  } else if (error && typeof window.opener !== 'undefined' && window.opener) {
    window.opener.postMessage({ type: 'OAUTH_AUTH_FAILURE', error }, window.location.origin);
  }

  // Render a clean success confirmation page in the popup and auto-close
  document.body.innerHTML = `
    <div style="font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #0f172a; color: white; text-align: center; padding: 24px; box-sizing: border-box;">
      <div style="font-size: 56px; margin-bottom: 24px; color: #10b981; animation: scaleIn 0.5s ease-out;">✓</div>
      <h2 style="font-size: 24px; font-weight: 900; margin: 0 0 12px 0; letter-spacing: -0.02em;">Authorized Successfully</h2>
      <p style="color: #94a3b8; font-size: 14px; line-height: 1.5; max-width: 320px; margin: 0 0 28px 0;">Your LinkedIn professional profile has been securely synchronized with the JobsEdge core workspace.</p>
      <button onclick="window.close()" style="padding: 12px 28px; border: none; border-radius: 12px; background: #2563eb; color: white; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer; transition: all 0.2s; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);">Close Window</button>
    </div>
  `;
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
