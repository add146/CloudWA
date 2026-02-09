UPDATE flows SET flow_json = REPLACE(flow_json, '"provider":"workers_ai"', '"provider":"openai"') WHERE name = 'New Flow';
