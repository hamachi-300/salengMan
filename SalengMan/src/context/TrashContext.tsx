import { createContext, useContext, useState, ReactNode } from "react";
import { Address } from "../config/api";

interface PickupTime {
  date: string;
  startTime: string;
  endTime: string;
}

interface TrashData {
  images: string[]; // base64 strings
  categories: string[];
  remarks: string;
  address: Address | null;
  pickupTime: PickupTime | null;
  editingPostId: number | null; // Track if editing existing post
  coins: number;
  bags: number;
}

interface TrashContextType {
  trashData: TrashData;
  setImages: (images: string[]) => void;
  setCategories: (categories: string[]) => void;
  setRemarks: (remarks: string) => void;
  setAddress: (address: Address | null) => void;
  setPickupTime: (time: PickupTime | null) => void;
  setCoins: (coins: number) => void;
  setBags: (bags: number) => void;
  setEditingPost: (postId: number, data: Omit<TrashData, 'editingPostId'>) => void;
  resetTrashData: () => void;
  discardEdit: () => void; // Only clears if in edit mode
}

const initialTrashData: TrashData = {
  images: [],
  categories: [],
  remarks: "",
  address: null,
  pickupTime: null,
  editingPostId: null,
  coins: 1,
  bags: 1,
};

const TrashContext = createContext<TrashContextType | undefined>(undefined);

export function TrashProvider({ children }: { children: ReactNode }) {
  const [trashData, setTrashData] = useState<TrashData>(initialTrashData);

  const setImages = (images: string[]) => {
    setTrashData((prev) => ({ ...prev, images }));
  };

  const setCategories = (categories: string[]) => {
    setTrashData((prev) => ({ ...prev, categories }));
  };

  const setRemarks = (remarks: string) => {
    setTrashData((prev) => ({ ...prev, remarks }));
  };

  const setAddress = (address: Address | null) => {
    setTrashData((prev) => ({ ...prev, address }));
  };

  const setPickupTime = (time: PickupTime | null) => {
    setTrashData((prev) => ({ ...prev, pickupTime: time }));
  };

  const setCoins = (coins: number) => {
    setTrashData((prev) => ({ ...prev, coins }));
  };

  const setBags = (bags: number) => {
    setTrashData((prev) => ({ ...prev, bags }));
  };

  const setEditingPost = (postId: number, data: Omit<TrashData, 'editingPostId'>) => {
    setTrashData({
      ...data,
      editingPostId: postId,
    });
  };

  const resetTrashData = () => {
    setTrashData(initialTrashData);
  };

  // Only reset if in edit mode (editingPostId !== null)
  const discardEdit = () => {
    if (trashData.editingPostId !== null) {
      setTrashData(initialTrashData);
    }
  };

  return (
    <TrashContext.Provider
      value={{
        trashData,
        setImages,
        setCategories,
        setRemarks,
        setAddress,
        setPickupTime,
        setCoins,
        setBags,
        setEditingPost,
        resetTrashData,
        discardEdit,
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
