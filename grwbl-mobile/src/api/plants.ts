import { del, get, patch, post } from "./client";

export type PlantSpecies = {
    id: string;
    commonName: string;
    scientificName: string;
    description?: string;
    defaultWateringIntervalDays?: number;
    // Backward compatible alias if the backend returns this key
    defaultwateringFrequencyDays?: number;
    imageUrl?: string;
    properties?: {
        growthRate?: "slow" | "medium" | "fast";
        nativeRegion?: string;
        isToxicToPets?: boolean;
        matureHeightCm?: number;
    };
    careInstructions?: {
        soil?: string;
        light?: string;
        notes?: string;
        humidity?: string;
        fertilizer?: string;
        temperatureC?: string;
    };
};

export type Plant = {
    id: string;
    name: string;
    // create flow may still use speciesId; list endpoint returns a nested species object
    speciesId?: string;
    species?: PlantSpecies;
    room?: string;
    location?: string;
    wateringFrequencyDays?: number;
    wateringIntervalDays?: number;
    lastWateredAt?: string | null;
    notes?: string;
}

export type PlantUpdate = {
    name?: string;
    speciesId?: string;
    room?: string;
    location?: string;
    wateringFrequencyDays?: number;
    wateringIntervalDays?: number;
    lastWateredAt?: string | null;
    notes?: string;
};

export type WaterPlantResponse = {
    plantId: string;
    wateredAt: string;
};

export type WateringHistoryEntry = {
    id: string;
    timestamp: string;
};

export const fetchPlants = async (authToken: string | null): Promise<Plant[]> => {
    if (!authToken) {
        throw new Error("No auth token provided");
    }
    const response = await get<Plant[]>("/plants", {
        headers: {
            Authorization: `Bearer ${authToken}`,
        },
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch plants: ${response.status}`);
    }
    if (!response.data) {
        throw new Error("No plant data received");
    }
    console.log(response.data);
    return response.data;
}

export const savePlant = async (plantData: Omit<Plant, "id">, authToken: string | null) => {
    if (!authToken) {
        throw new Error("No auth token provided");
    }
    const response = await post<Plant>("/plants", plantData, {
        headers: {
            Authorization: `Bearer ${authToken}`,
        },
    });
    console.log("Saved plant:", response);

    if (!response.ok || !response.data) {
        throw new Error(`Failed to save plant: ${response.status}`);
    }

    return response.data;
}

export const updatePlant = async (
    plantId: string,
    updates: PlantUpdate,
    authToken: string | null,
): Promise<Plant | null> => {
    if (!authToken) {
        throw new Error("No auth token provided");
    }

    const response = await patch<Plant>(`/plants/${plantId}`, updates, {
        headers: {
            Authorization: `Bearer ${authToken}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to update plant: ${response.status}`);
    }

    return response.data ?? null;
}

export const deletePlant = async (
    plantId: string,
    authToken: string | null,
): Promise<void> => {
    if (!authToken) {
        throw new Error("No auth token provided");
    }

    const response = await del(`/plants/${plantId}`, {
        headers: {
            Authorization: `Bearer ${authToken}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to delete plant: ${response.status}`);
    }
}

export const waterPlant = async (
    plantId: string,
    wateredAt: string,
    authToken: string | null,
): Promise<WaterPlantResponse> => {
    if (!authToken) {
        throw new Error("No auth token provided");
    }

    const response = await post<WaterPlantResponse>(`/plants/${plantId}/water`, {
        wateredAt,
    }, {
        headers: {
            Authorization: `Bearer ${authToken}`,
        },
    });

    if (!response.ok || !response.data) {
        throw new Error(`Failed to water plant: ${response.status}`);
    }

    return response.data;
}

export const fetchWateringHistory = async (
    plantId: string,
    authToken: string | null,
): Promise<WateringHistoryEntry[]> => {
    if (!authToken) {
        throw new Error("No auth token provided");
    }

    const response = await get<WateringHistoryEntry[]>(`/plants/${plantId}/watering-history`, {
        headers: {
            Authorization: `Bearer ${authToken}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch watering history: ${response.status}`);
    }

    return Array.isArray(response.data) ? response.data : [];
}
