```function_spec
{
  "name": "search_products",
  "description": "Searches for products based on a query and various filters like category, price, brand, and rating.",
  "parameters": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "The search term for the product." },
      "category": { "type": "string", "description": "The product category to filter by (optional)." },
      "price_range": { "type": "array", "items": { "type": "number" }, "description": "A tuple or list with two numbers for min and max price (optional)." },
      "brand": { "type": "string", "description": "The product brand to filter by (optional)." },
      "rating_min": { "type": "number", "description": "The minimum customer rating to filter by (e.g., 4.0) (optional)." }
    },
    "required": ["query"]
  },
  "responses": [{ "type": "array", "items": { "type": "object" } }]
}
```

```function_spec
{
  "name": "filter_products",
  "description": "Applies additional filters to an existing list of product IDs.",
  "parameters": {
    "type": "object",
    "properties": {
      "product_ids": { "type": "array", "items": { "type": "string" }, "description": "A list of product IDs to filter." },
      "filters": { "type": "object", "description": "A dictionary of filters to apply (e.g., {'color': 'blue'})." }
    },
    "required": ["product_ids", "filters"]
  },
  "responses": [{ "type": "array", "items": { "type": "object" } }]
}
```

```function_spec
{
  "name": "get_product_recommendations",
  "description": "Gets personalized product recommendations for a specific user.",
  "parameters": {
    "type": "object",
    "properties": {
      "user_id": { "type": "string", "description": "The ID of the user for whom to get recommendations." },
      "category": { "type": "string", "description": "The product category for recommendations (optional)." },
      "price_max": { "type": "number", "description": "The maximum price for recommended products (optional)." }
    },
    "required": ["user_id"]
  },
  "responses": [{ "type": "array", "items": { "type": "object" } }]
}
```

```function_spec
{
  "name": "get_similar_products",
  "description": "Finds products that are similar to a given product.",
  "parameters": {
    "type": "object",
    "properties": {
      "product_id": { "type": "string", "description": "The ID of the product to find similar items for." },
      "similarity_threshold": { "type": "number", "default": 0.7, "description": "The minimum similarity score (0.0 to 1.0)." }
    },
    "required": ["product_id"]
  },
  "responses": [{ "type": "array", "items": { "type": "object" } }]
}
```
