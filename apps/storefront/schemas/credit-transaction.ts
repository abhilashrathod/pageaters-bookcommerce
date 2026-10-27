export interface ICreditTransaction  {
    amount: number;
    creditId: string;
    action: string;
    expired: boolean;
    expiredAt: string;
    _id: string;
    orderId: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
}