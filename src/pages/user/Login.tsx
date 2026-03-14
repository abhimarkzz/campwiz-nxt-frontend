import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
    Button,
    CircularProgress,
    Paper,
    Typography,
    useMediaQuery,
} from "@mui/material";
import ArrowForward from "@mui/icons-material/ArrowForward";
import { Trans, useTranslation } from "react-i18next";
import LottieWrapper from "@/components/LottieWrapper";
import WikipediaIcon from "@/components/WikipediaIcon";
import { loginInitiate } from "@/services/session";
import { translationLink } from "@/i18n/settings";
import LoginBackground from "@/assets/login5.gif";

// ─── Login form panel ─────────────────────────────────────────────────────────

interface LoginComponentProps {
    isMobile: boolean;
}

const LoginComponent = ({ isMobile }: LoginComponentProps) => {
    const [searchParams] = useSearchParams();
    const next = searchParams.get("next");
    const pathName = searchParams.get("pathName") ?? "/user/login";

    const [clicked, setClicked] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const { t } = useTranslation();

    const handleLogin = () => {
        setError(null);
        setClicked(true);
        loginInitiate(window.location.origin, next, pathName).catch((e: Error) => {
            setError(e);
            setClicked(false);
        });
    };

    return (
        <Paper
            sx={{
                padding: 2,
                ml: "auto",
                mr: 0,
                textAlign: "center",
                height: "100%",
                position: "fixed",
                right: 0,
                backgroundColor: (theme) => {
                    const isDark = theme.palette.mode === "dark";
                    if (isMobile) return isDark ? "rgba(0,0,0,0.95)" : "rgba(255,255,255,0.95)";
                    return isDark ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.9)";
                },
                width: { xs: "100%", sm: "70%", md: "50%", lg: "40%", xl: "40%" },
            }}
        >
            <img src="/logo.svg" alt="Logo" width={100} height={100} style={{ margin: "auto", display: "block" }} />
            <LottieWrapper src="/lottie/login-required.lottie" loop />

            <Typography variant="h5" sx={{ mb: 2 }}>
                {t("login.title")}
            </Typography>

            {error && (
                <Typography variant="body1" color="error" sx={{ mb: 1 }}>
                    {t(error.message)}
                </Typography>
            )}

            <Typography variant="body1" sx={{ mb: 2 }}>
                <Trans
                    i18nKey="settings.helpTranslation"
                    t={t}
                    components={[
                        <a
                            key="1"
                            href={translationLink}
                            style={{ textDecoration: "none", color: "blue" }}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {t("setting.translatewiki")}
                        </a>,
                    ]}
                />
            </Typography>

            <Button
                onClick={handleLogin}
                variant="contained"
                color="primary"
                sx={{ mt: 2, borderRadius: 10, p: 1, px: 2, mb: 3 }}
                disabled={clicked}
                startIcon={<WikipediaIcon />}
                endIcon={!clicked ? <ArrowForward /> : undefined}
            >
                {t("login.loginWithWikimedia")}
                {clicked && <CircularProgress size={24} sx={{ ml: 1 }} />}
            </Button>

            <Typography variant="body1" sx={{ mt: 2 }}>
                <Trans
                    i18nKey="login.loginDisclaimer"
                    t={t}
                    components={[
                        <Link key="terms" to="/policy/terms" style={{ color: "blue" }}>
                            Terms of Service
                        </Link>,
                        <Link key="privacy" to="/policy/privacy" style={{ color: "blue" }}>
                            Privacy Policy
                        </Link>,
                    ]}
                />
            </Typography>

            {next && (
                <>
                    <Typography variant="body2" sx={{ mt: 2 }}>
                        {t("login.afterLoginRedirect")}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 2 }}>
                        {next}
                    </Typography>
                </>
            )}
        </Paper>
    );
};

// ─── Login page ───────────────────────────────────────────────────────────────

const LoginPage = () => {
    const isMobile = useMediaQuery((theme: { breakpoints: { down: (k: string) => string } }) =>
        theme.breakpoints.down("sm")
    );

    return (
        <Paper
            sx={{
                backgroundImage: `url(${LoginBackground})`,
                backgroundSize: { xs: "100% auto", sm: "60% auto" },
                backgroundRepeat: "no-repeat",
                backgroundPositionY: "center",
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: "100%",
                height: "100%",
                p: 0,
                m: 0,
                border: 0,
            }}
        >
            <LoginComponent isMobile={isMobile} />
        </Paper>
    );
};

export default LoginPage;
