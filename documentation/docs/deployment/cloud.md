# Cloud Provider Deployment

Deploy Switchboard to major cloud providers.

## AWS Deployment

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           AWS VPC                               │
│  ┌─────────────┐    ┌─────────────────────────────────────────┐ │
│  │     ALB     │───▶│            ECS Cluster                  │ │
│  │  (Public)   │    │  ┌───────────┐    ┌───────────┐        │ │
│  └─────────────┘    │  │Customer   │    │  Core     │        │ │
│                     │  │API (x3)   │───▶│Engine (x2)│        │ │
│                     │  └───────────┘    └───────────┘        │ │
│                     └─────────────────────────────────────────┘ │
│                                   │                             │
│  ┌────────────────────────────────┼────────────────────────┐   │
│  │              │                 │                │       │   │
│  │   ┌──────────▼───┐    ┌───────▼────┐   ┌───────▼────┐  │   │
│  │   │ DocumentDB   │    │ElastiCache │   │ ClickHouse │  │   │
│  │   │  (MongoDB)   │    │  (Redis)   │   │   (EC2)    │  │   │
│  │   └──────────────┘    └────────────┘   └────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### ECS Task Definition

```json
{
  "family": "switchboard-customer-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "customer-api",
      "image": "switchboard/customer-api:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "MONGODB_URL",
          "valueFrom": "arn:aws:secretsmanager:..."
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:..."
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/switchboard",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "customer-api"
        }
      }
    }
  ]
}
```

### Terraform Example

```hcl
# main.tf
module "switchboard" {
  source = "./modules/switchboard"

  environment     = "production"
  vpc_id          = module.vpc.vpc_id
  private_subnets = module.vpc.private_subnets
  public_subnets  = module.vpc.public_subnets

  customer_api_count = 3
  core_engine_count  = 2

  mongodb_instance_class = "db.r6g.large"
  redis_node_type        = "cache.r6g.large"
}
```

## GCP Deployment

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         GCP Project                             │
│  ┌─────────────┐    ┌─────────────────────────────────────────┐ │
│  │Cloud Load   │───▶│           Cloud Run                     │ │
│  │Balancer     │    │  ┌───────────┐    ┌───────────┐        │ │
│  └─────────────┘    │  │Customer   │    │  Core     │        │ │
│                     │  │API        │───▶│Engine     │        │ │
│                     │  └───────────┘    └───────────┘        │ │
│                     └─────────────────────────────────────────┘ │
│                                   │                             │
│  ┌────────────────────────────────┼────────────────────────┐   │
│  │   ┌────────────────┐    ┌──────▼─────┐   ┌───────────┐  │   │
│  │   │ Cloud MongoDB  │    │ Memorystore│   │ ClickHouse│  │   │
│  │   │    Atlas       │    │   (Redis)  │   │   (GCE)   │  │   │
│  │   └────────────────┘    └────────────┘   └───────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Cloud Run Service

```yaml
# customer-api.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: customer-api
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "2"
        autoscaling.knative.dev/maxScale: "10"
    spec:
      containers:
        - image: gcr.io/project/switchboard-customer-api
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: production
          resources:
            limits:
              cpu: "2"
              memory: 2Gi
```

### Deploy Command

```bash
gcloud run deploy customer-api \
  --image gcr.io/project/switchboard-customer-api \
  --platform managed \
  --region us-central1 \
  --min-instances 2 \
  --max-instances 10 \
  --memory 2Gi \
  --set-env-vars NODE_ENV=production
```

## Azure Deployment

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Azure Resource Group                       │
│  ┌─────────────┐    ┌─────────────────────────────────────────┐ │
│  │ Application │───▶│        Container Apps                   │ │
│  │  Gateway    │    │  ┌───────────┐    ┌───────────┐        │ │
│  └─────────────┘    │  │Customer   │    │  Core     │        │ │
│                     │  │API        │───▶│Engine     │        │ │
│                     │  └───────────┘    └───────────┘        │ │
│                     └─────────────────────────────────────────┘ │
│                                   │                             │
│  ┌────────────────────────────────┼────────────────────────┐   │
│  │   ┌────────────────┐    ┌──────▼─────┐   ┌───────────┐  │   │
│  │   │ Cosmos DB      │    │Azure Cache │   │ ClickHouse│  │   │
│  │   │(MongoDB API)   │    │for Redis   │   │   (VM)    │  │   │
│  │   └────────────────┘    └────────────┘   └───────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Azure Container Apps

```bash
# Create Container App
az containerapp create \
  --name customer-api \
  --resource-group switchboard-rg \
  --environment switchboard-env \
  --image switchboard.azurecr.io/customer-api:latest \
  --target-port 3000 \
  --ingress external \
  --min-replicas 2 \
  --max-replicas 10 \
  --cpu 1 \
  --memory 2Gi
```

### Bicep Template

```bicep
resource customerApi 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'customer-api'
  location: location
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
      }
    }
    template: {
      containers: [
        {
          name: 'customer-api'
          image: 'switchboard.azurecr.io/customer-api:latest'
          resources: {
            cpu: json('1')
            memory: '2Gi'
          }
        }
      ]
      scale: {
        minReplicas: 2
        maxReplicas: 10
      }
    }
  }
}
```

## Kubernetes Deployment

### Helm Chart

```bash
# Add Switchboard Helm repo
helm repo add switchboard https://charts.switchboard.dev

# Install
helm install switchboard switchboard/switchboard \
  --namespace switchboard \
  --create-namespace \
  --set customerApi.replicas=3 \
  --set coreEngine.replicas=2 \
  --set mongodb.enabled=true
```

### Values Override

```yaml
# values.yaml
customerApi:
  replicas: 3
  resources:
    limits:
      cpu: 2000m
      memory: 2Gi
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 10

coreEngine:
  replicas: 2
  resources:
    limits:
      cpu: 4000m
      memory: 4Gi

mongodb:
  enabled: true
  architecture: replicaset
  replicaCount: 3

redis:
  enabled: true
  architecture: replication

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: api.switchboard.dev
      paths:
        - path: /
          pathType: Prefix
```

## Cost Optimization

### Recommendations

| Provider | Service | Optimization |
|----------|---------|--------------|
| AWS | ECS | Use Spot instances for non-critical workloads |
| AWS | RDS | Use Reserved Instances for predictable load |
| GCP | Cloud Run | Scale to zero for dev environments |
| Azure | Container Apps | Use consumption plan for variable load |

### Estimated Monthly Costs

| Component | Small | Medium | Large |
|-----------|-------|--------|-------|
| Compute | $100 | $500 | $2,000 |
| Database | $100 | $300 | $1,000 |
| Cache | $50 | $150 | $500 |
| Storage | $20 | $50 | $200 |
| **Total** | **$270** | **$1,000** | **$3,700** |

## Next Steps

- [Configuration Reference](../configuration/index.md) - All configuration options
- [Monitoring](production.md#monitoring) - Set up monitoring
- [Security](production.md#security-hardening) - Security best practices
