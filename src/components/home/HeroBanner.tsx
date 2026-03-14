import { Button, Typography } from "@mui/material";
import ContactSupportIcon from "@mui/icons-material/ContactSupport";
import { useTranslation } from "react-i18next";
import type { Session } from "@/types/user/session";
import LoginButton from "./LoginButton";
import { LogoutButtton, DhashboardButton } from "./Buttons";

// ─── Documentation button ─────────────────────────────────────────────────────

const docButtonSx = {
    borderColor: "#006699",
    color: "#006699",
    borderRadius: 30,
    m: 1,
    transition: "0.3s",
    "&:hover": {
        bgcolor: "#006699",
        color: "#fff",
        transform: "scale(1.05)",
    },
};

export const DocumentationButton = () => {
    const { t } = useTranslation();

    return (
        <a
            href="https://commons.wikimedia.org/wiki/Commons:Campwiz_NXT"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none" }}
        >
            <Button variant="outlined" startIcon={<ContactSupportIcon />} sx={docButtonSx}>
                {t("home.doc")}
            </Button>
        </a>
    );
};

// ─── HeroBanner ───────────────────────────────────────────────────────────────

interface HeroBannerProps {
    session: Session | null;
}

const HeroBanner = ({ session }: HeroBannerProps) => {
    const { t } = useTranslation();

    const canAccessOtherProject =
        session !== null &&
        (session.permission & session.permissionMap.PermissionOtherProjectAccess) ===
            session.permissionMap.PermissionOtherProjectAccess;

    const accessibleProjectId = session?.projectId ?? null;
    const showProjectDashboardLink =
        session !== null && (canAccessOtherProject || accessibleProjectId !== null);
    const showLoginButton = session === null;
    const showLogout = session !== null;

    return (
        <div style={{ textAlign: "center", paddingBottom: 16, marginBottom: 16 }}>
            <Typography
                variant="h4"
                fontWeight="bold"
                sx={{ fontFamily: "Lora, serif", m: 1, color: "primary.main" }}
            >
                {t("home.welcome", { name: session?.username ?? "" })}
            </Typography>

            <Typography
                variant="subtitle1"
                color="gray"
                sx={{ fontFamily: "Lora, serif" }}
            >
                {t("home.subtitle")}
            </Typography>

            <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
                {showLoginButton && <LoginButton />}
                {showLogout && <LogoutButtton refresh />}
                {showProjectDashboardLink && (
                    <DhashboardButton
                        projectId={accessibleProjectId}
                        canAccessOtherProject={canAccessOtherProject}
                    />
                )}
                <DocumentationButton />
            </div>
        </div>
    );
};

export default HeroBanner;
