import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useSWR from "swr";

import {
  Box,
  MenuItem,
  Paper,
  TextField,
  CircularProgress,
  Alert,
  Pagination,
} from "@mui/material";

import SingleCampaignChip from "@/components/campaign/SingleCampaignChip";
import type { Campaign } from "@/types/campaign/campaign";
import { fetchAPIFromBackendSingleWithErrorHandling } from "@/api";



// small helper to build query
const buildQueryString = (
  isClosed: boolean | undefined,
  isHidden: boolean | undefined,
  limit: number,
  sortOrder: string,
  page: number
) => {
  const params = new URLSearchParams();

  if (limit !== 0) params.set("limit", String(limit));
  if (isClosed !== undefined) params.set("isClosed", String(isClosed));
  if (isHidden !== undefined) params.set("isHidden", String(isHidden));
  if (sortOrder) params.set("sortOrder", sortOrder);

  params.set("offset", String((page - 1) * limit));

  return params.toString();
};

interface CampaignListResponse {
  data: Campaign[];
  total: number;
}

const CampaignList = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const [isClosed, setIsClosed] = useState<boolean | undefined>(
    searchParams.get("isClosed") === null
      ? undefined
      : searchParams.get("isClosed") === "true"
  );

  const [isHidden, setIsHidden] = useState<boolean | undefined>(
    searchParams.get("isHidden") === null
      ? undefined
      : searchParams.get("isHidden") === "true"
  );

  const [sortOrder, setSortOrder] = useState(
    searchParams.get("sortOrder") || "desc"
  );

  const [limit, setLimit] = useState(
    searchParams.get("limit")
      ? parseInt(searchParams.get("limit") || "20")
      : 20
  );

  const [page, setPage] = useState(1);

  const qs = buildQueryString(isClosed, isHidden, limit, sortOrder, page);

  const { data, error, isLoading } = useSWR<CampaignListResponse>(
    `/campaign/?${qs}`,
    async (url: string) => {
      const res =
        await fetchAPIFromBackendSingleWithErrorHandling<CampaignListResponse>(url);

      if ("detail" in res) throw new Error(res.detail);

      return res.data;
    }
  );

  const campaigns = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <Paper sx={{ my: 1, p: 2 }} elevation={0}>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
        <TextField
          label={t("limit")}
          value={limit}
          onChange={(e) => {
            setLimit(parseInt(e.target.value));
            setPage(1);
          }}
          select
          size="small"
        >
          {[10, 20, 50, 100].map((v) => (
            <MenuItem key={v} value={v}>
              {v}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Sort Order"
          value={sortOrder}
          onChange={(e) => {
            setSortOrder(e.target.value);
            setPage(1);
          }}
          select
          size="small"
        >
          <MenuItem value="asc">Ascending</MenuItem>
          <MenuItem value="desc">Descending</MenuItem>
        </TextField>

        <TextField
          label="Status"
          value={
            isClosed === undefined ? "All" : isClosed ? "closed" : "open"
          }
          onChange={(e) => {
            const val = e.target.value;
            setIsClosed(val === "All" ? undefined : val === "closed");
            setPage(1);
          }}
          select
          size="small"
        >
          <MenuItem value="All">All</MenuItem>
          <MenuItem value="open">Active</MenuItem>
          <MenuItem value="closed">Archived</MenuItem>
        </TextField>

        <TextField
          label="Visibility"
          value={
            isHidden === undefined ? "All" : isHidden ? "private" : "public"
          }
          onChange={(e) => {
            const val = e.target.value;
            setIsHidden(val === "All" ? undefined : val === "private");
            setPage(1);
          }}
          select
          size="small"
        >
          <MenuItem value="All">All</MenuItem>
          <MenuItem value="private">Private</MenuItem>
          <MenuItem value="public">Public</MenuItem>
        </TextField>
      </Box>

      {isLoading && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error">{t("error.failedToFetch")}</Alert>
      )}

      {!isLoading && !error && campaigns.length === 0 && (
        <Alert severity="info">
          {t("error.noRunningCampaigns")}
        </Alert>
      )}

      {!isLoading &&
        campaigns.map((c) => (
          <SingleCampaignChip key={c.campaignId} campaign={c} />
        ))}

      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, v) => setPage(v)}
          />
        </Box>
      )}
    </Paper>
  );
};

export default CampaignList;