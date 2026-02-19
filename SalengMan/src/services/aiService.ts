
// System prompt for the AI
const SYSTEM_PROMPT = `
You are an expert Recycling Assistant AI. Your core task is to identify and categorize common household waste items (PET bottles, Glass, Cardboard, Paper) from images provided by users. You must provide a confidence score for each detection and suggest the correct sorting bin for the user to maximize their selling value.
`;

export interface AnalysisResult {
    category: string;
    confidence: number;
    suggestion: string;
    bin: string;
}

// Mock implementation
export const analyzeWaste = async (_imageFile: File): Promise<AnalysisResult> => {
    // Keep SYSTEM_PROMPT for future use when API is integrated
    console.log("System Prompt available:", !!SYSTEM_PROMPT);

    return new Promise((resolve) => {

        setTimeout(() => {
            // Simulate AI analysis based on random chance for demo purposes
            // In a real app, this would be an API call sending 'imageFile'

            const mockResults = [
                {
                    category: "PET Bottle",
                    confidence: 0.98,
                    suggestion: "Remove cap and label, crush to save space.",
                    bin: "Plastic Bin (Yellow/Blue depending on location)",
                },
                {
                    category: "Glass Bottle",
                    confidence: 0.95,
                    suggestion: "Rinse with water. Do not break.",
                    bin: "Glass Bin",
                },
                {
                    category: "Cardboard Box",
                    confidence: 0.92,
                    suggestion: "Flatten the box. Keep dry.",
                    bin: "Paper/Cardboard Bin",
                },
                {
                    category: "Aluminum Can",
                    confidence: 0.96,
                    suggestion: "Crush the can.",
                    bin: "Metal/Aluminum Bin",
                }
            ];

            const randomResult = mockResults[Math.floor(Math.random() * mockResults.length)];
            resolve(randomResult);
        }, 2000); // Simulate network delay
    });
};
