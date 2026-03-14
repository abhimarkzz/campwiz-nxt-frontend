import type { CampaignCreate } from "@/types/campaign/create";
import {
    Autocomplete,
    Checkbox,
    FormControlLabel,
    TextField,
    Typography,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "react-i18next";
import type { ActionDispatch } from "react";
import UserInput from "@/components/user/UserInput";

dayjs.extend(utc);

interface CampaignEditProps extends CampaignCreate {
    dispatch: ActionDispatch<[Partial<CampaignCreate>]>;
    loading: boolean;
    disabled?: boolean;
    disableOnPrivate?: boolean;
}

const CampaignEdit = ({
    dispatch,
    loading,
    disabled = false,
    disableOnPrivate = false,
    ...campaign
}: CampaignEditProps) => {
    const { t } = useTranslation();

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            {/* Campaign name */}
            <TextField
                label={t("campaign.name")}
                variant="outlined"
                sx={{ mb: 2, width: "100%" }}
                value={campaign.name}
                onChange={(e) => dispatch({ name: e.target.value })}
                disabled={loading || disabled}
            />

            {/* Wiki project, start date, end date */}
            <div
                style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 10,
                    flexWrap: "wrap",
                }}
            >
                <Autocomplete
                    options={["commons"]}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={t("campaign.wikiProject")}
                            variant="outlined"
                        />
                    )}
                    sx={{ width: { xs: "100%", sm: "40%" }, mb: 1 }}
                    value={campaign.language}
                    onChange={(_, value) => dispatch({ language: value as string })}
                    disabled={loading || disabled}
                />

                <DatePicker
                    label={t("campaign.startDate")}
                    value={dayjs(campaign.startDate)}
                    // startDate
                    onChange={(date: dayjs.Dayjs | null) => dispatch({ startDate: date ? date.toISOString() : "" })}
                    sx={{ width: { xs: "100%", sm: "27%" }, mb: 1 }}
                    disabled={loading || disabled}
                    timezone="UTC"
                />

                <DatePicker
                    label={t("campaign.endDate")}
                    value={dayjs(campaign.endDate)}
                    // endDate  
                    onChange={(date: dayjs.Dayjs | null) => dispatch({ endDate: date ? date.toISOString() : "" })}
                    sx={{ width: { xs: "100%", sm: "27%" }, mb: 1 }}
                    disabled={loading || disabled}
                    timezone="UTC"
                />
            </div>

            {/* Coordinators */}
            <UserInput
                value={campaign.coordinators}
                onChange={(coordinators) => dispatch({ coordinators })}
                label={t("campaign.coordinators")}
                disabled={loading || disabled}
                sx={{ mb: 2 }}
            />

            {/* Description and rules */}
            <div
                style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                }}
            >
                <TextField
                    label={t("campaign.description")}
                    variant="outlined"
                    sx={{ mb: 1, width: { xs: "100%", sm: "49%" } }}
                    value={campaign.description}
                    onChange={(e) => dispatch({ description: e.target.value })}
                    multiline
                    minRows={4}
                    disabled={loading || disabled}
                />

                <TextField
                    label={t("campaign.rules")}
                    variant="outlined"
                    sx={{ mb: 1, width: { xs: "100%", sm: "49%" } }}
                    value={campaign.rules}
                    onChange={(e) => dispatch({ rules: e.target.value })}
                    multiline
                    minRows={4}
                    disabled={loading || disabled}
                />
            </div>

            {/* Public visibility toggle */}
            <FormControlLabel
                control={
                    <Checkbox
                        checked={campaign.isPublic}
                        onChange={(e) => dispatch({ isPublic: e.target.checked })}
                        disabled={loading || disabled}
                    />
                }
                disabled={disableOnPrivate && !campaign.isPublic}
                sx={{ my: 2 }}
                label={
                    <Typography variant="body1" color="textSecondary">
                        {t("campaign.publicVisibilityDisclaimer")}
                    </Typography>
                }
            />
        </LocalizationProvider>
    );
};

export default CampaignEdit;
