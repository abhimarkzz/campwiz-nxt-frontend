import React, { useEffect, useState } from "react";
import type { Session } from "../types/session";
import sessionContext from "../contexts/SessionContext";
import { Navigate } from "react-router-dom";
import { fetchAPIFromBackendSingleWithErrorHandling } from "@/api";
const SessionLoading = () => {
    return <div>Loading who are you...</div>;
}
const SessionError = ({ error }: { error: Error }) => {
    return (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Error loading session: {error.message}</p>
            <button onClick={() => window.location.href = '/user/login'}>
                Go to Login
            </button>
        </div>
    );
}
const SessionProvider = ({ children }: { children: React.ReactNode }) => {
    const [sessionLoading, setSessionLoading] = useState(true);
    const [session, setSession] = useState<Session | null>(null);
    const [sessionError, setSessionError] = useState<Error | null>(null);
    useEffect(() => {
        const fetchSession = async () => {
            setSessionLoading(true);
            setSessionError(null);
            try {
                const response = await fetchAPIFromBackendSingleWithErrorHandling<Session>('/user/me');
                if ('detail' in response) {
                    // 401 Unauthorized = not logged in, treat as null session (not an error)
                    if (response.detail.includes('401') || response.detail.includes('Unauthorized') || response.detail.includes('No token')) {
                        setSession(null);  // will trigger redirect to /user/login
                        return;
                    }
                    throw new Error(response.detail);
                }
                setSession(response.data);
            } catch (error) {
                setSession(null);
                console.error("Failed to fetch session:", error);
                setSessionError(error as Error);
            } finally {
                setSessionLoading(false);
            }
        };
        fetchSession();
    }, []);
    // 1. Still loading — show spinner
    if (sessionLoading) {
        return <SessionLoading />;
    }
    // 2. Fetch failed — show error (don't redirect, something is wrong)
    if (sessionError) {
        return <SessionError error={sessionError} />;
    }
    // 3. Clean unauthenticated state — redirect to login
    if (!session) {
        let path = encodeURIComponent(window.location.pathname + window.location.search);
        if (window.location.pathname.startsWith('/user/login')) {
            path = '/';
        }
        return <Navigate to={`/user/login?next=${path}`} replace />;
    }
    return (
        <sessionContext.Provider value={session}>
            {children}
        </sessionContext.Provider>
    )
}
export default SessionProvider;