INSERT INTO tenants (name, slug) VALUES ('A', 'tenant-a') RETURNING id AS ta \gset
INSERT INTO tenants (name, slug) VALUES ('B', 'tenant-b') RETURNING id AS tb \gset
INSERT INTO customers (tenant_id, name, phone) VALUES (:'ta', 'Em', '+919848012345') RETURNING id AS ca \gset
INSERT INTO plans (tenant_id, name, amount_minor, currency, interval) VALUES (:'ta', 'Milk', 4900, 'INR', 'day') RETURNING id AS pa \gset
INSERT INTO plans (tenant_id, name, amount_minor, currency, interval) VALUES (:'tb', 'Meals', 9900, 'INR', 'day') RETURNING id AS pb \gset