import { Card, CardActions, CardContent, CardHeader, Chip, Button, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { Link } from "react-router-dom";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import type { Campaign } from "@/types/campaign/campaign";
import { useTranslation } from "react-i18next";

interface SingleCampaignChipProps {
  campaign: Campaign;
}

const StyledCard = styled(Card)(({ theme }) => ({
  cursor: "pointer",
  transition: theme.transitions.create(["transform"], {
    duration: theme.transitions.duration.standard,
  }),
  "&:hover": {
    transform: "scale(1.03)",
  },
}));

const SingleCampaignChip = ({ campaign }: SingleCampaignChipProps) => {
  const { t } = useTranslation();

  return (
    <StyledCard
      sx={{
        boxShadow: 1,
        my: 1,
        borderRadius: 2,
        "&:hover": { boxShadow: 3 },
      }}
    >
      <CardHeader
        title={
          <Typography variant="h6" fontWeight="bold">
            {campaign.name}
          </Typography>
        }
        subheader={
          <>
            <Chip
              label={campaign.isClosed ? t("campaign.archived") : t("campaign.active")}
              color={campaign.isClosed ? "default" : "success"}
              size="small"
              sx={{ mr: 1 }}
            />
            {campaign.isHidden && (
              <Chip label={t("campaign.private")} size="small" />
            )}
          </>
        }
      />
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {new Date(campaign.startDate).toLocaleDateString()} —{" "}
          {new Date(campaign.endDate).toLocaleDateString()}
        </Typography>
      </CardContent>
      <CardActions>
        <Link to={`/campaign/${campaign.campaignId}`}>
          <Button variant="outlined" endIcon={<ArrowForwardIcon />} sx={{ borderRadius: 2 }}>
            {t("campaign.goToCampaign")}
          </Button>
        </Link>
      </CardActions>
    </StyledCard>
  );
};

export default SingleCampaignChip;
