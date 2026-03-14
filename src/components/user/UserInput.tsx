import type { WikimediaUsername } from "@/types/_";
import { Autocomplete, TextField } from "@mui/material";
import { useState } from "react";
import useSWR from "swr";

interface UserInputProps {
    value: WikimediaUsername[];
    onChange: (users: WikimediaUsername[]) => void;
    label: string;
    allowList?: WikimediaUsername[];
    disabled?: boolean;
    sx?: Record<string, unknown>;
}

const WIKIMEDIA_USER_API_BASE =
    "https://commons.wikimedia.org/w/api.php?action=query&list=allusers&aulimit=10&format=json&origin=*&auprefix=";

const UserInput = ({ value, onChange, label, allowList, disabled, sx }: UserInputProps) => {
    const [inputValue, setInputValue] = useState<string>("");

    const fetcher = async (url: string): Promise<WikimediaUsername[]> => {
        if (allowList && allowList.length > 0) return allowList;
        const response = await fetch(url);
        const data = await response.json();
        return data?.query?.allusers?.map((user: { name: string }) => user.name) ?? [];
    };

    const { isLoading, data: options } = useSWR(
        inputValue === "" ? null : WIKIMEDIA_USER_API_BASE + inputValue,
        fetcher,
        { revalidateOnFocus: false, revalidateOnReconnect: false }
    );

    return (
        <Autocomplete
            multiple
            id={label}
            options={options ?? allowList ?? []}
            getOptionLabel={(option) => option}
            filterSelectedOptions
            value={value}
            disabled={disabled}
            loading={isLoading}
            onChange={(_, updatedUsers) => onChange(updatedUsers)}
            sx={{ mb: 1, ...(sx ?? {}) }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    variant="outlined"
                    label={label}
                    placeholder={label}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                />
            )}
        />
    );
};

export default UserInput;
