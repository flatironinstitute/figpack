import { useState } from 'react';
import { FIGPACK_API_BASE_URL } from '../../config';

export const useDelete = (onSuccess: () => void) => {
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const handleDelete = async (figureUrl: string, apiKeyToUse: string) => {
        setDeleteLoading(true);
        setDeleteError(null);

        try {
            const response = await fetch(`${FIGPACK_API_BASE_URL}/api/figures/delete`, {
                method: 'POST',
                headers: {
                    'x-api-key': apiKeyToUse,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ figureUrl, apiKey: apiKeyToUse })
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    return { requiresApiKey: true };
                }
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
    };

    return {
        deleteLoading,
        deleteError,
        handleDelete
    };
};
