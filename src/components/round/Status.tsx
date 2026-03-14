import { RoundStatus } from "@/types/round/status";
import Chip from "@mui/material/Chip";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DoubleTickIcon from "@mui/icons-material/DoneAll";
import NoticeIcon from "@mui/icons-material/NotificationImportant";
import StopIcon from "@mui/icons-material/Pause";
import WorkHistory from "@mui/icons-material/WorkHistory";
import CircleIcon from "@mui/icons-material/FiberManualRecord";
import { useTranslation } from "react-i18next";

// ─── Status color map ─────────────────────────────────────────────────────────

export const getStatusColor = (
    status: RoundStatus
): "success" | "error" | "info" | "warning" | "primary" => {
    switch (status) {
        case RoundStatus.COMPLETED: return "success";
        case RoundStatus.CANCELLED: return "error";
        case RoundStatus.EVALUATING: return "info";
        case RoundStatus.PAUSED:
        case RoundStatus.PENDING:   return "warning";
        case RoundStatus.ACTIVE:    return "success";
        default:                    return "primary";
    }
};

// ─── Status chip ──────────────────────────────────────────────────────────────

interface StatusProps {
    status: RoundStatus;
    /** Optional override — if omitted, uses useTranslation hook */
    t?: (key: string) => string;
}

const Status = ({ status, t: tProp }: StatusProps) => {
    const { t: tHook } = useTranslation();
    const t = tProp ?? tHook;
    const label = t(`round.status.${status}`);

    return (
        <Chip
            label={label}
            color={getStatusColor(status)}
            variant="outlined"
            sx={{ marginRight: 1, p: 1 }}
        />
    );
};

// ─── Status icon ──────────────────────────────────────────────────────────────

const iconSx = { display: "inline", ml: -2, mr: 1 };

export const RoundStatusIcon = ({ status }: { status: RoundStatus }) => {
    const color = getStatusColor(status);
    switch (status) {
        case RoundStatus.COMPLETED:  return <DoubleTickIcon color={color} sx={iconSx} />;
        case RoundStatus.CANCELLED:  return <NoticeIcon color={color} sx={iconSx} />;
        case RoundStatus.EVALUATING: return <CheckCircleIcon color={color} sx={iconSx} />;
        case RoundStatus.PAUSED:     return <StopIcon color={color} sx={iconSx} />;
        case RoundStatus.PENDING:    return <WorkHistory color={color} sx={iconSx} />;
        case RoundStatus.ACTIVE:     return <CircleIcon color={color} sx={iconSx} />;
        default:                     return <CheckCircleIcon color={color} sx={iconSx} />;
    }
};

export default Status;
