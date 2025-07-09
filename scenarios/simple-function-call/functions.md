```function_spec
{
  "name": "get_pr_details",
  "description": "Gets the details and status of a specific pull request in a software repository.",
  "parameters": {
    "type": "object",
    "properties": {
      "repo": {
        "type": "string",
        "description": "The name of the repository (e.g., 'frontend', 'backend-service')."
      },
      "pr_number": {
        "type": "integer",
        "description": "The pull request number."
      }
    },
    "required": ["repo", "pr_number"]
  },
  "responses": [{
    "type": "object",
    "properties": {
      "pr_number": { "type": "integer" },
      "repo": { "type": "string" },
      "title": { "type": "string" },
      "author": { "type": "string" },
      "status": { "type": "string", "enum": ["open", "closed", "merged"] },
      "mergeable": { "type": "boolean" }
    }
  }],
  "errors": [{
    "name": "RepoNotFoundException",
    "description": "Raised when the specified repository is not found."
  }, {
    "name": "PRNotFoundException",
    "description": "Raised when the specified pull request number is not found in the repository."
  }]
}
