import { Link } from "react-router-dom";
import Button from "@mui/material/Button";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { useTranslation } from "react-i18next";

const buttonSx = {
    bgcolor: "#006699",
    color: "#fff",
    borderRadius: 30,
    m: 1,
    px: 2,
    transition: "0.3s",
    "&:hover": {
        bgcolor: "#00557d",
        transform: "scale(1.05)",
    },
};

const LoginButton = () => {
    const { t } = useTranslation();

    return (
        <Link to="/user/login" style={{ textDecoration: "none" }}>
            <Button variant="contained" startIcon={<LockOpenIcon />} sx={buttonSx}>
                {t("home.login")}
            </Button>
        </Link>
    );
};

export default LoginButton;
