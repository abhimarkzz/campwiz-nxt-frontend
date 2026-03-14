import { useState } from "react";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    TextField,
    Typography,
} from "@mui/material";
import { Trans, useTranslation } from "react-i18next";
import Cookies from "js-cookie";
import { cookieName, languages, translationLink } from "@/i18n/settings";
import ThemeSwitcherButton from "@/components/home/ThemeSwitcherButton";

interface SettingsPageProps {
    onClose: () => void;
}

const SettingsPage = ({ onClose }: SettingsPageProps) => {
    const { t, i18n } = useTranslation();
    const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);
    const [refreshNeeded, setRefreshNeeded] = useState(false);

    const handleClose = () => {
        onClose();
        if (refreshNeeded) {
            window.location.reload();
        }
    };

    const handleLanguageChange = (lang: string) => {
        i18n.changeLanguage(lang, () => {
            Cookies.set(cookieName, lang, { path: "/" });
        });
        setSelectedLanguage(lang);
        setRefreshNeeded(true);
    };

    return (
        <Dialog open onClose={handleClose} fullWidth maxWidth="sm">
            <DialogTitle>{t("settings.title")}</DialogTitle>

            <DialogContent>
                <TextField
                    select
                    label={t("settings.language")}
                    fullWidth
                    variant="outlined"
                    sx={{ my: 1 }}
                    value={selectedLanguage}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    helperText={
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
                                    {translationLink}
                                </a>,
                            ]}
                        />
                    }
                >
                    {languages.map((lang) => (
                        <MenuItem key={lang} value={lang}>
                            {t(`languages.${lang}`)}
                        </MenuItem>
                    ))}
                </TextField>

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-around",
                    }}
                >
                    <Typography variant="body1">{t("settings.theme")}</Typography>
                    <ThemeSwitcherButton />
                </div>
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose} color="primary" variant="outlined">
                    {t("close")}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default SettingsPage;
