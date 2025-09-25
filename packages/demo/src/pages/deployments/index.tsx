/**
 * Deployments Page - Showcase cross-chain deployment capabilities
 */

import React, { useState, useEffect } from 'react';
import { PlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { apiClient, DeploymentResult } from '@/lib/api-client';

interface Deployment extends DeploymentResult {
  id: string;
  name: string;
  contractType: string;
  createdAt: string;
}

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newDeployment, setNewDeployment] = useState({
    name: '',
    chains: [] as string[],
    contractCode: `// Sample ERC20 Token Contract
pragma solidity ^0.8.0;

contract CrossChainToken {
    mapping(address => uint256) public balances;
    uint256 public totalSupply = 1000000;

    constructor() {
        balances[msg.sender] = totalSupply;
    }

    function transfer(address to, uint256 amount) public {
        require(balances[msg.sender] >= amount);
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }
}`,
    contractType: 'ERC20 Token'
  });

  const availableChains = [
    'ethereum',
    'polygon',
    'arbitrum',
    'optimism',
    'bsc',
    'avalanche'
  ];

  useEffect(() => {
    loadDeployments();
  }, []);

  const loadDeployments = async () => {
    try {
      setLoading(true);
      // Mock deployments data since we don't have a deployments list endpoint
      const mockDeployments: Deployment[] = [
        {
          id: 'deploy_1',
          name: 'MultiChain DeFi Protocol',
          contractType: 'DeFi Protocol',
          deploymentId: 'deploy_1701234567890',
          status: 'completed',
          chains: [
            { chain: 'ethereum', currentBlock: 18500000, networkHealth: 'healthy' },
            { chain: 'polygon', currentBlock: 49500000, networkHealth: 'healthy' },
            { chain: 'arbitrum', currentBlock: 155000000, networkHealth: 'healthy' },
          ],
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          estimatedCompletionTime: new Date(Date.now() - 3400000).toISOString(),
          coordinationLatency: 280,
          createdAt: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 'deploy_2',
          name: 'Cross-Chain NFT Collection',
          contractType: 'ERC721 NFT',
          deploymentId: 'deploy_1701234567891',
          status: 'completed',
          chains: [
            { chain: 'ethereum', currentBlock: 18500000, networkHealth: 'healthy' },
            { chain: 'optimism', currentBlock: 112000000, networkHealth: 'healthy' },
          ],
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          estimatedCompletionTime: new Date(Date.now() - 7000000).toISOString(),
          coordinationLatency: 320,
          createdAt: new Date(Date.now() - 7200000).toISOString()
        }
      ];

      setDeployments(mockDeployments);
    } catch (error) {
      console.error('Failed to load deployments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDeployment = async () => {
    if (!newDeployment.name || newDeployment.chains.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setCreating(true);

      const result = await apiClient.deployContract(
        newDeployment.chains,
        newDeployment.contractCode
      );

      // Add to deployments list
      const deployment: Deployment = {
        ...result,
        id: result.deploymentId,
        name: newDeployment.name,
        contractType: newDeployment.contractType,
        createdAt: new Date().toISOString()
      };

      setDeployments(prev => [deployment, ...prev]);
      setShowCreateModal(false);
      setNewDeployment({
        name: '',
        chains: [],
        contractCode: newDeployment.contractCode,
        contractType: 'ERC20 Token'
      });
    } catch (error: any) {
      console.error('Failed to create deployment:', error);
      alert('Failed to create deployment: ' + (error.message || 'Unknown error'));
    } finally {
      setCreating(false);
    }
  };

  const toggleChainSelection = (chain: string) => {
    setNewDeployment(prev => ({
      ...prev,
      chains: prev.chains.includes(chain)
        ? prev.chains.filter(c => c !== chain)
        : [...prev.chains, chain]
    }));
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'initiated': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="px-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cross-Chain Deployments</h1>
          <p className="mt-2 text-gray-600">Deploy smart contracts across multiple blockchain networks simultaneously</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          New Deployment
        </button>
      </div>

      {/* Deployments List */}
      <div className="space-y-6">
        {deployments.map((deployment) => (
          <div key={deployment.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{deployment.name}</h3>
                <p className="text-sm text-gray-500">{deployment.contractType}</p>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(deployment.status)}`}>
                  {deployment.status.charAt(0).toUpperCase() + deployment.status.slice(1)}
                </span>
                <span className="text-sm text-gray-500">
                  {deployment.coordinationLatency}ms coordination
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs font-medium text-gray-500">Deployment ID</p>
                <p className="text-sm text-gray-900 font-mono">
                  {deployment.deploymentId.substring(0, 20)}...
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Chains Deployed</p>
                <p className="text-sm text-gray-900">{deployment.chains.length}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Created</p>
                <p className="text-sm text-gray-900">
                  {new Date(deployment.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Coordination Latency</p>
                <p className="text-sm text-gray-900">{deployment.coordinationLatency}ms</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Deployed Chains</p>
              <div className="flex flex-wrap gap-2">
                {deployment.chains.map((chain) => (
                  <span
                    key={chain.chain}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {chain.chain}
                    <span className="ml-1 text-blue-600">
                      ({chain.currentBlock.toLocaleString()})
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}

        {deployments.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No deployments yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Create Your First Deployment
            </button>
          </div>
        )}
      </div>

      {/* Create Deployment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">New Cross-Chain Deployment</h2>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deployment Name
                  </label>
                  <input
                    type="text"
                    value={newDeployment.name}
                    onChange={(e) => setNewDeployment(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="My Cross-Chain DApp"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contract Type
                  </label>
                  <select
                    value={newDeployment.contractType}
                    onChange={(e) => setNewDeployment(prev => ({ ...prev, contractType: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option>ERC20 Token</option>
                    <option>ERC721 NFT</option>
                    <option>DeFi Protocol</option>
                    <option>Custom Contract</option>
                  </select>
                </div>

                {/* Chain Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Chains ({newDeployment.chains.length} selected)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {availableChains.map((chain) => (
                      <label key={chain} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newDeployment.chains.includes(chain)}
                          onChange={() => toggleChainSelection(chain)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 capitalize">{chain}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Contract Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Smart Contract Code
                  </label>
                  <textarea
                    value={newDeployment.contractCode}
                    onChange={(e) => setNewDeployment(prev => ({ ...prev, contractCode: e.target.value }))}
                    className="w-full h-64 border border-gray-300 rounded-md px-3 py-2 font-mono text-sm"
                    placeholder="Enter your smart contract code..."
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDeployment}
                disabled={creating || newDeployment.chains.length === 0}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating && <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />}
                {creating ? 'Deploying...' : 'Deploy Contract'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}