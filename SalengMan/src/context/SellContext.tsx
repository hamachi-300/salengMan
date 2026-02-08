import { createContext, useContext, useState, ReactNode } from "react";
import { Address } from "../config/api";

interface PickupTime {
  date: string;
  startTime: string;
  endTime: string;
}

interface SellData {
  images: string[]; // base64 strings
  categories: string[];
  remarks: string;
  address: Address | null;
  pickupTime: PickupTime | null;
  editingPostId: number | null; // Track if editing existing post
}

interface SellContextType {
  sellData: SellData;
  setImages: (images: string[]) => void;
  setCategories: (categories: string[]) => void;
  setRemarks: (remarks: string) => void;
  setAddress: (address: Address | null) => void;
  setPickupTime: (time: PickupTime | null) => void;
  setEditingPost: (postId: number, data: Omit<SellData, 'editingPostId'>) => void;
  resetSellData: () => void;
}

const initialSellData: SellData = {
  images: [],
  categories: [],
  remarks: "",
  address: null,
  pickupTime: null,
  editingPostId: null,
};

const SellContext = createContext<SellContextType | undefined>(undefined);

export function SellProvider({ children }: { children: ReactNode }) {
  const [sellData, setSellData] = useState<SellData>(initialSellData);

  const setImages = (images: string[]) => {
    setSellData((prev) => ({ ...prev, images }));
  };

  const setCategories = (categories: string[]) => {
    setSellData((prev) => ({ ...prev, categories }));
  };

  const setRemarks = (remarks: string) => {
    setSellData((prev) => ({ ...prev, remarks }));
  };

  const setAddress = (address: Address | null) => {
    setSellData((prev) => ({ ...prev, address }));
  };

  const setPickupTime = (time: PickupTime | null) => {
    setSellData((prev) => ({ ...prev, pickupTime: time }));
  };

  const setEditingPost = (postId: number, data: Omit<SellData, 'editingPostId'>) => {
    setSellData({
      ...data,
      editingPostId: postId,
    });
  };

  const resetSellData = () => {
    setSellData(initialSellData);
  };

  return (
    <SellContext.Provider
      value={{
        sellData,
        setImages,
        setCategories,
        setRemarks,
        setAddress,
        setPickupTime,
        setEditingPost,
        resetSellData,
      }}
    >
      {children}
    </SellContext.Provider>
  );
}

export function useSell() {
  const context = useContext(SellContext);
  if (!context) {
    throw new Error("useSell must be used within a SellProvider");
  }
  return context;
}
