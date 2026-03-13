import { useContext, useEffect, useState } from "react";
import sessionContext from "@/contexts/SessionContext";
import { fetchAPIFromBackendSingleWithErrorHandling } from "@/api";
import type { Session } from "@/types/session";
import type { ResponseError, ResponseSingle } from "@/types/response";

type UseSessionReturn = {
    session: Session | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};

const useSession = (): UseSessionReturn => {
    const session = useContext(sessionContext);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [currentSession, setCurrentSession] = useState<Session | null>(session);

    const fetchSession = async (): Promise<void> => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetchAPIFromBackendSingleWithErrorHandling<Session>("/user/session");
            const errorResponse = response as ResponseError;
            const successResponse = response as ResponseSingle<Session>;
            if (errorResponse.detail) {
                setError(errorResponse.detail);
                setCurrentSession(null);
            } else {
                setCurrentSession(successResponse.data);
            }
        } catch (e) {
            setError("Failed to fetch session. Please try again.");
            setCurrentSession(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!session) {
            fetchSession();
        }
    }, []);

    return {
        session: currentSession,
        isLoading,
        error,
        refresh: fetchSession,
    };
};

export default useSession;