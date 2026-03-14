import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
    Container,
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Alert,
    Divider,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import EditIcon from "@mui/icons-material/Edit";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { fetchAPIFromBackendSingleWithErrorHandling as fetchAPI } from "@/api";
import type { RoundStatus } from "@/types/round/status";
import Status from "@/components/round/Status";
import ReturnButton from "@/components/ReturnButton";

interface RoundDetail {
    roundId: string;
    campaignId: string;
    name: string;
    status: string;
    createdAt: string;
    startDate: string;
    endDate: string;
    description?: string;
    submissionCount?: number;
    evaluatedCount?: number;
    totalScore?: number;
}

const RoundDetail = () => {
    const { campaignId, roundId } = useParams<{
        campaignId: string;
        roundId: string;
    }>();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [round, setRound] = useState<RoundDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRoundDetail = async () => {
            if (!campaignId || !roundId) {
                setError(t("round.not_found"));
                setLoading(false);
                return;
            }

            try {
                const res = await fetchAPI<RoundDetail>(
                    `/campaign/${campaignId}/round/${roundId}`
                );

                if ("detail" in res) {
                    setError(t(res.detail));
                    setRound(null);
                } else {
                    setRound(res as unknown as RoundDetail);
                    setError(null);
                }
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : t("round.fetch_failed")
                );
                setRound(null);
            } finally {
                setLoading(false);
            }
        };

        fetchRoundDetail();
    }, [campaignId, roundId, t]);

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ py: 4, textAlign: "center" }}>
                <CircularProgress />
            </Container>
        );
    }

    if (error || !round) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <ReturnButton />
                <Alert severity="error" sx={{ mt: 2 }}>
                    {error || t("round.not_found")}
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ mb: 3 }}>
                <ReturnButton />
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
                    <Typography variant="h4" component="h1">{round.name}</Typography>
                    <Box sx={{ display: "flex", gap: 1 }}>
                        <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/campaign/${campaignId}/round/${roundId}/edit`)}>
                            {t("common.edit")}
                        </Button>
                        <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={() => navigate(`/round/${roundId}/submission/evaluate`)}>
                            {t("round.evaluate")}
                        </Button>
                    </Box>
                </Box>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 2, mb: 3 }}>
                <Card>
                    <CardContent>
                        <Typography color="textSecondary" gutterBottom>{t("round.status")}</Typography>
                        <Box sx={{ mt: 1 }}>
                            <Status status={round.status as RoundStatus} />
                        </Box>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Typography color="textSecondary" gutterBottom>{t("round.submissions")}</Typography>
                        <Typography variant="h5" sx={{ mt: 1 }}>{round.submissionCount || 0}</Typography>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Typography color="textSecondary" gutterBottom>{t("round.evaluated")}</Typography>
                        <Typography variant="h5" sx={{ mt: 1 }}>{round.evaluatedCount || 0}</Typography>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Typography color="textSecondary" gutterBottom>{t("round.total_score")}</Typography>
                        <Typography variant="h5" sx={{ mt: 1 }}>{round.totalScore || 0}</Typography>
                    </CardContent>
                </Card>
            </Box>

            {round.description && (
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>{t("round.description")}</Typography>
                        <Typography variant="body2" color="textSecondary">{round.description}</Typography>
                    </CardContent>
                </Card>
            )}

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>{t("round.timeline")}</Typography>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                        <Box>
                            <Typography color="textSecondary" gutterBottom>{t("round.start_date")}</Typography>
                            <Typography variant="body1">{new Date(round.startDate).toLocaleDateString()}</Typography>
                        </Box>
                        <Box>
                            <Typography color="textSecondary" gutterBottom>{t("round.end_date")}</Typography>
                            <Typography variant="body1">{new Date(round.endDate).toLocaleDateString()}</Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>{t("round.actions")}</Typography>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        <Button variant="contained" onClick={() => navigate(`/round/${roundId}/submission`)}>
                            {t("round.view_submissions")}
                        </Button>
                        <Button variant="outlined" onClick={() => navigate(`/round/${roundId}/submission/evaluated`)}>
                            {t("round.view_evaluated")}
                        </Button>
                        <Button variant="outlined" onClick={() => navigate(`/campaign/${campaignId}`)}>
                            {t("round.back_to_campaign")}
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Container>
    );
};

export default RoundDetail;
