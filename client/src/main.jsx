import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CurrencyProvider } from './context/CurrencyContext.jsx';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <GoogleOAuthProvider clientId="220121261781-nqsdbf47vco7s3h8dqraoqpf27kjipu6.apps.googleusercontent.com">
        <ThemeProvider>
          <AuthProvider>
            <CurrencyProvider>
              <App />
            </CurrencyProvider>
          <Toaster 
            position="top-right" 
            toastOptions={{
              style: {
                background: 'var(--color-bg-card-solid)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
                borderRadius: '0.75rem',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
              },
              success: {
                iconTheme: {
                  primary: 'var(--color-success)',
                  secondary: 'var(--color-bg-card-solid)',
                },
              },
              error: {
                iconTheme: {
                  primary: 'var(--color-danger)',
                  secondary: 'var(--color-bg-card-solid)',
                },
              },
            }} 
          />
          </AuthProvider>
        </ThemeProvider>
      </GoogleOAuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
