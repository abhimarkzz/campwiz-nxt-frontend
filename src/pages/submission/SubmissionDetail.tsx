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
    Chip,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import EditIcon from "@mui/icons-material/Edit";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingIcon from "@mui/icons-material/Pending";
import { fetchAPIFromBackendSingleWithErrorHandling as fetchAPI } from "@/api";
import type { Submission } from "@/types/submission";
import ReturnButton from "@/components/ReturnButton";

const SubmissionDetail = () => {
    const { submissionId } = useParams<{ submissionId: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [submission, setSubmission] = useState<Submission | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSubmissionDetail = async () => {
            if (!submissionId) {
                setError(t("submission.not_found"));
                setLoading(false);
                return;
            }

            try {
                const res = await fetchAPI<Submission>(
                    `/submission/${submissionId}`
                );

                if ("detail" in res) {
                    setError(t(res.detail));
                    setSubmission(null);
                } else {
                    setSubmission(res as unknown as Submission);
                    setError(null);
                }
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : t("submission.fetch_failed")
                );
                setSubmission(null);
            } finally {
                setLoading(false);
            }
        };

        fetchSubmissionDetail();
    }, [submissionId, t]);

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ py: 4, textAlign: "center" }}>
                <CircularProgress />
            </Container>
        );
    }

    if (error || !submission) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <ReturnButton />
                <Alert severity="error" sx={{ mt: 2 }}>
                    {error || t("submission.not_found")}
                </Alert>
            </Container>
        );
    }

    const isEvaluated = submission.status === "EVALUATED";

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ mb: 3 }}>
                <ReturnButton />
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
                    <Typography variant="h4" component="h1">{submission.title}</Typography>
                    <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/submission/${submissionId}/edit`)}>
                        {t("common.edit")}
                    </Button>
                </Box>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 2, mb: 3 }}>
                <Card>
                    <CardContent>
                        <Typography color="textSecondary" gutterBottom>{t("submission.status")}</Typography>
                        <Box sx={{ mt: 1 }}>
                            <Chip
                                icon={isEvaluated ? <CheckCircleIcon /> : <PendingIcon />}
                                label={submission.status}
                                color={isEvaluated ? "success" : "warning"}
                            />
                        </Box>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Typography color="textSecondary" gutterBottom>{t("submission.submitter")}</Typography>
                        <Typography variant="body1" sx={{ mt: 1 }}>{submission.submitterName}</Typography>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Typography color="textSecondary" gutterBottom>{t("submission.score")}</Typography>
                        <Typography variant="h5" sx={{ mt: 1 }}>{submission.score || "-"}</Typography>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Typography color="textSecondary" gutterBottom>{t("submission.round")}</Typography>
                        <Typography variant="body1" sx={{ mt: 1 }}>{submission.roundId}</Typography>
                    </CardContent>
                </Card>
            </Box>

            {submission.description && (
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>{t("submission.description")}</Typography>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="body2" color="textSecondary">{submission.description}</Typography>
                    </CardContent>
                </Card>
            )}

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>{t("submission.timeline")}</Typography>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                        <Box>
                            <Typography color="textSecondary" gutterBottom>{t("submission.created_at")}</Typography>
                            <Typography variant="body1">{new Date(submission.createdAt).toLocaleDateString()}</Typography>
                        </Box>
                        <Box>
                            <Typography color="textSecondary" gutterBottom>{t("submission.updated_at")}</Typography>
                            <Typography variant="body1">{new Date(submission.updatedAt).toLocaleDateString()}</Typography>
                        </Box>
                        {submission.evaluatedAt && (
                            <Box>
                                <Typography color="textSecondary" gutterBottom>{t("submission.evaluated_at")}</Typography>
                                <Typography variant="body1">{new Date(submission.evaluatedAt).toLocaleDateString()}</Typography>
                            </Box>
                        )}
                    </Box>
                </CardContent>
            </Card>

            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>{t("submission.actions")}</Typography>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        <Button variant="contained" onClick={() => navigate(`/round/${submission.roundId}/submission`)}>
                            {t("submission.back_to_round")}
                        </Button>
                        <Button variant="outlined" onClick={() => navigate(`/campaign/${submission.campaignId}`)}>
                            {t("submission.view_campaign")}
                        </Button>
                        <Button variant="outlined" onClick={() => navigate("/submission")}>
                            {t("submission.all_submissions")}
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Container>
    );
};

export default SubmissionDetail;
