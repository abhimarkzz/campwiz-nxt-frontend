import { fetchAPIFromBackendSingleWithErrorHandling as fetchAPI } from "@/api";

interface RedirectResponse {
    redirect: string;
}

function isResponseError(res: object): res is { detail: string } {
    return typeof (res as { detail?: string }).detail === "string";
}

export async function loginInitiate(
    _base: string,
    next: string | null,
    pathName: string = "/user/login"
): Promise<void> {
    const qs = `?next=${next ?? "/"}`;
    const res = await fetchAPI<RedirectResponse>(`${pathName}${qs}`);
    if (isResponseError(res)) throw new Error(res.detail);
    const location = (res as unknown as RedirectResponse).redirect;
    if (!location) throw new Error("Redirect location missing from response");
    window.location.href = location;
}

export async function loginCallback(
    code: string,
    state: string,
    pathName: string = "/user/callback"
): Promise<void> {
    const qs = `?code=${code}&state=${state}&next=${pathName}`;
    const res = await fetchAPI<RedirectResponse>(`${pathName}${qs}`);
    if (isResponseError(res)) throw new Error(res.detail);
}

export async function logout(refresh = false): Promise<void> {
    await fetchAPI("/user/logout", { method: "POST" });
    if (refresh) {
        window.location.reload();
    } else {
        window.location.href = "/";
    }
}
