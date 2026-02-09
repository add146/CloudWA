UPDATE flows SET flow_json = REPLACE(flow_json, '"provider":"provider-workers-ai"', '"provider":"workers_ai"') WHERE name = 'New Flow';
