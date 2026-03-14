import { Link } from "react-router-dom";
import LogoSvg from "@/assets/logo.svg";
import ReturnButton from "@/components/ReturnButton";
import SettingButton from "@/components/user/SettingButton";
import { LogoutButtton } from "@/components/home/Buttons";

interface HeaderProps {
    returnTo?: string;
}

const HIDDEN_IN = ["^/$", "^/user/login$"];

const Header = ({ returnTo }: HeaderProps) => (
    <header
        style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            padding: "0 16px",
        }}
    >
        <ReturnButton to={returnTo} />

        <Link to="/" style={{ margin: "auto", display: "inline-block" }}>
            <img
                src={LogoSvg}
                alt="Logo of CampWiz"
                height={75}
                style={{ margin: "auto", display: "block" }}
            />
        </Link>

        <SettingButton />
        <LogoutButtton hiddenIn={HIDDEN_IN} />
    </header>
);

export default Header;
