```function_spec
{
  "name": "fetch_weather",
  "description": "Fetches the current weather for a given location using the wttr.in API.",
  "parameters": {
    "type": "object",
    "properties": {
      "place": {
        "type": "string",
        "description": "The location for which to fetch the weather. May be the name of a city, town, country or famous landmark, or an airport code."
      }
    },
    "required": ["place"]
  },
  "responses": [{
    "type": "object",
    "properties": {
      "units": {
        "type": "string",
        "enum": ["metric", "imperial"],
        "description": "The system of units used for measurements (e.g., metric, imperial)."
      },
      "condition": {
        "type": "string",
        "description": "A human-readable text description of the current weather condition."
      },
      "temperature": {
        "type": "number",
        "description": "The current temperature. The unit is specified in the 'units' field (e.g., Celsius for metric)."
      },
      "feels_like": {
        "type": "number",
        "description": "The perceived 'feels like' temperature, accounting for factors like wind and humidity."
      },
      "wind_speed": {
        "type": "number",
        "minimum": 0,
        "description": "The current wind speed. The unit depends on the 'units' field (e.g., km/h for metric, mph for imperial)."
      }
    }
  }],
  "errors": [{
    "name": "RequestException",
    "description": "Raised if the API request fails or returns an error (e.g., invalid location, network issues)."
  }]
}
```
