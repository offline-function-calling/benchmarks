```function_spec
{
  "name": "crm_get_customer",
  "description": "Retrieves customer contact and account details from the CRM system.",
  "parameters": {
    "type": "object",
    "properties": { "customer_id": { "type": "string" } },
    "required": ["customer_id"]
  },
  "responses": [{ "type": "object" }]
}
```

```function_spec
{
  "name": "billing_get_invoices",
  "description": "Retrieves a list of invoices for a customer from the billing system.",
  "parameters": {
    "type": "object",
    "properties": { "customer_id": { "type": "string" } },
    "required": ["customer_id"]
  },
  "responses": [{ "type": "array", "items": { "type": "object" } }]
}
```

```function_spec
{
  "name": "support_get_tickets",
  "description": "Retrieves a list of support tickets for a customer from the support desk system.",
  "parameters": {
    "type": "object",
    "properties": { "customer_id": { "type": "string" } },
    "required": ["customer_id"]
  },
  "responses": [{ "type": "array", "items": { "type": "object" } }]
}
```
