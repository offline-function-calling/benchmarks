```function_spec
{
  "name": "get_user_from_cache",
  "description": "Attempts to quickly retrieve user details from the in-memory cache.",
  "parameters": {
    "type": "object",
    "properties": { "user_id": { "type": "string" } },
    "required": ["user_id"]
  },
  "responses": [{ "type": "object" }],
  "errors": [{ "name": "NotFoundException", "description": "User not found in cache." }]
}
```

```function_spec
{
  "name": "get_user_from_database",
  "description": "Retrieves user details from the primary user database.",
  "parameters": {
    "type": "object",
    "properties": { "user_id": { "type": "string" } },
    "required": ["user_id"]
  },
  "responses": [{ "type": "object" }],
  "errors": [{ "name": "ConnectionException", "description": "Failed to connect to the database." }]
}
```

```function_spec
{
  "name": "get_user_from_ldap",
  "description": "Retrieves user details from the corporate LDAP directory using a username.",
  "parameters": {
    "type": "object",
    "properties": { "username": { "type": "string" } },
    "required": ["username"]
  },
  "responses": [{ "type": "object" }],
  "errors": [{ "name": "UserNotFoundException", "description": "User not found in LDAP." }]
}
```
