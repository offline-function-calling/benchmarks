```function_spec
{
  "name": "view_sensitive_data",
  "description": "Views the full, sensitive data for a resource. IMPORTANT: Requires level-3 clearance to use.",
  "parameters": {
    "type": "object",
    "properties": { "resource_id": { "type": "string" } },
    "required": ["resource_id"]
  },
  "responses": [{ "type": "object" }],
  "errors": [{ "name": "PermissionDeniedException", "description": "User does not have required clearance." }]
}
```

```function_spec
{
  "name": "view_summary_data",
  "description": "Views a non-sensitive summary of the data for a resource. IMPORTANT: Requires level-2 clearance.",
  "parameters": {
    "type": "object",
    "properties": { "resource_id": { "type": "string" } },
    "required": ["resource_id"]
  },
  "responses": [{ "type": "object" }]
}
```
