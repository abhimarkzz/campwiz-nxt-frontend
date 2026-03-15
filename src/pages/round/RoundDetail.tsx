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
    Divider,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import EditIcon from "@mui/icons-material/Edit";
import { fetchAPIFromBackendSingleWithErrorHandling as fetchAPI } from "@/api";
import type { Round } from "@/types/round";
import type { Submission } from "@/types/submission";
import { getErrorMessageKey } from "@/utils/apiResponseHandler";
import ReturnButton from "@/components/ReturnButton";
import Status from "@/components/round/Status";
import type { RoundStatus } from "@/types/round/status";

interface RoundDetailResponse extends Round {
    description?: string;
    submissionCount?: number;
    submissions?: Submission[];
    updatedAt: string;
}

const RoundDetail = () => {
    const { campaignId, roundId } = useParams<{
        campaignId: string;
        roundId: string;
    }>();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [round, setRound] = useState<RoundDetailResponse | null>(null);
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
                const res = await fetchAPI<RoundDetailResponse>(
                    `/campaign/${campaignId}/round/${roundId}`
                );

                // Safe error checking: guard against null/undefined
                if (res && typeof res === 'object' && 'detail' in res) {
                    const apiError = (res as unknown as { detail: string }).detail;
                    const errorKey = getErrorMessageKey(apiError);
                    setError(t(errorKey));
                    setRound(null);
                } else if (res && typeof res === 'object') {
                    // API returns raw RoundDetail data directly
                    setRound(res as unknown as RoundDetailResponse);
                    setError(null);
                } else {
                    setError(t("error.failedToFetch"));
                    setRound(null);
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "Unknown error";
                const errorKey = getErrorMessageKey(errorMessage);
                setError(t(errorKey));
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
                    <Button 
                        variant="outlined" 
                        startIcon={<EditIcon />} 
                        disabled 
                        title="Coming in Phase 4"
                    >
                        {t("common.edit")}
                    </Button>
                </Box>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" }, gap: 2, mb: 3 }}>
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
                        <Typography color="textSecondary" gutterBottom>{t("round.created_at")}</Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            {new Date(round.createdAt).toLocaleDateString()}
                        </Typography>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <Typography color="textSecondary" gutterBottom>{t("round.submissions")}</Typography>
                        <Typography variant="h5" sx={{ mt: 1 }}>{round.submissionCount || 0}</Typography>
                    </CardContent>
                </Card>
            </Box>

            {round.description && (
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>{t("round.description")}</Typography>
                        <Divider sx={{ my: 2 }} />
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
                            <Typography color="textSecondary" gutterBottom>{t("round.created_at")}</Typography>
                            <Typography variant="body2">{new Date(round.createdAt).toLocaleDateString()}</Typography>
                        </Box>
                        <Box>
                            <Typography color="textSecondary" gutterBottom>{t("round.updated_at")}</Typography>
                            <Typography variant="body2">{new Date(round.updatedAt).toLocaleDateString()}</Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {round.submissions && round.submissions.length > 0 && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>{t("round.recent_submissions")}</Typography>
                        <Divider sx={{ my: 2 }} />
                        <Box sx={{ display: "grid", gap: 1 }}>
                            {round.submissions.slice(0, 5).map((submission: Submission) => (
                                <Card 
                                    key={submission.submissionId} 
                                    variant="outlined" 
                                    sx={{ cursor: "pointer", "&:hover": { boxShadow: 1 } }}
                                    onClick={() => navigate(`/submission/${submission.submissionId}`)}
                                >
                                    <CardContent>
                                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <Typography variant="body2">{submission.title}</Typography>
                                            <Chip size="small" label={submission.status} />
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

export default RoundDetail;
