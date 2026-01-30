export interface Address {
    id: string;
    name: string;
    phone: string;
    details: string;
    isDefault?: boolean;
    label?: string; // "Home", "Office", etc.
}
