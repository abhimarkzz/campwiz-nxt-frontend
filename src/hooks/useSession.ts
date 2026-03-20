import { useContext } from "react";
import sessionContext from "@/contexts/SessionContext";
import type { Session } from "@/types/session";

/**
 * Returns the current session, or null if the user is not authenticated.
 * Must be used inside a SessionProvider.
 */
const useSession = (): Session | null => {
    return useContext(sessionContext);
};

export default useSession;
