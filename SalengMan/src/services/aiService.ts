import * as tmImage from '@teachablemachine/image';

const MODEL_URL = import.meta.env.VITE_TEACHABLE_MACHINE_URL;

export interface Prediction {
    className: string;
    probability: number;
}

const labelMap: Record<string, string> = {
    "Aluminum Can": "กระป๋องอลูมิเนียม",
    "Book": "หนังสือ",
    "Cardboad": "กระดาษแข็ง/ลัง", // Misspelled in model
    "Ceramic": "เซรามิก",
    "Plastic Bottle": "ขวดพลาสติก",
    "Glass": "เครื่องแก้ว"
};
let model: tmImage.CustomMobileNet | null = null;

/**
 * Loads the Teachable Machine model if it hasn't been loaded yet.
 */
export async function loadModel(): Promise<tmImage.CustomMobileNet> {
    if (model) return model;

    if (!MODEL_URL) {
        throw new Error('VITE_TEACHABLE_MACHINE_URL is not defined in .env');
    }

    const checkpointURL = MODEL_URL + 'model.json';
    const metadataURL = MODEL_URL + 'metadata.json';

    model = await tmImage.load(checkpointURL, metadataURL);

    return model;
}

/**
 * Predicts the class of an image.
 * @param imageSource Base64 string, HTMLImageElement, or HTMLCanvasElement
 */
export async function predict(imageSource: string | HTMLImageElement | HTMLCanvasElement): Promise<Prediction[]> {
    const loadedModel = await loadModel();

    let element: HTMLImageElement | HTMLCanvasElement;

    if (typeof imageSource === 'string') {
        element = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(err);
            img.src = imageSource;
        });
    } else {
        element = imageSource;
    }

    const prediction = await loadedModel.predict(element);
    return prediction as Prediction[];
}

/**
 * Maps predictions to the most likely category.
 * Filters by a threshold (default 0.5).
 * Returns the Thai translation if available.
 */
export function getTopPrediction(predictions: Prediction[], threshold = 0.5): string | null {
    if (!predictions || predictions.length === 0) return null;
    const top = predictions.reduce((prev, current) => (prev.probability > current.probability) ? prev : current);

    if (top.probability >= threshold) {
        // Return mapped Thai label if exists, otherwise return original className
        return labelMap[top.className] || top.className;
    }

    return null;
}
