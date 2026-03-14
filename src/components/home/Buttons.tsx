import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button, IconButton, useMediaQuery } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import { useTranslation } from "react-i18next";
import { logout as logoutService } from "@/services/session";

// ─── Shared styles ────────────────────────────────────────────────────────────

const dashboardSx = {
    bgcolor: "#006699",
    color: "#fff",
    borderRadius: 30,
    transition: "0.3s",
    m: 1,
    "&:hover": {
        bgcolor: "#00557d",
        transform: "scale(1.05)",
    },
};

const logoutSx = {
    borderRadius: 30,
    m: 1,
};

// ─── DashboardButton ──────────────────────────────────────────────────────────

interface DashboardButtonProps {
    projectId: string | null;
    canAccessOtherProject: boolean;
}

export const DhashboardButton = ({ projectId, canAccessOtherProject }: DashboardButtonProps) => {
    const { t } = useTranslation();
    const isSmall = useMediaQuery((theme: { breakpoints: { down: (k: string) => string } }) =>
        theme.breakpoints.down("sm")
    );

    const url = canAccessOtherProject ? "/project/" : `/project/${projectId}`;

    return (
        <Link to={url} style={{ textDecoration: "none" }}>
            {isSmall ? (
                <IconButton sx={dashboardSx}>
                    <DashboardIcon />
                </IconButton>
            ) : (
                <Button variant="contained" startIcon={<DashboardIcon />} sx={dashboardSx}>
                    {t("home.dashboard")}
                </Button>
            )}
        </Link>
    );
};

// ─── LogoutButton ─────────────────────────────────────────────────────────────

interface LogoutButtonProps {
    hiddenIn?: string[];
    refresh?: boolean;
}

export const LogoutButtton = ({ hiddenIn, refresh = false }: LogoutButtonProps) => {
    const { t } = useTranslation();
    const isSmall = useMediaQuery((theme: { breakpoints: { down: (k: string) => string } }) =>
        theme.breakpoints.down("sm")
    );
    const { pathname } = useLocation();
    const [loggingOut, setLoggingOut] = useState(false);

    if (hiddenIn) {
        for (const path of hiddenIn) {
            if (new RegExp(path).test(pathname)) return null;
        }
    }

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await logoutService(refresh);
        } finally {
            setLoggingOut(false);
        }
    };

    return isSmall ? (
        <IconButton
            sx={logoutSx}
            onClick={handleLogout}
            disabled={loggingOut}
            color="error"
        >
            <PowerSettingsNewIcon />
        </IconButton>
    ) : (
        <Button
            variant="contained"
            startIcon={<PowerSettingsNewIcon />}
            onClick={handleLogout}
            disabled={loggingOut}
            color="error"
            sx={logoutSx}
        >
            {t("home.logout")}
        </Button>
    );
};
