import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import { AuthProvider } from './context/auth-context.js';
import './styles/globals.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
    throw new Error('No se encontró el elemento raíz "#root" en el DOM.');
}

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <AuthProvider>
            <App />
        </AuthProvider>
    </React.StrictMode>,
);