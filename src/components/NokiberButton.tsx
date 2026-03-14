import { Link } from "react-router-dom";
import { Button, IconButton, useMediaQuery, type ButtonProps } from "@mui/material";

interface NokiberButtonProps {
    startIcon?: React.ReactNode;
    endIcon?: React.ReactNode;
    smallIcon?: React.ReactNode;
    label: string;
    onClick?: () => void;
    link?: string;
    disabled?: boolean;
    loading?: boolean;
    size?: "small" | "medium" | "large";
    variant?: "text" | "outlined" | "contained";
    color?: "primary" | "secondary" | "error" | "success" | "warning" | "info";
    sx?: ButtonProps["sx"];
    className?: string;
    alwaysBig?: boolean;
}

const NokiberButton = ({
    link,
    endIcon,
    startIcon,
    smallIcon,
    label,
    onClick,
    disabled = false,
    loading = false,
    size = "medium",
    variant = "contained",
    color = "primary",
    sx,
    className,
    alwaysBig = false,
}: NokiberButtonProps) => {
    const isSmall = useMediaQuery((theme: { breakpoints: { down: (k: string) => string } }) =>
        theme.breakpoints.down("sm")
    );

    const sharedSx: ButtonProps["sx"] = {
        ...(sx ?? {}),
        cursor: loading ? "not-allowed" : "pointer",
    };

    const bigButton = (
        <Button
            variant={variant}
            color={color}
            size={size}
            startIcon={startIcon}
            endIcon={endIcon}
            onClick={onClick}
            disabled={disabled || loading}
            sx={sharedSx}
            className={className}
        >
            {label}
        </Button>
    );

    const smallButton = (
        <IconButton
            disabled={disabled || loading}
            sx={sharedSx}
            className={className}
            color={color}
            onClick={onClick}
        >
            {smallIcon ?? startIcon ?? endIcon}
        </IconButton>
    );

    const content = alwaysBig || !isSmall ? bigButton : smallButton;

    return link ? (
        <Link to={link} style={{ textDecoration: "none" }}>
            {content}
        </Link>
    ) : content;
};

export default NokiberButton;
