import useSWR from "swr";
import { useTranslation } from "react-i18next";
import { getErrorMessageKey } from "@/utils/apiResponseHandler";
import { Box, CircularProgress, Alert } from "@mui/material";
import SingleCampaignChip from "@/components/campaign/SingleCampaignChip";
import type { Campaign } from "@/types/campaign/campaign";

const PublicCampaigns = () => {
    const { t } = useTranslation();
    
    const { data: campaigns, error, isLoading } = useSWR<Campaign[]>(
        "/campaign/public",
        async (url: string) => {
            const response = await fetch(url);
            if (!response.ok) throw new Error(response.statusText);
            return response.json();
        }
    );

    if (isLoading) return <CircularProgress />;
    
    if (error) {
        const errorKey = getErrorMessageKey(error.message);
        return <Alert severity="error">{t(errorKey)}</Alert>;
    }
    
    if (!campaigns || campaigns.length === 0) {
        return <Alert severity="info">{t("campaign.no_campaigns")}</Alert>;
    }

    return (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 2 }}>
            {campaigns.map((campaign) => (
                <SingleCampaignChip key={campaign.campaignId} campaign={campaign} />
            ))}
        </Box>
    );
};

export default PublicCampaigns;
