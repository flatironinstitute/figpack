import { useCallback, useState } from 'react';
import { FIGPACK_API_BASE_URL } from '../../config';

export const useDelete = (figureUrl: string, apiKey: string | null, onSuccess: () => void) => {
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const handleDelete = useCallback(async () => {
        if (!apiKey) {
            throw new Error("API key is required to delete a figure");
        }
        setDeleteLoading(true);
        setDeleteError(null);

        try {
            const response = await fetch(`${FIGPACK_API_BASE_URL}/api/figures/delete`, {
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ figureUrl, apiKey })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete figure');
            }

            onSuccess();
            return { success: true };
        } catch (error) {
            setDeleteError(error instanceof Error ? error.message : 'Failed to delete figure');
            return { success: false };
        } finally {
            setDeleteLoading(false);
        }
    }, [figureUrl, apiKey, onSuccess]);

    return {
        deleteLoading,
        deleteError,
        handleDelete: apiKey ? handleDelete : null,
    };
};
