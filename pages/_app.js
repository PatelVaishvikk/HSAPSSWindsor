// pages/_app.js
import React, { useEffect } from 'react';
import Head from 'next/head';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/globals.css';
import DarkModeToggle from '@/components/DarkModeToggle';
import Navigation from '../components/Navbar';
import dynamic from 'next/dynamic';
// import ChatWidget from '../components/ChatWidget'; // Import the Chat Widget

// Dynamically import BirthdayReminder with no SSR
const BirthdayReminder = dynamic(
    () => import('../components/BirthdayReminder'),
    { ssr: false }
);

const MyApp = ({ Component, pageProps }) => {
    useEffect(() => {
        // Import bootstrap JS on client-side using dynamic import
        import('bootstrap/dist/js/bootstrap.bundle.min.js');
    }, []);

    return (
        <>
            <Head>
                {/* Meta tags for SEO */}
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="description" content="HSAPSS Windsor - Dashboard and Student Management" />
                <meta name="author" content="HSAPSS Windsor" />
                <meta httpEquiv="X-UA-Compatible" content="IE=edge" />

            </Head>
            {/* <Navigation />  */}
            <div className="app-container">
                {/* Render the main app component */}
                <Component {...pageProps} />
            </div>

            {/* Render the floating Chat Widget globally */}
            {/* <ChatWidget /> */}

            <style jsx global>{`
                :root {
                    --font-heading: 'Outfit', sans-serif;
                    --font-body: 'Inter', sans-serif;
                    --primary: #6366f1;
                    --primary-dark: #4f46e5;
                    --primary-light: #e0e7ff;
                    --secondary: #ec4899;
                    --accent: #8b5cf6;
                    --success: #10b981;
                    --warning: #f59e0b;
                    --danger: #ef4444;
                    --surface: #ffffff;
                    --background: #f8fafc;
                    --text-main: #0f172a;
                    --text-muted: #64748b;
                    --border-color: #e2e8f0;
                    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                    --radius-sm: 0.375rem;
                    --radius-md: 0.5rem;
                    --radius-lg: 1rem;
                    --radius-xl: 1.5rem;
                }

                body {
                    font-family: var(--font-body);
                    background-color: var(--background);
                    color: var(--text-main);
                    -webkit-font-smoothing: antialiased;
                }

                h1, h2, h3, h4, h5, h6 {
                    font-family: var(--font-heading);
                    font-weight: 700;
                    letter-spacing: -0.025em;
                }

                .app-container {
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                }

                .card {
                    border: none;
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-sm);
                    background-color: var(--surface);
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }

                .btn {
                    font-family: var(--font-heading);
                    font-weight: 600;
                    border-radius: var(--radius-md);
                    padding: 0.625rem 1.25rem;
                    transition: all 0.2s ease;
                }

                .btn-primary {
                    background-color: var(--primary);
                    border-color: var(--primary);
                }

                .btn-primary:hover {
                    background-color: var(--primary-dark);
                    border-color: var(--primary-dark);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
                }

                .form-control, .form-select {
                    border-radius: var(--radius-md);
                    border-color: var(--border-color);
                    padding: 0.75rem 1rem;
                    font-size: 0.95rem;
                }

                .form-control:focus, .form-select:focus {
                    border-color: var(--primary);
                    box-shadow: 0 0 0 4px var(--primary-light);
                }

                .badge {
                    font-weight: 600;
                    padding: 0.5em 0.8em;
                    border-radius: 9999px;
                }
            `}</style>
             <DarkModeToggle />

             <BirthdayReminder />

        </>
    );
};

export default MyApp;
