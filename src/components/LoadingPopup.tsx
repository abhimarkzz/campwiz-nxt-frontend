import LottieWrapper from "@/components/LottieWrapper";

interface LoadingPopupProps {
    src?: string;
    message?: string;
}

const LoadingPopup = ({ src = "/lottie/loading.lottie" }: LoadingPopupProps) => (
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
        <LottieWrapper src={src} />
    </div>
);

export default LoadingPopup;
