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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useTranslation } from "react-i18next";
import { fetchAPIFromBackendSingleWithErrorHandling as fetchAPI } from "@/api";
import type { Campaign } from "@/types/campaign/campaign";
import SingleCampaignChip from "@/components/campaign/SingleCampaignChip";
import ReturnButton from "@/components/ReturnButton";

interface CampaignListResponse {
    campaigns: Campaign[];
    total: number;
    page: number;
    pageSize: number;
}

const CampaignList = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();

    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
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
        const fetchCampaigns = async () => {
            setLoading(true);
            try {
                const query = searchQuery ? `?search=${encodeURIComponent(searchQuery)}&page=${currentPage}` : `?page=${currentPage}`;
                const res = await fetchAPI<CampaignListResponse>(
                    `/campaign${query}`
                );

                if ("detail" in res) {
                    setError(t(res.detail));
                    setCampaigns([]);
                } else {
                    const data = res as unknown as CampaignListResponse;
                    setCampaigns(data.campaigns || []);
                    setTotalPages(Math.ceil(data.total / data.pageSize));
                    setError(null);
                }
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : t("campaign.fetch_failed")
                );
                setCampaigns([]);
            } finally {
                setLoading(false);
            }
        };

        fetchCampaigns();
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
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
                    <Typography variant="h4" component="h1">{t("campaign.campaigns")}</Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/campaign/new")}>
                        {t("campaign.create_new")}
                    </Button>
                </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
                <TextField
                    fullWidth
                    placeholder={t("campaign.search_placeholder")}
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    variant="outlined"
                    size="small"
                    sx={{ maxWidth: 400 }}
                />
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress /></Box>
            ) : campaigns.length === 0 ? (
                <Alert severity="info">{t("campaign.no_campaigns")}</Alert>
            ) : (
                <>
                    <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", mb: 4 }}>
                        {campaigns.map((campaign) => (
                            <SingleCampaignChip key={campaign.campaignId} campaign={campaign} />
                        ))}
                    </Box>

                    {totalPages > 1 && (
                        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                            <Pagination count={totalPages} page={currentPage} onChange={handlePageChange} color="primary" />
                        </Box>
                    )}
                </>
            )}
        </Container>
    );
};

export default CampaignList;
