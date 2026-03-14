import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
    Container,
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Alert,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import EditIcon from "@mui/icons-material/Edit";
import { fetchAPIFromBackendSingleWithErrorHandling as fetchAPI } from "@/api";
import type { Campaign } from "@/types/campaign/campaign";
import Status from "@/components/round/Status";
import ReturnButton from "@/components/ReturnButton";
import type { RoundStatus } from "@/types/round/status";

const CampaignDetail = () => {
    const { campaignId } = useParams<{ campaignId: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCampaignDetail = async () => {
            if (!campaignId) {
                setError(t("campaign.not_found"));
                setLoading(false);
                return;
            }

            try {
                const res = await fetchAPI<Campaign>(`/campaign/${campaignId}`);
                if ("detail" in res) {
                    setError(t(res.detail));
                    setCampaign(null);
                } else {
                    setCampaign(res as unknown as Campaign);
                    setError(null);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : t("campaign.fetch_failed"));
                setCampaign(null);
            } finally {
                setLoading(false);
            }
        };
        fetchCampaignDetail();
    }, [campaignId, t]);

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ py: 4, textAlign: "center" }}>
                <CircularProgress />
            </Container>
        );
    }

    if (error || !campaign) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <ReturnButton />
                <Alert severity="error" sx={{ mt: 2 }}>
                    {error || t("campaign.not_found")}
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ mb: 3 }}>
                <ReturnButton />
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
                    <Typography variant="h4" component="h1">{campaign.name}</Typography>
                    <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/campaign/${campaignId}/edit`)}>
                        {t("common.edit")}
                    </Button>
                </Box>
            </Box>

            {campaign.image && (
                <Box component="img" src={campaign.image} alt={campaign.name} sx={{ width: "100%", maxHeight: 400, objectFit: "cover", borderRadius: 1, mb: 3 }} />
            )}

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 2, mb: 3 }}>
                <Card>
                    <CardContent>
                        <Typography color="textSecondary" gutterBottom>{t("campaign.status")}</Typography>
                        <Box sx={{ mt: 1 }}>
                            <Status status={campaign.status as RoundStatus} />
                        </Box>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <Typography color="textSecondary" gutterBottom>{t("campaign.type")}</Typography>
                        <Chip label={campaign.campaignType} size="small" sx={{ mt: 1 }} />
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <Typography color="textSecondary" gutterBottom>{t("campaign.start_date")}</Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>{new Date(campaign.startDate).toLocaleDateString()}</Typography>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <Typography color="textSecondary" gutterBottom>{t("campaign.end_date")}</Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>{new Date(campaign.endDate).toLocaleDateString()}</Typography>
                    </CardContent>
                </Card>
            </Box>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>{t("campaign.description")}</Typography>
                    <Typography variant="body2" color="textSecondary">{campaign.description}</Typography>
                </CardContent>
            </Card>

            {campaign.rules && (
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>{t("campaign.rules")}</Typography>
                        <Typography variant="body2" color="textSecondary" dangerouslySetInnerHTML={{ __html: campaign.rules }} />
                    </CardContent>
                </Card>
            )}

            {campaign.coordinators && campaign.coordinators.length > 0 && (
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>{t("campaign.coordinators")}</Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                            {campaign.coordinators.map((coordinator) => (
                                <Chip key={coordinator} label={coordinator} variant="outlined" />
                            ))}
                        </Box>
                    </CardContent>
                </Card>
            )}

            {campaign.rounds && campaign.rounds.length > 0 && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>{t("campaign.rounds")}</Typography>
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mt: 2 }}>
                            {campaign.rounds.map((round) => (
                                <Card key={round.roundId} variant="outlined" sx={{ cursor: "pointer", "&:hover": { boxShadow: 2 } }} onClick={() => navigate(`/campaign/${campaignId}/round/${round.roundId}`)}>
                                    <CardContent>
                                        <Typography variant="subtitle1" gutterBottom>{round.name}</Typography>
                                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <Status status={round.status as RoundStatus} />
                                        </Box>
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>
                    </CardContent>
                </Card>
            )}
        </Container>
    );
};

export default CampaignDetail;
