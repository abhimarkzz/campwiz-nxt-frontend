import { Link, useNavigate } from "react-router-dom";
import Button, { type ButtonProps } from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import LeftArrowIcon from "@mui/icons-material/ArrowBackIosNew";
import { useMediaQuery } from "@mui/material";
import { useTranslation } from "react-i18next";

interface ReturnButtonProps {
    disabled?: boolean;
    sx?: ButtonProps["sx"];
    alwaysBig?: boolean;
    to?: string;
}

interface InnerButtonProps {
    onClick?: () => void;
    isSmall: boolean;
    alwaysBig: boolean;
    sx?: ButtonProps["sx"];
    disabled?: boolean;
    label: string;
}

const InnerButton = ({ onClick, isSmall, alwaysBig, sx, disabled, label }: InnerButtonProps) =>
    !isSmall || alwaysBig ? (
        <Button
            onClick={onClick}
            variant="text"
            color="primary"
            startIcon={<LeftArrowIcon />}
            sx={sx}
            disabled={disabled}
        >
            {!isSmall && label}
        </Button>
    ) : (
        <IconButton
            disabled={disabled}
            sx={{ m: 0.5, cursor: "pointer", display: "inline-block", ...(sx ?? {}), zIndex: 20 }}
            onClick={onClick}
            color="primary"
        >
            <LeftArrowIcon />
        </IconButton>
    );

const ReturnButton = ({ disabled, sx, alwaysBig = false, to }: ReturnButtonProps) => {
    const navigate = useNavigate();
    const isSmall = useMediaQuery((theme: { breakpoints: { down: (k: string) => string } }) =>
        theme.breakpoints.down("sm")
    );
    const { t } = useTranslation();

    const handleClick = () => {
        if (to) {
            navigate(to);
        } else {
            navigate(-1);
        }
    };

    return to ? (
        <Link to={to} style={{ textDecoration: "none" }}>
            <InnerButton
                isSmall={isSmall}
                alwaysBig={alwaysBig}
                sx={sx}
                disabled={disabled}
                label={t("return")}
            />
        </Link>
    ) : (
        <InnerButton
            onClick={handleClick}
            isSmall={isSmall}
            alwaysBig={alwaysBig}
            sx={sx}
            disabled={disabled}
            label={t("return")}
        />
    );
};

export default ReturnButton;
