export interface IAddon {
    _id: string;
    addOnId: string;
    name: string;
    description: string;
    poster: string;
    category: string;
    priority: number;
    price: number;
    currentDiscount: number;
    inventory: number;
}