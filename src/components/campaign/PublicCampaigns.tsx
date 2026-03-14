import useSWR from "swr";
import { Skeleton } from "@mui/material";
import { useTranslation } from "react-i18next";
import { fetchAPIFromBackendSingleWithErrorHandling } from "@/api";
import type { Campaign } from "@/types/campaign/campaign";
import SingleCampaignChip from "./SingleCampaignChip";
import LoadMoreCampaignChip from "./LoadMoreCampaign";
import PerCampaignBackground from "@/assets/campaign5.svg";

interface PublicRunningCampaignsProps {
    limit: number;
}

const PublicRunningCampaigns = ({ limit }: PublicRunningCampaignsProps) => {
    const { t } = useTranslation();

    const qs = new URLSearchParams({
        limit: String(limit),
        isClosed: "false",
        isHidden: "false",
        sortOrder: "desc",
    }).toString();

    const showAllQs = new URLSearchParams({
        limit: "20",
        isClosed: "false",
        isHidden: "false",
        sortOrder: "desc",
    }).toString();

    const { data: response, error, isLoading } = useSWR(
        `/campaign/?${qs}`,
        fetchAPIFromBackendSingleWithErrorHandling<Campaign[]>
    );

    if (isLoading) {
        return (
            <Skeleton
                variant="rectangular"
                width="100%"
                height={200}
                sx={{ backgroundColor: "rgba(0,0,0,0.1)" }}
            />
        );
    }

    if (error) return <p>Error: {t(error.message)}</p>;
    if (!response) return null;
    if ("detail" in response) return <p>Error: {t(response.detail)}</p>;

    const campaigns = Array.isArray(response) 
    ? response 
    : (response as any).data;

    return campaigns.length > 0 ? (
        <div
            style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                flexWrap: "wrap",
                backgroundImage: `url(${PerCampaignBackground})`,
                backgroundSize: "contain",
                padding: "0 8px",
            }}
        >
            {campaigns.map((v: Campaign) => (
                <SingleCampaignChip campaign={v} key={v.campaignId} />
            ))}
            <LoadMoreCampaignChip
                link={`/campaign?${showAllQs}`}
                labelText={t("campaign.showAllCampaigns")}
            />
        </div>
    ) : (
        <div style={{ textAlign: "center", padding: "4px 4px 8px" }}>
            <h3 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
                {t("error.noRunningCampaigns")}
            </h3>
        </div>
    );
};

export default PublicRunningCampaigns;
