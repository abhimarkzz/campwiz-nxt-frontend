import useSWR from "swr";
import { Box, Skeleton, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { fetchAPIFromBackendSingleWithErrorHandling } from "@/api";
import type { Campaign } from "@/types/campaign/campaign";
import SingleCampaignChip from "./SingleCampaignChip";
import LoadMoreCampaignChip from "./LoadMoreCampaign";
import PerCampaignBackground from "@/assets/campaign5.svg";

interface AssignedCampaignsProps {
    limit: number;
}

const AssignedCampaigns = ({ limit }: AssignedCampaignsProps) => {
    const { t } = useTranslation();

    const qs = new URLSearchParams({
        limit: String(limit),
        isClosed: "false",
        isHidden: "true",
        sortOrder: "desc",
    }).toString();

    const showAllQs = new URLSearchParams({
        limit: "20",
        isClosed: "false",
        isHidden: "true",
    }).toString();

    const { data: response, error, isLoading } = useSWR(
        `/campaign/?${qs}`,
        fetchAPIFromBackendSingleWithErrorHandling<Campaign[]>
    );

    if (isLoading) return <Skeleton variant="rectangular" width="100%" height={200} />;
    if (error) return <p>Error: {error.message}</p>;
    if (!response) return null;
    if ("detail" in response) return <p>Error: {response.detail}</p>;

    const campaigns = (response as unknown as Campaign[]);

    return (
        <div>
            <Typography
                variant="h4"
                color="error"
                sx={{ textAlign: "center", m: 3, backgroundClip: "text" }}
            >
                {t("home.yourCampaigns")}
            </Typography>

            <Box
                sx={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "center",
                    flexWrap: "wrap",
                    px: 2,
                    backgroundImage: `url(${PerCampaignBackground})`,
                    backgroundSize: "contain",
                }}
            >
                {campaigns.map((v, i) => (
                    <SingleCampaignChip campaign={v} key={i} />
                ))}
                <LoadMoreCampaignChip
                    link={`/campaign?${showAllQs}`}
                    labelText={t("campaign.showAllCampaigns")}
                />
            </Box>
        </div>
    );
};

export default AssignedCampaigns;
