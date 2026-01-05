import { get } from "./client";

export type Species = {
    /**
     * This is what a species object looks like
    "id": "325bdffa-209d-44d8-a3e0-ec1a4adf35bf",
    "commonName": "Snake Plant",
    "scientificName": "Sansevieria trifasciata",
    "description": "Tolerates very low light and long dry spells; nearly indestructible.",
    "defaultWateringIntervalDays": 14,
    "imageUrl": "https://images.unsplash.com/photo-1503149779833-1de50ebe5f8a?q=80&w=1035&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "properties": {
      "growthRate": "slow",
      "nativeRegion": "West Africa",
      "isToxicToPets": true,
      "matureHeightCm": 90
    },
    "careInstructions": {
      "soil": "well-draining cactus mix",
      "light": "low-to-bright indirect",
      "notes": "Wipe leaves to remove dust",
      "humidity": "average household",
      "fertilizer": "half-strength, monthly spring–summer",
      "temperatureC": "18-29"
     */

    id: string;
    commonName: string;
    scientificName: string;
    description: string;
    defaultWateringIntervalDays: number;
    imageUrl: string;
    // optional user-captured fields when creating a plant
    room?: string;
    location?: string;
    wateringFrequencyDays?: number;
    lastWateredAt?: string;
    notes?: string;
    properties: {
        growthRate: "slow" | "medium" | "fast";
        nativeRegion: string;
        isToxicToPets: boolean;
        matureHeightCm: number;
    };
    careInstructions: {
        soil: string;
        light: string;
        notes: string;
        humidity: string;
        fertilizer: string;
        temperatureC: string;
    };
}

export const fetchSpeciesList = async () => {
    const response = await get<Species[]>("/species");
    console.log("Fetched species list:", response);

    if (!response.ok || !response.data) {
        throw new Error(`Failed to fetch species list: ${response.status}`);
    }

    return response.data;
}
