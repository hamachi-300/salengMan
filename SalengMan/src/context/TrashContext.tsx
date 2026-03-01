import { createContext, useContext, useState, ReactNode } from "react";
import { Address } from "../config/api";

interface TrashData {
    mode: 'anytime' | 'fixtime';
    images: string[];
    bagCount: number;
    coins: number;
    remarks: string;
    address: Address | null;
}

interface TrashContextType {
    trashData: TrashData;
    setMode: (mode: 'anytime' | 'fixtime') => void;
    setImages: (images: string[]) => void;
    setBagCount: (count: number) => void;
    setCoins: (coins: number) => void;
    setRemarks: (remarks: string) => void;
    setAddress: (address: Address | null) => void;
    resetTrashData: () => void;
}

const initialTrashData: TrashData = {
    mode: 'anytime',
    images: [],
    bagCount: 1,
    coins: 1,
    remarks: "",
    address: null,
};

const TrashContext = createContext<TrashContextType | undefined>(undefined);

export function TrashProvider({ children }: { children: ReactNode }) {
    const [trashData, setTrashData] = useState<TrashData>(initialTrashData);

    const setMode = (mode: 'anytime' | 'fixtime') => {
        setTrashData((prev) => ({ ...prev, mode }));
    };

    const setImages = (images: string[]) => {
        setTrashData((prev) => ({ ...prev, images }));
    };

    const setBagCount = (count: number) => {
        setTrashData((prev) => ({ ...prev, bagCount: count }));
    };

    const setCoins = (coins: number) => {
        setTrashData((prev) => ({ ...prev, coins }));
    };

    const setRemarks = (remarks: string) => {
        setTrashData((prev) => ({ ...prev, remarks }));
    };

    const setAddress = (address: Address | null) => {
        setTrashData((prev) => ({ ...prev, address }));
    };

    const resetTrashData = () => {
        setTrashData(initialTrashData);
    };

    return (
        <TrashContext.Provider
            value={{
                trashData,
                setMode,
                setImages,
                setBagCount,
                setCoins,
                setRemarks,
                setAddress,
                resetTrashData,
            }}
        >
            {children}
        </TrashContext.Provider>
    );
}

export function useTrash() {
    const context = useContext(TrashContext);
    if (!context) {
        throw new Error("useTrash must be used within a TrashProvider");
    }
    return context;
}
