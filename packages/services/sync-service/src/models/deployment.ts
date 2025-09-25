/**
 * ChainSync Deployment Model
 *
 * Database model for tracking cross-chain deployments
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IDeploymentChain {
  name: string;
  status: 'pending' | 'deploying' | 'completed' | 'failed';
  transactionHash?: string;
  contractAddress?: string;
  blockNumber?: number;
  gasUsed?: number;
  error?: string;
  deployedAt?: Date;
}

export interface IDeployment extends Document {
  deploymentId: string;
  contractCode: string;
  chains: IDeploymentChain[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'partial';
  initiatedBy: string;
  config: {
    gasLimit?: number;
    gasPrice?: string;
    constructorArgs?: any[];
    [key: string]: any;
  };
  metadata: {
    totalChains: number;
    completedChains: number;
    failedChains: number;
    estimatedCompletionTime?: Date;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

const DeploymentChainSchema = new Schema<IDeploymentChain>({
  name: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'deploying', 'completed', 'failed'],
    default: 'pending'
  },
  transactionHash: { type: String },
  contractAddress: { type: String },
  blockNumber: { type: Number },
  gasUsed: { type: Number },
  error: { type: String },
  deployedAt: { type: Date }
}, { _id: false });

const DeploymentSchema = new Schema<IDeployment>({
  deploymentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  contractCode: {
    type: String,
    required: true
  },
  chains: [DeploymentChainSchema],
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed', 'partial'],
    default: 'pending',
    index: true
  },
  initiatedBy: {
    type: String,
    required: true,
    index: true
  },
  config: {
    gasLimit: { type: Number },
    gasPrice: { type: String },
    constructorArgs: [Schema.Types.Mixed]
  },
  metadata: {
    totalChains: { type: Number, required: true },
    completedChains: { type: Number, default: 0 },
    failedChains: { type: Number, default: 0 },
    estimatedCompletionTime: { type: Date }
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
  completedAt: { type: Date }
});

// Indexes for queries
DeploymentSchema.index({ status: 1, createdAt: -1 });
DeploymentSchema.index({ initiatedBy: 1, createdAt: -1 });
DeploymentSchema.index({ 'chains.name': 1, 'chains.status': 1 });

// Pre-save middleware to update timestamps
DeploymentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Methods
DeploymentSchema.methods.updateChainStatus = function(
  chainName: string,
  status: IDeploymentChain['status'],
  data: Partial<IDeploymentChain> = {}
) {
  const chain = this.chains.find((c: IDeploymentChain) => c.name === chainName);
  if (chain) {
    chain.status = status;
    Object.assign(chain, data);

    if (status === 'completed') {
      chain.deployedAt = new Date();
      this.metadata.completedChains = this.chains.filter((c: IDeploymentChain) => c.status === 'completed').length;
    } else if (status === 'failed') {
      this.metadata.failedChains = this.chains.filter((c: IDeploymentChain) => c.status === 'failed').length;
    }

    // Update overall status
    this.updateOverallStatus();
  }
};

DeploymentSchema.methods.updateOverallStatus = function() {
  const totalChains = this.chains.length;
  const completedChains = this.chains.filter((c: IDeploymentChain) => c.status === 'completed').length;
  const failedChains = this.chains.filter((c: IDeploymentChain) => c.status === 'failed').length;
  const inProgressChains = this.chains.filter((c: IDeploymentChain) =>
    c.status === 'deploying' || c.status === 'pending').length;

  if (completedChains === totalChains) {
    this.status = 'completed';
    this.completedAt = new Date();
  } else if (failedChains === totalChains) {
    this.status = 'failed';
    this.completedAt = new Date();
  } else if (completedChains > 0 && inProgressChains === 0) {
    this.status = 'partial';
    this.completedAt = new Date();
  } else if (inProgressChains > 0) {
    this.status = 'in_progress';
  }

  this.metadata.completedChains = completedChains;
  this.metadata.failedChains = failedChains;
};

// Static methods
DeploymentSchema.statics.findByStatus = function(status: string) {
  return this.find({ status }).sort({ createdAt: -1 });
};

DeploymentSchema.statics.findByInitiator = function(initiatedBy: string) {
  return this.find({ initiatedBy }).sort({ createdAt: -1 });
};

DeploymentSchema.statics.findPendingDeployments = function() {
  return this.find({
    status: { $in: ['pending', 'in_progress'] }
  }).sort({ createdAt: 1 });
};

export const Deployment = mongoose.model<IDeployment>('Deployment', DeploymentSchema);