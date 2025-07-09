```function_spec
{
  "name": "create_deployment",
  "description": "Creates a new deployment for an application with specified resource allocations.",
  "parameters": {
    "type": "object",
    "properties": {
      "app_name": {
        "type": "string",
        "description": "The name of the application to deploy."
      },
      "version": {
        "type": "string",
        "description": "The version tag of the application to deploy (e.g., 'v2.1.0')."
      },
      "replicas": {
        "type": "integer",
        "description": "The number of instances (replicas) to run."
      },
      "memory_mb": {
        "type": "integer",
        "description": "The amount of memory in megabytes (MB) to allocate to each replica."
      }
    },
    "required": ["app_name", "version", "replicas", "memory_mb"]
  },
  "responses": [{
    "type": "object",
    "properties": {
      "deployment_id": { "type": "string" },
      "app_name": { "type": "string" },
      "status": { "type": "string", "enum": ["creating", "active", "failed"] }
    }
  }],
  "errors": [{
    "name": "InvalidVersionException",
    "description": "Raised when the specified version does not exist."
  }, {
    "name": "ResourceLimitExceededException",
    "description": "Raised when the requested resources (replicas, memory) exceed available quota."
  }]
}
```

