```function_spec
{
  "name": "library.reserve_book",
  "description": "Reserves a book in the library if available.",
  "parameters": {
    "type": "object",
    "properties": {
      "book_id": {
        "type": "string",
        "description": "The id of the book to reserve."
      },
      "branch_id": {
        "type": "string",
        "description": "The id of the library branch to reserve from."
      },
      "return_date": {
        "type": "string",
        "description": "The date the book is to be returned (optional).",
        "default": ""
      }
    },
    "required": ["book_id", "branch_id"]
  },
  "responses": [{
    "type": "object",
    "properties": {
      "reservation_id": {
        "type": "string",
        "description": "Unique identifier for the reservation."
      },
      "book_id": {
        "type": "string",
        "description": "The id of the reserved book."
      },
      "branch_id": {
        "type": "string",
        "description": "The id of the library branch."
      },
      "pickup_deadline": {
        "type": "string",
        "description": "The deadline date by which the book must be picked up."
      },
      "return_date": {
        "type": "string",
        "description": "The expected return date for the book."
      },
      "status": {
        "type": "string",
        "enum": ["reserved", "ready_for_pickup"],
        "description": "Current status of the reservation."
      }
    }
  }],
  "errors": [{
    "name": "BookNotAvailableException",
    "description": "Raised when the book is not available for reservation."
  }, {
    "name": "BookNotFoundException",
    "description": "Raised when the specified book_id is not found."
  }, {
    "name": "BranchNotFoundException",
    "description": "Raised when the specified branch_id is not found."
  }]
}
```

```function_spec
{
  "name": "library.search_book",
  "description": "Searches for a book in the library within the specified city.",
  "parameters": {
    "type": "object",
    "properties": {
      "book_name": {
        "type": "string",
        "description": "The name of the book to search for."
      },
      "city": {
        "type": "string",
        "description": "The city to search within."
      },
      "availability": {
        "type": "boolean",
        "description": "If true, search for available copies. If false or omitted, search for any copy regardless of availability.",
        "default": false
      },
      "genre": {
        "type": "string",
        "description": "The genre of the book to filter search (optional).",
        "default": ""
      }
    },
    "required": ["book_name", "city"]
  },
  "responses": [{
    "type": "object",
    "properties": {
      "results": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "book_id": {
              "type": "string",
              "description": "Unique identifier for the book."
            },
            "title": {
              "type": "string",
              "description": "The title of the book."
            },
            "author": {
              "type": "string",
              "description": "The author of the book."
            },
            "branch_id": {
              "type": "string",
              "description": "Unique identifier for the library branch."
            },
            "branch_name": {
              "type": "string",
              "description": "Name of the library branch."
            },
            "branch_address": {
              "type": "string",
              "description": "Address of the library branch."
            },
            "available": {
              "type": "boolean",
              "description": "Whether the book is currently available for checkout."
            },
            "due_date": {
              "type": "string",
              "description": "The date when the book is due back if currently checked out (null if available)."
            }
          }
        }
      },
      "total_results": {
        "type": "integer",
        "description": "Total number of matching results found."
      }
    }
  }],
  "errors": [{
    "name": "CityNotFoundException",
    "description": "Raised when the specified city is not found in the library system."
  }, {
    "name": "SearchException",
    "description": "Raised when the search request fails due to system issues."
  }]
}
```
