import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    Container,
    Box,
    Typography,
    TextField,
    Button,
    CircularProgress,
    Alert,
    Pagination,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Paper,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { fetchAPIFromBackendSingleWithErrorHandling as fetchAPI } from "@/api";
import type { Submission } from "@/types/submission";
import ReturnButton from "@/components/ReturnButton";

interface SubmissionListResponse {
    submissions: Submission[];
    total: number;
    page: number;
    pageSize: number;
}

const SubmissionList = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();

    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState(
        searchParams.get("search") || ""
    );
    const [currentPage, setCurrentPage] = useState(
        parseInt(searchParams.get("page") || "1")
    );
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        const fetchSubmissions = async () => {
            setLoading(true);
            try {
                const query = searchQuery
                    ? `?search=${encodeURIComponent(searchQuery)}&page=${currentPage}`
                    : `?page=${currentPage}`;
                const res = await fetchAPI<SubmissionListResponse>(
                    `/submission${query}`
                );

                if ("detail" in res) {
                    setError(t(res.detail));
                    setSubmissions([]);
                } else {
                    const data = res as unknown as SubmissionListResponse;
                    setSubmissions(data.submissions || []);
                    setTotalPages(Math.ceil(data.total / data.pageSize));
                    setError(null);
                }
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : t("submission.fetch_failed")
                );
                setSubmissions([]);
            } finally {
                setLoading(false);
            }
        };

        fetchSubmissions();
    }, [searchQuery, currentPage, t]);

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        setCurrentPage(1);
        setSearchParams({ search: query, page: "1" });
    };

    const handlePageChange = (
        _event: React.ChangeEvent<unknown>,
        page: number
    ) => {
        setCurrentPage(page);
        setSearchParams({ search: searchQuery, page: page.toString() });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ mb: 4 }}>
                <ReturnButton />
                <Typography variant="h4" component="h1" sx={{ mt: 2 }}>
                    {t("submission.submissions")}
                </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
                <TextField
                    fullWidth
                    placeholder={t("submission.search_placeholder")}
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    variant="outlined"
                    size="small"
                    sx={{ maxWidth: 400 }}
                />
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <Box sx={{ textAlign: "center", py: 4 }}>
                    <CircularProgress />
                </Box>
            ) : submissions.length === 0 ? (
                <Alert severity="info">
                    {t("submission.no_submissions")}
                </Alert>
            ) : (
                <>
                    <TableContainer component={Paper} sx={{ mb: 4 }}>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                                    <TableCell>{t("submission.title")}</TableCell>
                                    <TableCell>{t("submission.submitter")}</TableCell>
                                    <TableCell>{t("submission.status")}</TableCell>
                                    <TableCell align="right">
                                        {t("submission.score")}
                                    </TableCell>
                                    <TableCell align="right">
                                        {t("common.actions")}
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {submissions.map((submission) => (
                                    <TableRow key={submission.submissionId}>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {submission.title}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {submission.submitterName}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={submission.status}
                                                size="small"
                                                color={
                                                    submission.status ===
                                                    "EVALUATED"
                                                        ? "success"
                                                        : "default"
                                                }
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2">
                                                {submission.score || "-"}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Button
                                                size="small"
                                                endIcon={<OpenInNewIcon />}
                                                onClick={() =>
                                                    navigate(
                                                        `/submission/${submission.submissionId}`
                                                    )
                                                }
                                            >
                                                {t("common.view")}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {totalPages > 1 && (
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "center",
                                mt: 4,
                            }}
                        >
                            <Pagination
                                count={totalPages}
                                page={currentPage}
                                onChange={handlePageChange}
                                color="primary"
                            />
                        </Box>
                    )}
                </>
            )}
        </Container>
    );
};

export default SubmissionList;
