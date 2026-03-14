import LoadingSVG from "@/assets/logo-animated.svg";

interface LoadingPopup2Props {
    src?: string;
    message?: string;
}

const LoadingPopup2 = ({ src = LoadingSVG }: LoadingPopup2Props) => (
    <div
        style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "transparent",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            backdropFilter: "blur(2px)",
        }}
    >
        <img src={src} alt="Loading" width={100} height={100} />
    </div>
);

export default LoadingPopup2;
