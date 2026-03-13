export interface ResponseSingle<T> {
    data: T;
}

export interface ResponseMultiple<T> {
    data: T[];
    total: number;
}

export interface ResponseError {
    detail: string;
}

// Enum for known HTTP error codes
export const ApiErrorCode = {
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
} as const;

export type ApiErrorCode = typeof ApiErrorCode[keyof typeof ApiErrorCode];

// Generic state shape for any API call inside a hook
export interface ApiState<T> {
    data: T | null;
    isLoading: boolean;
    error: string | null;
}

// Type guard — check if a response is an error
export const isResponseError = (
    response: unknown
): response is ResponseError => {
    return (
        typeof response === "object" &&
        response !== null &&
        "detail" in response &&
        typeof (response as ResponseError).detail === "string"
    );
};