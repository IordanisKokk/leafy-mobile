import { post } from "./client";

export type Plant = {
    id: string;
    speciesId: string;
    room?: string;
    location?: string;
    wateringFrequencyDays?: number;
    lastWateredAt?: string;
    notes?: string;
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