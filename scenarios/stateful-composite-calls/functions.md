```function_spec
{
  "name": "get_document_status",
  "description": "Retrieves the current status of a document in the workflow.",
  "parameters": {
    "type": "object",
    "properties": { "doc_id": { "type": "string", "description": "The unique ID of the document." } },
    "required": ["doc_id"]
  },
  "responses": [{
    "type": "object",
    "properties": {
      "doc_id": { "type": "string" },
      "status": { "type": "string", "enum": ["draft", "in_review", "approved", "rejected"] }
    }
  }]
}
```

```function_spec
{
  "name": "submit_for_review",
  "description": "Submits a document from 'draft' status to 'in_review'.",
  "parameters": {
    "type": "object",
    "properties": {
      "doc_id": { "type": "string", "description": "The ID of the document to submit." },
      "reviewer_id": { "type": "string", "description": "The ID of the user assigned to review." }
    },
    "required": ["doc_id", "reviewer_id"]
  },
  "responses": [{ "type": "object", "properties": { "status": { "type": "string" } } }]
}
```

```function_spec
{
  "name": "approve_document",
  "description": "Approves a document that is 'in_review'.",
  "parameters": {
    "type": "object",
    "properties": {
      "doc_id": { "type": "string", "description": "The ID of the document to approve." },
      "approver_id": { "type": "string", "description": "The ID of the user approving the document." }
    },
    "required": ["doc_id", "approver_id"]
  },
  "responses": [{ "type": "object", "properties": { "status": { "type": "string" } } }]
}
```

