```function_spec
{
  "name": "list_calendar_events",
  "description": "Lists events from the user's calendar within a specified date range.",
  "parameters": {
    "type": "object",
    "properties": {
      "start_date": { "type": "string", "format": "date" },
      "end_date": { "type": "string", "format": "date" }
    },
    "required": ["start_date", "end_date"]
  },
  "responses": [{
    "type": "array",
    "items": { "type": "object" }
  }]
}
```

```function_spec
{
  "name": "send_email",
  "description": "Sends an email to a specified recipient with a given subject and body.",
  "parameters": {
    "type": "object",
    "properties": {
      "recipient_email": {
        "type": "string",
        "description": "The email address of the recipient."
      },
      "subject": {
        "type": "string",
        "description": "The subject line of the email."
      },
      "body": {
        "type": "string",
        "description": "The main content (body) of the email."
      }
    },
    "required": ["recipient_email", "subject", "body"]
  },
  "responses": [{
    "type": "object",
    "properties": {
      "message_id": { "type": "string" },
      "status": { "type": "string", "enum": ["sent", "queued"] }
    }
  }],
  "errors": [{
    "name": "InvalidEmailException",
    "description": "Raised when the recipient email address is invalid."
  }]
}
```
