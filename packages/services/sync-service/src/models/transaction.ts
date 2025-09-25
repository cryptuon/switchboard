/**
 * ChainSync Transaction Model
 *
 * Database model for tracking cross-chain transactions
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
  transactionId: string;
  deploymentId?: string;
  chain: string;
  transactionHash: string;
  status: 'pending' | 'confirmed' | 'failed' | 'dropped';
  blockNumber?: number;
  blockHash?: string;
  gasUsed?: number;
  gasPrice?: string;
  fee?: string;
  fromAddress?: string;
  toAddress?: string;
  value?: string;
  data?: string;
  error?: string;
  confirmations: number;
  requiredConfirmations: number;
  metadata: {
    rpcUrl?: string;
    chainId?: number;
    nonce?: number;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  deploymentId: {
    type: String,
    index: true
  },
  chain: {
    type: String,
    required: true,
    index: true
  },
  transactionHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed', 'dropped'],
    default: 'pending',
    index: true
  },
  blockNumber: { type: Number },
  blockHash: { type: String },
  gasUsed: { type: Number },
  gasPrice: { type: String },
  fee: { type: String },
  fromAddress: { type: String, index: true },
  toAddress: { type: String, index: true },
  value: { type: String },
  data: { type: String },
  error: { type: String },
  confirmations: {
    type: Number,
    default: 0
  },
  requiredConfirmations: {
    type: Number,
    default: 2
  },
  metadata: {
    rpcUrl: { type: String },
    chainId: { type: Number },
    nonce: { type: Number }
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  confirmedAt: { type: Date }
});

// Compound indexes for common queries
TransactionSchema.index({ chain: 1, status: 1 });
TransactionSchema.index({ deploymentId: 1, status: 1 });
TransactionSchema.index({ status: 1, createdAt: -1 });
TransactionSchema.index({ confirmations: 1, requiredConfirmations: 1 });

// Pre-save middleware
TransactionSchema.pre('save', function(next) {
  this.updatedAt = new Date();

  // Set confirmedAt when status changes to confirmed
  if (this.isModified('status') && this.status === 'confirmed' && !this.confirmedAt) {
    this.confirmedAt = new Date();
  }

  next();
});

// Methods
TransactionSchema.methods.updateConfirmations = function(confirmations: number, blockNumber?: number) {
  this.confirmations = confirmations;
  if (blockNumber) {
    this.blockNumber = blockNumber;
  }

  // Update status based on confirmations
  if (confirmations >= this.requiredConfirmations && this.status === 'pending') {
    this.status = 'confirmed';
    this.confirmedAt = new Date();
  }
};

TransactionSchema.methods.markAsFailed = function(error: string) {
  this.status = 'failed';
  this.error = error;
};

TransactionSchema.methods.markAsDropped = function() {
  this.status = 'dropped';
};

// Static methods
TransactionSchema.statics.findPendingTransactions = function(chain?: string) {
  const query: any = { status: 'pending' };
  if (chain) {
    query.chain = chain;
  }
  return this.find(query).sort({ createdAt: 1 });
};

TransactionSchema.statics.findByDeployment = function(deploymentId: string) {
  return this.find({ deploymentId }).sort({ createdAt: -1 });
};

TransactionSchema.statics.findByChain = function(chain: string) {
  return this.find({ chain }).sort({ createdAt: -1 });
};

TransactionSchema.statics.findUnconfirmedTransactions = function(chain?: string) {
  const query: any = {
    status: 'pending',
    $expr: { $lt: ['$confirmations', '$requiredConfirmations'] }
  };
  if (chain) {
    query.chain = chain;
  }
  return this.find(query).sort({ createdAt: 1 });
};

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);