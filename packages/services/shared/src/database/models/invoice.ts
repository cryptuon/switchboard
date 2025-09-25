/**
 * Invoice records
 */

export interface Invoice {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'draft' | 'issued' | 'paid' | 'overdue';
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  paidAt?: Date;
}