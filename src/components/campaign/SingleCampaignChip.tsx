import { Link } from "react-router-dom";
import {
    Button,
    Card,
    CardActions,
    CardContent,
    CardHeader,
    Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import RightArrowIcon from "@mui/icons-material/KeyboardArrowRight";
import { useTranslation } from "react-i18next";
import Status from "@/components/round/Status";
import { RoundStatus } from "@/types/round/status";
import type { Campaign } from "@/types/campaign/campaign";

interface SingleCampaignChipProps {
    campaign: Campaign;
}

const StyledCard = styled(Card)`
    ${({ theme }) => `
    cursor: pointer;
    transition: ${theme.transitions.create(["transform"], {
        duration: theme.transitions.duration.standard,
    })};
    &:hover {
        transform: scale(1.05);
    }
    `}
`;

const cardSx = {
    cursor: "pointer",
    boxShadow: 1,
    margin: 1,
    p: 2,
    display: "inline-block",
    borderRadius: 8,
    "&:hover": { boxShadow: 3 },
    width: {
        xs: "calc(95% - 4px)",
        sm: "calc(50% - 4px)",
        md: "calc(33.33% - 4px)",
        lg: "calc(30% - 4px)",
        xl: "calc(28% - 4px)",
    },
    mx: 2,
};

const DESCRIPTION_LIMIT = 100;

const SingleCampaignChip = ({ campaign }: SingleCampaignChipProps) => {
    const { t } = useTranslation();

    const description =
        (campaign.description?.length ?? 0) > DESCRIPTION_LIMIT
            ? `${campaign.description.slice(0, DESCRIPTION_LIMIT)}...`
            : campaign.description;

    const status =
        campaign.archivedAt === null ? RoundStatus.ACTIVE : RoundStatus.ARCHIVED;

    return (
        <StyledCard sx={cardSx}>
            <CardHeader
                title={
                    <Typography variant="h5" color="primary">
                        {campaign.name}
                    </Typography>
                }
                subheader={
                    <Typography variant="caption" color="textSecondary">
                        {new Date(campaign.startDate).toUTCString()} —{" "}
                        {new Date(campaign.endDate).toUTCString()}
                    </Typography>
                }
                sx={{ mb: -1 }}
            />
            <CardContent>
                <Typography variant="body1">{description}</Typography>
            </CardContent>
            <CardActions sx={{ justifyContent: "space-between" }}>
                <Status status={status} />
                <Link
                    to={`/campaign/${campaign.campaignId}`}
                    style={{ textDecoration: "none" }}
                >
                    <Button
                        color="primary"
                        endIcon={<RightArrowIcon />}
                        variant="outlined"
                        sx={{ borderRadius: 8, px: 2 }}
                    >
                        {t("campaign.goToCampaign")}
                    </Button>
                </Link>
            </CardActions>
        </StyledCard>
    );
};

export default SingleCampaignChip;
