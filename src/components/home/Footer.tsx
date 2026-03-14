import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { translationLink } from "@/i18n/settings";

const Footer = () => {
    const { t } = useTranslation();

    return (
        <footer
            style={{
                textAlign: "center",
                width: "100%",
                padding: "8px",
                marginTop: "auto",
                marginBottom: "4px",
            }}
            className="bg-gray-100 dark:bg-gray-800 dark:text-gray-200"
        >
            &copy; 2025 by{" "}
            <a
                href="https://github.com/nokibsarkar/campwiz?tab=readme-ov-file#credits"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#60a5fa" }}
            >
                {t("footer.campwizNxtTeam")}
            </a>
            &nbsp;|&nbsp;
            <a
                href="https://commons.wikimedia.org/wiki/Commons:Campwiz_NXT"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#60a5fa" }}
            >
                {t("footer.manual")}
            </a>
            &nbsp;|&nbsp;
            <Link to="/policy/terms" style={{ color: "#60a5fa" }}>
                {t("footer.terms")}
            </Link>
            &nbsp;|&nbsp;
            <Link to="/policy/privacy" style={{ color: "#60a5fa" }}>
                {t("footer.privacy")}
            </Link>
            &nbsp;|&nbsp;
            <a
                href="https://github.com/nokibsarkar/campwiz/issues/new"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#60a5fa" }}
            >
                {t("footer.reportBug")}
            </a>
            &nbsp;|&nbsp;
            <a
                href={translationLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#60a5fa" }}
            >
                {t("footer.translate")}
            </a>
        </footer>
    );
};

export default Footer;
