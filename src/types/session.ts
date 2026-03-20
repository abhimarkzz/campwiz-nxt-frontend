export interface User {
    id: string;
    username: string;
    email: string;
}

export interface Session extends User {
    /** Bitflag integer representing the user's permissions */
    permission: number;
    /** The project this user primarily belongs to */
    projectId: string;
    /** Map of named permissions to booleans, if provided by the API */
    permissionMap?: Record<string, boolean>;
}