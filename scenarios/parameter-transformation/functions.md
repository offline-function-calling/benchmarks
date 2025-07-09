```function_spec
{
  "name": "schedule_backup",
  "description": "Schedules a recurring backup for a specified database.",
  "parameters": {
    "type": "object",
    "properties": {
      "database_name": {
        "type": "string",
        "description": "The name of the database to back up."
      },
      "schedule_cron": {
        "type": "string",
        "description": "The backup schedule in standard CRON format (e.g., '0 2 * * *' for 2 AM daily)."
      },
      "retention_days": {
        "type": "integer",
        "description": "The number of days to keep each backup."
      }
    },
    "required": ["database_name", "schedule_cron", "retention_days"]
  },
  "responses": [{
    "type": "object",
    "properties": {
      "job_id": { "type": "string" },
      "database_name": { "type": "string" },
      "status": { "type": "string", "enum": ["scheduled", "failed"] },
      "next_run_utc": { "type": "string", "format": "date-time" }
    }
  }],
  "errors": [{
    "name": "InvalidCronException",
    "description": "Raised when the provided schedule_cron string is not a valid CRON expression."
  }, {
    "name": "DatabaseNotFoundException",
    "description": "Raised when the specified database_name does not exist."
  }]
}
```
