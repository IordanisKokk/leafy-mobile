import { get, post } from "./client";

export type PlantSpecies = {
    id: string;
    commonName: string;
    scientificName: string;
    description?: string;
    defaultWateringIntervalDays?: number;
    imageUrl?: string;
};

export type Plant = {
    id: string;
    name: string;
    // create flow may still use speciesId; list endpoint returns a nested species object
    speciesId?: string;
    species?: PlantSpecies;
    room?: string;
    location?: string;
    // list endpoint uses wateringIntervalDays; keep wateringFrequencyDays for backwards-compat
    wateringIntervalDays?: number;
    wateringFrequencyDays?: number;
    lastWateredAt?: string | null;
    notes?: string;
}

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